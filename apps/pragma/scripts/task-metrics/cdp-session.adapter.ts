import { z } from 'zod';

const pageTargetListSchema = z.array(
  z.object({ type: z.string(), webSocketDebuggerUrl: z.string().optional() }),
);

const protocolReplySchema = z.object({
  id: z.number().optional(),
  result: z.unknown().optional(),
  error: z.unknown().optional(),
});

const evaluationReplySchema = z.object({
  result: z.object({ value: z.unknown().optional() }).optional(),
  exceptionDetails: z
    .object({
      text: z.string().optional(),
      exception: z.object({ description: z.string().optional() }).optional(),
    })
    .optional(),
});

interface PendingCall {
  readonly resolve: (result: unknown) => void;
  readonly reject: (error: Error) => void;
}

export interface CdpSession {
  readonly send: (method: string, parameters?: Record<string, unknown>) => Promise<unknown>;
  readonly evaluate: (functionSource: string, argument?: unknown) => Promise<unknown>;
  readonly close: () => void;
}

async function findPageSocketUrl(port: number): Promise<string> {
  const response = await fetch(`http://127.0.0.1:${String(port)}/json/list`);
  const parsed: unknown = await response.json();
  const page = pageTargetListSchema.parse(parsed).find((target) => target.type === 'page');
  if (page?.webSocketDebuggerUrl === undefined) {
    throw new Error(`no page target on DevTools port ${String(port)}`);
  }
  return page.webSocketDebuggerUrl;
}

async function openSocket(url: string): Promise<WebSocket> {
  const socket = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => {
      resolve();
    });
    socket.addEventListener('error', () => {
      reject(new Error(`could not open ${url}`));
    });
  });
  return socket;
}

function settleReply(pending: Map<number, PendingCall>, raw: unknown): void {
  const parsedJson: unknown = JSON.parse(String(raw));
  const reply = protocolReplySchema.parse(parsedJson);
  if (reply.id === undefined) return;
  const call = pending.get(reply.id);
  if (call === undefined) return;
  pending.delete(reply.id);
  if (reply.error === undefined) call.resolve(reply.result);
  else call.reject(new Error(JSON.stringify(reply.error)));
}

// @FollowsBlueprint adapter-external-service
export async function connectCdpSession(port: number): Promise<CdpSession> {
  const socket = await openSocket(await findPageSocketUrl(port));
  const pending = new Map<number, PendingCall>();
  let lastCallId = 0;
  socket.addEventListener('message', (message) => {
    settleReply(pending, message.data);
  });
  const send = (method: string, parameters: Record<string, unknown> = {}): Promise<unknown> => {
    lastCallId += 1;
    const id = lastCallId;
    socket.send(JSON.stringify({ id, method, params: parameters }));
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });
  };
  const evaluate = async (functionSource: string, argument?: unknown): Promise<unknown> => {
    const expression = `(${functionSource})(${JSON.stringify(argument ?? null)})`;
    const reply = evaluationReplySchema.parse(
      await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }),
    );
    if (reply.exceptionDetails !== undefined) {
      throw new Error(
        reply.exceptionDetails.exception?.description ??
          reply.exceptionDetails.text ??
          'evaluation failed',
      );
    }
    return reply.result?.value;
  };
  return {
    send,
    evaluate,
    close: () => {
      socket.close();
    },
  };
}
