import 'express-async-errors';
import express, { Application } from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database.config';
import { config } from './config/env.config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error.middleware';

// Import controllers
import authController from './modules/auth/auth.controller';
import usersController from './modules/users/users.controller';
import conversationsController from './modules/conversations/conversations.controller';
import messagesController from './modules/messages/messages.controller';

/**
 * SecureChat Backend Server
 * 
 * E2EE messaging backend with:
 * - Argon2id password hashing
 * - JWT authentication
 * - MongoDB for flexible data storage
 * - Encrypted message storage
 * - Self-destructing messages
 * - Delete for everyone functionality
 */
class Server {
  private app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // CORS
    this.app.use(
      cors({
        origin: config.nodeEnv === 'production' ? process.env.FRONTEND_URL : '*',
        credentials: true,
      }),
    );

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, _res, next) => {
      logger.debug(`${req.method} ${req.path}`);
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    });

    // API routes
    this.app.use('/auth', authController);
    this.app.use('/users', usersController);
    this.app.use('/conversations', conversationsController);
    this.app.use('/', messagesController); // Messages routes include conversations/:id/messages

    // 404 handler
    this.app.use((_req, res) => {
      res.status(404).json({
        status: 'error',
        message: 'Route not found',
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Initialize database
      await connectDatabase();

      // Start server
      this.app.listen(config.port, () => {
        logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
        logger.info(`API available at http://localhost:${config.port}`);
      });

      // TODO: Start background job for expired message deletion
      // this.startExpiryJob();
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Background job to delete expired messages
   * TODO: Implement this with a proper job scheduler (e.g., node-cron)
   */
  // private startExpiryJob(): void {
  //   setInterval(async () => {
  //     try {
  //       const messagesService = new MessagesService();
  //       await messagesService.deleteExpiredMessages();
  //     } catch (error) {
  //       logger.error('Error in expiry job:', error);
  //     }
  //   }, 60000); // Run every minute
  // }
}

// Start server
const server = new Server();
server.start();
