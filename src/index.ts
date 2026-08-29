import 'reflect-metadata';
import 'module-alias/register';

import express from 'express';
import bodyParser from 'body-parser';
import {ControllersLoader} from 'simple-ts-express-decorators';
import {NsfwController} from 'app/controllers/NsfwController';

const PORT = Number(process.env.PORT) || 3000;
const MAX_JSON_BODY = '1mb';

const app = express();

app.use(bodyParser.json({limit: MAX_JSON_BODY}));

new ControllersLoader({
  controllers: [NsfwController]
}).load(app);

const server = app.listen(PORT, () => {
  console.log(`[nsfw-api] listening on port ${PORT}`);
});

const shutdown = (signal: string) => {
  console.log(`[nsfw-api] received ${signal}, closing server...`);
  server.close((err) => {
    if (err) {
      console.error('[nsfw-api] error during shutdown', err);
      process.exit(1);
    }
    process.exit(0);
  });

  // Force-exit after 10s if connections hang (e.g. in-flight TF inference)
  setTimeout(() => {
    console.warn('[nsfw-api] forcing shutdown after 10s timeout');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
