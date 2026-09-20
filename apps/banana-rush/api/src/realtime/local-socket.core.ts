export const OPEN_READY_STATE = 1;

export interface SendableSocket {
  readonly readyState: number;
  send(data: string): void;
}

/**
 * @Blueprint core-decision-about-a-handle-the-caller-holds
 * @BlueprintName Core Decision About A Handle The Caller Holds
 * @BlueprintUsage Use where the only branch in an impure callback is whether the handle it was given can still be used.
 * @BlueprintDescription Takes the handle as an argument, typed by the one property and the one method the decision needs rather than by the vendor's class, so a test passes an object literal and the development entry point above keeps no branch of its own. A socket that has gone or was never found is answered as "not sent" instead of throwing, because a listener disappearing is the ordinary end of a connection.
 */
export function sendWhenOpen(socket: SendableSocket | undefined, data: string): void {
  if (socket === undefined) return;
  if (socket.readyState !== OPEN_READY_STATE) return;
  socket.send(data);
}
