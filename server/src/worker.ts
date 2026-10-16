/** Cloudflare Worker entry: binds D1 + secrets to the pure handler, plus the daily retention cron. */
import { D1Store, type D1Database } from './d1.ts';
import { handle } from './handler.ts';

export interface Env {
  DB: D1Database;
  RUN_TOKEN_SECRET: string;
  ALLOWED_ORIGINS?: string;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handle(request, {
      store: new D1Store(env.DB),
      secret: env.RUN_TOKEN_SECRET,
      allowedOrigins: env.ALLOWED_ORIGINS ?? '*',
    });
  },
  async scheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<void> {
    ctx.waitUntil(new D1Store(env.DB).cleanup(Date.now()));
  },
};
