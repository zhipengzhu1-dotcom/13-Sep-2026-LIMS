import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  WorkflowError,
  type Laboratory,
} from '../src/laboratory/laboratory.ts';

export function api(lab: Laboratory) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const send = (status: number, data: unknown) => {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify(data));
    };
    try {
      if (req.url === '/api/workspace' && req.method === 'GET')
        return send(200, lab.snapshot());
      if (req.url !== '/api/commands' || req.method !== 'POST')
        return send(404, { error: 'Not found' });
      if (
        req.headers.origin &&
        req.headers.origin !== `http://${req.headers.host}`
      )
        return send(403, { error: 'Cross-origin writes are not allowed.' });
      if (!req.headers['content-type']?.startsWith('application/json'))
        return send(415, { error: 'Use application/json.' });
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 32768)
          return send(413, { error: 'Request too large.' });
      }
      let input: unknown;
      try {
        input = JSON.parse(body);
      } catch {
        return send(400, { error: 'Invalid JSON.' });
      }
      const actor = req.headers['x-demo-actor'];
      if (typeof actor !== 'string')
        return send(403, { error: 'Choose a demo user.' });
      // The outcome carries whether this applied or replayed; the client must
      // be able to tell an "already recorded" from a fresh save.
      send(200, lab.execute(input, actor));
    } catch (error) {
      if (error instanceof WorkflowError)
        return send(error.status, { error: error.message });
      console.error(error);
      send(500, {
        error:
          'The workspace could not save this change. Your input has been preserved.',
      });
    }
  };
}
