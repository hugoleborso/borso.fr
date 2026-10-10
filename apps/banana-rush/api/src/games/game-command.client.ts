import { selectViewerMoves } from '@domain/game-lifecycle.core';
import { type ClientRequestOptions, hc } from 'hono/client';
import type { AppRouter } from '../app';
import type { CommandReply } from './game-command.core';
import type { GameCommandName, GameCommandOf } from './games.schema';
import type { GameView, SeatedPlayer } from './games.types';
import { PLAYER_TOKEN_HEADER, PLAYER_TOKEN_SCHEME } from './player-token.middleware';

type CommandHandlers = {
  readonly [Name in GameCommandName]: (command: GameCommandOf<Name>) => Promise<CommandReply>;
};

export type GameCommandRunner = <Name extends GameCommandName>(
  command: GameCommandOf<Name>,
) => Promise<CommandReply>;

interface ReadableResponse {
  json(): Promise<unknown>;
}

function withToken(token: string | undefined): { headers: Record<string, string> } {
  if (token === undefined) return { headers: {} };
  return { headers: { [PLAYER_TOKEN_HEADER]: `${PLAYER_TOKEN_SCHEME} ${token}` } };
}

async function refuse(response: ReadableResponse): Promise<CommandReply> {
  return { isSuccess: false, output: await response.json() };
}

function presentGame(game: GameView): CommandReply {
  return { isSuccess: true, output: { game, moves: selectViewerMoves(game) } };
}

function presentSeat(seated: SeatedPlayer): CommandReply {
  return {
    isSuccess: true,
    output: {
      playerId: seated.playerId,
      playerToken: seated.playerToken,
      game: seated.game,
      moves: selectViewerMoves(seated.game),
    },
  };
}

/**
 * @Blueprint client-command-runner-over-the-typed-router
 * @BlueprintName Client Command Runner Over The Typed Router
 * @BlueprintUsage Use for a second way into an application, such as a command line or an agent, that must reach exactly the rules the interface reaches.
 * @BlueprintDescription Drives the application through `hc<AppRouter>`, the same typed client the site builds, so a command passes the same validator, the same token check and the same error translation as a tap, and nothing about the rules is written a second time. The fetch is injected: the entry point hands it the application's own `request` to run without a server or a socket, or the platform fetch to drive a deployed stage, and the handlers cannot tell which. Each handler is one route call; what a command adds is the list of moves the viewer may make next, read from the same domain rule the screens read, which is what lets an agent play without a screen.
 */
export function buildGameCommandRunner(
  baseUrl: string,
  fetcher: ClientRequestOptions['fetch'],
): GameCommandRunner {
  const games = hc<AppRouter>(baseUrl, { fetch: fetcher }).api.games;

  const handlers: CommandHandlers = {
    create: async ({ command: _command, ...body }) => {
      const response = await games.$post({ json: body });
      if (!response.ok) return await refuse(response);
      return presentSeat(await response.json());
    },
    join: async ({ code, nickname, avatar }) => {
      const response = await games[':code'].players.$post({
        param: { code },
        json: { nickname, avatar },
      });
      if (!response.ok) return await refuse(response);
      return presentSeat(await response.json());
    },
    start: async ({ code, token }) => {
      const response = await games[':code'].start.$post({ param: { code } }, withToken(token));
      if (!response.ok) return await refuse(response);
      return presentGame((await response.json()).game);
    },
    bid: async ({ code, token, amount }) => {
      const response = await games[':code'].bids.$post(
        { param: { code }, json: { amount } },
        withToken(token),
      );
      if (!response.ok) return await refuse(response);
      return presentGame((await response.json()).game);
    },
    resolve: async ({ code, token }) => {
      const response = await games[':code'].resolve.$post({ param: { code } }, withToken(token));
      if (!response.ok) return await refuse(response);
      return presentGame((await response.json()).game);
    },
    show: async ({ code, token }) => {
      const response = await games[':code'].$get({ param: { code } }, withToken(token));
      if (!response.ok) return await refuse(response);
      return presentGame((await response.json()).game);
    },
    rounds: async ({ code }) => {
      const response = await games[':code'].rounds.$get({ param: { code } });
      if (!response.ok) return await refuse(response);
      return { isSuccess: true, output: await response.json() };
    },
    rematch: async ({ code, token }) => {
      const response = await games[':code'].rematch.$post({ param: { code } }, withToken(token));
      if (!response.ok) return await refuse(response);
      return presentGame((await response.json()).game);
    },
  };

  return async (command) => await handlers[command.command](command);
}
