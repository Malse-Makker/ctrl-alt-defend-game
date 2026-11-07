import { startMpServer } from './server';

const port = Number(process.env.MP_PORT ?? 8001);
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'https://game.makkers.net')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

startMpServer({ port, allowedOrigins });
console.log(`multiplayer server on :${port}, origins: ${allowedOrigins.join(', ') || 'any'}`);
