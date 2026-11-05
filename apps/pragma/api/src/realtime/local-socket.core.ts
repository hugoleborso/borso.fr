export const OPEN_READY_STATE = 1;

export interface SendableSocket {
  readonly readyState: number;
  send(data: string): void;
}

// @FollowsBlueprint core-decision-about-a-handle-the-caller-holds
export function sendWhenOpen(socket: SendableSocket | undefined, data: string): void {
  if (socket === undefined) return;
  if (socket.readyState !== OPEN_READY_STATE) return;
  socket.send(data);
}

const ACCEPTED_STATUS = 200;

export function isSocketReplyAccepted(reply: { readonly statusCode: number }): boolean {
  return reply.statusCode === ACCEPTED_STATUS;
}
