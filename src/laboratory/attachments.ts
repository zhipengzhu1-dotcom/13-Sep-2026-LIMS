import type { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import {
  MAX_ATTACHMENT_BYTES,
  attachmentContentType,
  type Attachment,
} from './attachment-contracts.ts';

/** A file as it arrived, before it is accepted. */
export type Upload = {
  filename: string;
  /** As declared by the uploader; must match the extension. */
  contentType: string;
  content: Uint8Array;
};

/** Signatures of the binary formats, so a renamed file is not accepted. */
const signatures: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46, 0x2d],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    0x50, 0x4b, 0x03, 0x04,
  ],
  'application/vnd.ms-excel': [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
};

/** Why a file was refused, with the HTTP status the transport should use. */
export class AttachmentRejected extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export const sha256 = (content: Uint8Array) =>
  createHash('sha256').update(content).digest('hex');

/**
 * Worksheet attachments: stored once, with their SHA-256, and never updated or
 * deleted. The database enforces that with triggers, so no later code path can
 * swap the bytes a Result was approved against.
 */
export class AttachmentStore {
  constructor(private db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS attachments (id TEXT PRIMARY KEY, filename TEXT NOT NULL, contentType TEXT NOT NULL, size INTEGER NOT NULL, sha256 TEXT NOT NULL, uploadedBy TEXT NOT NULL, uploadedAt TEXT NOT NULL, content BLOB NOT NULL);
      CREATE TRIGGER IF NOT EXISTS attachments_immutable BEFORE UPDATE ON attachments BEGIN SELECT RAISE(ABORT, 'Attachments cannot be changed.'); END;
      CREATE TRIGGER IF NOT EXISTS attachments_permanent BEFORE DELETE ON attachments BEGIN SELECT RAISE(ABORT, 'Attachments cannot be deleted.'); END;`);
  }

  /** Validates and stores a file as a new attachment. */
  store(upload: Upload, uploadedBy: string, uploadedAt: string): Attachment {
    const filename = upload.filename
      .split(/[\\/]/)
      .pop()!
      .replace(/[\u0000-\u001f\u007f"]/g, '')
      .trim();
    if (!filename || filename.length > 200)
      throw new AttachmentRejected(
        'Give the file a name of up to 200 characters.',
        400,
      );
    const contentType = attachmentContentType(filename);
    if (!contentType)
      throw new AttachmentRejected(
        'Attach a PDF, XLSX, XLS, CSV, PNG or JPEG file.',
        415,
      );
    const declared = upload.contentType.split(';')[0].trim().toLowerCase();
    if (declared !== contentType)
      throw new AttachmentRejected(
        `A ${filename.slice(filename.lastIndexOf('.'))} file must be sent as ${contentType}.`,
        415,
      );
    const { content } = upload;
    if (content.byteLength === 0)
      throw new AttachmentRejected('The file is empty.', 400);
    if (content.byteLength > MAX_ATTACHMENT_BYTES)
      throw new AttachmentRejected('Attachments are limited to 10 MB.', 413);
    const signature = signatures[contentType];
    if (
      signature
        ? signature.some((byte, i) => content[i] !== byte)
        : content.includes(0)
    )
      throw new AttachmentRejected(
        `The contents of ${filename} do not match its file type.`,
        415,
      );
    const attachment: Attachment = {
      id: randomUUID(),
      filename,
      contentType,
      size: content.byteLength,
      sha256: sha256(content),
      uploadedBy,
      uploadedAt,
    };
    this.db
      .prepare(
        'INSERT INTO attachments (id, filename, contentType, size, sha256, uploadedBy, uploadedAt, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        attachment.id,
        attachment.filename,
        attachment.contentType,
        attachment.size,
        attachment.sha256,
        attachment.uploadedBy,
        attachment.uploadedAt,
        content,
      );
    return attachment;
  }

  /** An attachment's record, without its bytes. */
  find(id: string): Attachment | null {
    const row = this.db
      .prepare(
        'SELECT id, filename, contentType, size, sha256, uploadedBy, uploadedAt FROM attachments WHERE id=?',
      )
      .get(id) as Attachment | undefined;
    return row ? { ...row, size: Number(row.size) } : null;
  }

  /** Every attachment's record, oldest first. */
  list(): Attachment[] {
    return (
      this.db
        .prepare(
          'SELECT id, filename, contentType, size, sha256, uploadedBy, uploadedAt FROM attachments ORDER BY uploadedAt, id',
        )
        .all() as Attachment[]
    ).map((row) => ({ ...row, size: Number(row.size) }));
  }

  /** The record and bytes. The bytes are re-hashed on every read, so a
   * damaged file is reported rather than served as the approved worksheet. */
  read(id: string): { attachment: Attachment; content: Uint8Array } | null {
    const attachment = this.find(id);
    if (!attachment) return null;
    const { content } = this.db
      .prepare('SELECT content FROM attachments WHERE id=?')
      .get(id) as { content: Uint8Array };
    if (sha256(content) !== attachment.sha256)
      throw new Error(`Attachment ${id} no longer matches its SHA-256.`);
    return { attachment, content };
  }
}
