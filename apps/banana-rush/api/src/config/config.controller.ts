import { Hono } from 'hono';
import { readPublicConfig } from './config.environment';

// @FollowsBlueprint controller-public-router
export function buildConfigRouter() {
  return new Hono().get('/', (context) => context.json(readPublicConfig()));
}
