/**
 * Worksheet attachments as the workspace sees them. Browser-safe: the storage
 * and hashing live in attachments.ts, server side.
 */

/** The largest worksheet a Result may carry. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** The accepted worksheet formats, each by extension and its one content type. */
export const attachmentTypes = [
  { extension: '.pdf', contentType: 'application/pdf' },
  {
    extension: '.xlsx',
    contentType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  { extension: '.xls', contentType: 'application/vnd.ms-excel' },
  { extension: '.csv', contentType: 'text/csv' },
  { extension: '.png', contentType: 'image/png' },
  { extension: '.jpg', contentType: 'image/jpeg' },
  { extension: '.jpeg', contentType: 'image/jpeg' },
] as const;

/** For a file input's `accept` attribute. */
export const attachmentAccept = attachmentTypes
  .map((t) => t.extension)
  .join(',');

/** The content type a filename's extension stands for, if it is accepted. */
export function attachmentContentType(filename: string): string | undefined {
  const name = filename.toLowerCase();
  return attachmentTypes.find((t) => name.endsWith(t.extension))?.contentType;
}

/** A stored, immutable attachment. The bytes are fetched separately. */
export type Attachment = {
  id: string;
  filename: string;
  contentType: string;
  /** In bytes. */
  size: number;
  /** Lowercase hex SHA-256 of the stored bytes. */
  sha256: string;
  uploadedBy: string;
  uploadedAt: string;
};
