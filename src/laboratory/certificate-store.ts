import type { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import type {
  Certificate,
  CertificateContent,
  CertificateSummary,
  Publication,
} from './certificate.ts';
import type { RecordCertificate } from './record-copy.ts';

/**
 * Locked Certificate of Analysis versions and their publications. Both are
 * append-only, and the database refuses updates and deletes as a second line
 * of defence. Writes land in the calling command's transaction and keep its
 * key.
 */
export class CertificateStore {
  constructor(private db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS certificates (sampleId TEXT NOT NULL, version INTEGER NOT NULL, approvedAt TEXT NOT NULL, sha256 TEXT NOT NULL, content TEXT NOT NULL, commandId BLOB NOT NULL, PRIMARY KEY (sampleId, version)) WITHOUT ROWID;
      CREATE TRIGGER IF NOT EXISTS certificatesNoUpdate BEFORE UPDATE ON certificates BEGIN SELECT RAISE(ABORT, 'Certificates of Analysis are locked.'); END;
      CREATE TRIGGER IF NOT EXISTS certificatesNoDelete BEFORE DELETE ON certificates BEGIN SELECT RAISE(ABORT, 'Certificates of Analysis are locked.'); END;
      CREATE TRIGGER IF NOT EXISTS certificatesNoReplace BEFORE INSERT ON certificates
        WHEN EXISTS (SELECT 1 FROM certificates WHERE sampleId = NEW.sampleId AND version = NEW.version)
        BEGIN SELECT RAISE(ABORT, 'Certificates of Analysis are locked.'); END;
      CREATE TABLE IF NOT EXISTS publications (sampleId TEXT NOT NULL, version INTEGER NOT NULL, recipients TEXT NOT NULL, channel TEXT NOT NULL, channelDetail TEXT NOT NULL, publishedAt TEXT NOT NULL, publishedBy TEXT NOT NULL, recordedAt TEXT NOT NULL, commandId BLOB NOT NULL, PRIMARY KEY (sampleId, version), FOREIGN KEY (sampleId, version) REFERENCES certificates (sampleId, version)) WITHOUT ROWID;
      CREATE TRIGGER IF NOT EXISTS publicationsNoUpdate BEFORE UPDATE ON publications BEGIN SELECT RAISE(ABORT, 'Publications are append-only.'); END;
      CREATE TRIGGER IF NOT EXISTS publicationsNoDelete BEFORE DELETE ON publications BEGIN SELECT RAISE(ABORT, 'Publications are append-only.'); END;
      CREATE TRIGGER IF NOT EXISTS publicationsNoReplace BEFORE INSERT ON publications
        WHEN EXISTS (SELECT 1 FROM publications WHERE sampleId = NEW.sampleId AND version = NEW.version)
        BEGIN SELECT RAISE(ABORT, 'Publications are append-only.'); END;`);
  }

  /** Certificate versions without their content, by Sample then version:
   * lab-wide or for one Sample. */
  summaries(sampleId?: string): CertificateSummary[] {
    return this.rows(sampleId, false);
  }

  /** Every version of one Sample, oldest first, with its locked content. */
  certificates(sampleId: string): Certificate[] {
    return this.rows(sampleId, true).map(({ content, ...summary }) => ({
      ...summary,
      content: JSON.parse(content!),
    }));
  }

  /** Every version of one Sample, oldest first, its content as the stored
   * text with whether that text still matches its SHA-256. For a Record
   * copy, so the hash can be recomputed from the copy alone. */
  stored(sampleId: string): RecordCertificate[] {
    return this.rows(sampleId, true).map(({ content, ...summary }) => ({
      ...summary,
      content: content!,
      verified:
        createHash('sha256').update(content!).digest('hex') === summary.sha256,
    }));
  }

  /** Locks a new version, with the SHA-256 of the content as stored. */
  issue(content: CertificateContent, commandId: Uint8Array): Certificate {
    const document = JSON.stringify(content);
    const certificate: Certificate = {
      sampleId: content.sampleId,
      version: content.version,
      approvedAt: content.approvedAt,
      sha256: createHash('sha256').update(document).digest('hex'),
      content: JSON.parse(document),
      publication: null,
      supersededBy: null,
    };
    this.db
      .prepare(
        'INSERT INTO certificates (sampleId, version, approvedAt, sha256, content, commandId) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        certificate.sampleId,
        certificate.version,
        certificate.approvedAt,
        certificate.sha256,
        document,
        commandId,
      );
    return certificate;
  }

  recordPublication(p: Publication, commandId: Uint8Array) {
    this.db
      .prepare(
        'INSERT INTO publications (sampleId, version, recipients, channel, channelDetail, publishedAt, publishedBy, recordedAt, commandId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        p.sampleId,
        p.version,
        JSON.stringify(p.recipients),
        p.channel,
        p.channelDetail,
        p.publishedAt,
        p.publishedBy,
        p.recordedAt,
        commandId,
      );
  }

  /** Certificate versions with their publication, by Sample then version:
   * lab-wide or for one Sample, with or without the locked content. */
  private rows(
    sampleId: string | undefined,
    withContent: boolean,
  ): (CertificateSummary & { content?: string })[] {
    const query = `SELECT c.sampleId, c.version, c.approvedAt, c.sha256${withContent ? ', c.content' : ''},
        p.recipients, p.channel, p.channelDetail, p.publishedAt, p.publishedBy, p.recordedAt
      FROM certificates c LEFT JOIN publications p ON p.sampleId = c.sampleId AND p.version = c.version
      ${sampleId === undefined ? '' : 'WHERE c.sampleId = ?'} ORDER BY c.sampleId, c.version`;
    const rows = (
      sampleId === undefined
        ? this.db.prepare(query).all()
        : this.db.prepare(query).all(sampleId)
    ) as (Omit<CertificateSummary, 'publication'> &
      Omit<
        Publication,
        'sampleId' | 'version' | 'recipients' | 'publishedAt'
      > & {
        content?: string;
        recipients: string | null;
        publishedAt: string | null;
      })[];
    // A version is superseded once a later version of its Sample is
    // Published; rows come by Sample, then version.
    const published = rows.filter((row) => row.publishedAt !== null);
    return rows.map((row) => {
      const version = Number(row.version);
      const later = published.find(
        (p) => p.sampleId === row.sampleId && Number(p.version) > version,
      );
      return {
        sampleId: row.sampleId,
        version,
        approvedAt: row.approvedAt,
        sha256: row.sha256,
        ...(withContent ? { content: row.content } : {}),
        supersededBy: later ? Number(later.version) : null,
        publication:
          row.publishedAt === null
            ? null
            : {
                sampleId: row.sampleId,
                version,
                recipients: JSON.parse(row.recipients!),
                channel: row.channel,
                channelDetail: row.channelDetail,
                publishedAt: row.publishedAt,
                publishedBy: row.publishedBy,
                recordedAt: row.recordedAt,
              },
      };
    });
  }
}
