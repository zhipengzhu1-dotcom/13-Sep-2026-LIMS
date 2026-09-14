import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Laboratory } from '../src/laboratory/laboratory.ts';
import type { User } from '../src/accounts/accounts.ts';
import { MAX_ATTACHMENT_BYTES } from '../src/laboratory/attachment-contracts.ts';
import { HttpError } from './http-error.ts';

/**
 * The most of a refused upload that is read and discarded before the refusal
 * is sent. Replying while the client is still sending and then closing resets
 * the connection under the client's unfinished write, and the client may see
 * that reset instead of the refusal. Past this the connection is dropped.
 */
const DISCARD_LIMIT = 4 * MAX_ATTACHMENT_BYTES;

/**
 * `POST /api/attachments?filename=<name>` with the raw file as the body and
 * its own content type, separate from the 32 KB JSON command route.
 * `GET /api/attachments/<id>` returns the stored bytes.
 */
export async function handleAttachments(
  lab: Laboratory,
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  currentUser: () => User,
) {
  const id = url.pathname.match(/^\/api\/attachments\/([^/]+)$/)?.[1];
  if (req.method === 'GET' && id) {
    currentUser();
    return sendAttachment(res, lab, decodeURIComponent(id));
  }
  if (req.method !== 'POST' || url.pathname !== '/api/attachments')
    throw new HttpError(404, 'Not found');

  let user: User;
  try {
    if (
      req.headers.origin &&
      req.headers.origin !== `http://${req.headers.host}`
    )
      throw new HttpError(403, 'Cross-origin writes are not allowed.');
    user = currentUser();
    if (Number(req.headers['content-length']) > MAX_ATTACHMENT_BYTES)
      throw new HttpError(413, 'Attachments are limited to 10 MB.');
  } catch (error) {
    // Refused before the body is read: it is read to its end and discarded
    // first, so the refusal is what the client receives.
    res.setHeader('Connection', 'close');
    await readBody(req, 0).catch(() => undefined);
    throw error;
  }
  const content = await readBody(req, MAX_ATTACHMENT_BYTES).catch((error) => {
    res.setHeader('Connection', 'close');
    throw error;
  });
  const attachment = lab.storeAttachment(
    {
      filename: url.searchParams.get('filename') ?? '',
      contentType: req.headers['content-type'] ?? '',
      content,
    },
    user.id,
  );
  res.writeHead(201, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify({ attachment }));
}

/**
 * The whole body, refused with 413 when it passes `limit` bytes. A body over
 * the limit is still read to its end, without being kept, so the refusal
 * reaches the client; one past `DISCARD_LIMIT` is cut off.
 */
function readBody(req: IncomingMessage, limit: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const tooLarge = () =>
      new HttpError(413, 'Attachments are limited to 10 MB.');
    req.on('data', (chunk: Buffer) => {
      size += chunk.byteLength;
      if (size <= limit) chunks.push(chunk);
      else if (size > DISCARD_LIMIT) {
        req.destroy();
        reject(tooLarge());
      }
    });
    req.on('end', () =>
      size > limit ? reject(tooLarge()) : resolve(Buffer.concat(chunks)),
    );
    req.on('error', reject);
    req.on('close', () => {
      if (!req.complete) reject(new HttpError(400, 'The upload was cut off.'));
    });
    if (req.readableEnded) resolve(new Uint8Array(0));
  });
}

function sendAttachment(res: ServerResponse, lab: Laboratory, id: string) {
  const stored = lab.readAttachment(id);
  if (!stored) throw new HttpError(404, 'Attachment not found.');
  const { attachment, content } = stored;
  const fallback = attachment.filename.replace(/[^\w.\- ]/g, '_');
  res.writeHead(200, {
    'Content-Type': attachment.contentType,
    'Content-Length': String(content.byteLength),
    'Content-Disposition': `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
    'Repr-Digest': `sha-256=:${Buffer.from(attachment.sha256, 'hex').toString('base64')}:`,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': 'sandbox',
    'Cache-Control': 'no-store',
  });
  res.end(content);
}
