import fastify from 'fastify';
import cors from '@fastify/cors';
import socketIo from 'socket.io';
import _ from 'lodash';
import SocketManager from './SocketManager';
import apiRouter from './api/router';

const port = process.env.PORT || 3000;

// ======== Fastify Server Config ==========

const app = fastify({
  logger:
    process.env.NODE_ENV === 'production'
      ? {
          level: 'info',
        }
      : {
          level: 'debug',
        },
});

// Set custom error handler
app.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  // Handle validation errors
  if (error.validation) {
    reply.code(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation error',
      validation: error.validation,
    });
    return;
  }

  // Handle errors with status codes
  const statusCode = error.statusCode || 500;
  reply.code(statusCode).send({
    statusCode,
    error: error.name || 'Internal Server Error',
    message: error.message || 'An error occurred',
  });
});

// ================== Logging ================

function logAllEvents(io: socketIo.Server, log: typeof console.log) {
  io.on('*', (event: any, ...args: any) => {
    try {
      log(`[${event}]`, _.truncate(JSON.stringify(args), {length: 100}));
    } catch (e) {
      log(`[${event}]`, args);
    }
  });
}

// ================== Main Entrypoint ================

async function runServer() {
  try {
    // Register CORS plugin
    await app.register(cors, {
      origin: true,
    });

    // Register API routes
    await app.register(apiRouter, {prefix: '/api'});

    // Initialize Socket.IO after server is ready but before listening
    app.addHook('onReady', () => {
      const server = app.server;
      const io = socketIo(server, {
        pingInterval: 2000,
        pingTimeout: 5000,
        cors: {
          origin: '*',
          methods: ['GET', 'POST'],
          credentials: true,
        },
      });

      const socketManager = new SocketManager(io);
      socketManager.listen();
      logAllEvents(io, app.log.info.bind(app.log));
    });

    await app.listen({port: Number(port), host: '0.0.0.0'});
    app.log.info(`Listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  process.once('SIGUSR2', async () => {
    await app.close();
    app.log.info('exiting...');
    process.kill(process.pid, 'SIGUSR2');
    app.log.info('exited');
  });
}

runServer();
