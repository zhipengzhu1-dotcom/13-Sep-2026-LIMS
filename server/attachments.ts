import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Laboratory } from '../src/laboratory/laboratory.ts';
import type { User } from '../src/accounts/accounts.ts';
import { MAX_ATTACHMENT_BYTES } from '../src/laboratory/attachment-contracts.ts';
import { HttpError } from './http-error.ts';

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

  // Refusals before the body is read close the connection, so an unread
  // upload is not left on a kept-alive socket.
  res.setHeader('Connection', 'close');
  if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)
    throw new HttpError(403, 'Cross-origin writes are not allowed.');
  const user = currentUser();
  if (Number(req.headers['content-length']) > MAX_ATTACHMENT_BYTES)
    throw new HttpError(413, 'Attachments are limited to 10 MB.');
  const content = await readBody(req);
  res.removeHeader('Connection');
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

async function readBody(req: IncomingMessage): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.byteLength;
    if (size > MAX_ATTACHMENT_BYTES)
      throw new HttpError(413, 'Attachments are limited to 10 MB.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
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
