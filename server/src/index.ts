import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';

import { connectMongoDB } from './config/mongodb';
import { connectRedis } from './config/redis';
import { prisma } from './config/prisma';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import friendRoutes from './routes/friends';
import gameRoutes from './routes/games';
import chatRoutes from './routes/chat';
import uploadRoutes from './routes/upload';

import { registerSocketHandlers } from './sockets';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Validate environment variables
const requiredEnvVars = [
  'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL',
  'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'
];
const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = express();
const httpServer = http.createServer(app);

// Socket.io setup
export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'", 'wss:', 'ws:'],
    },
  },
}));

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Global rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging (only in dev)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);

// 404 and Error handlers
app.use(notFound);
app.use(errorHandler);

// Register WebSocket handlers
registerSocketHandlers(io);

// Start server
const PORT = parseInt(process.env.PORT || '5000', 10);

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connected');

    await connectMongoDB();
    await connectRedis();

    httpServer.listen(PORT, () => {
      console.log(`🚀 VaultGames server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
