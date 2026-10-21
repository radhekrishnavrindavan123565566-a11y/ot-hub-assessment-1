const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Cached connection — critical for Vercel/Lambda serverless environments.
 *
 * Serverless functions are stateless: every cold start creates a new Node
 * process, but the module cache persists across warm invocations within the
 * same container. By caching the promise we avoid opening a new TCP connection
 * on every warm invocation and avoid the "buffering timed out" error that
 * happens when Mongoose hasn't finished connecting before a query runs.
 *
 * In a long-running server (local dev, Railway, Render) this behaves
 * identically to a single connect() call at startup.
 */
let cached = global._mongooseConnection;

if (!cached) {
  cached = global._mongooseConnection = { conn: null, promise: null };
}

const connectDB = async () => {
  // Guard: fail immediately if URI is not configured
  if (!process.env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Add it in Vercel Dashboard → Project → Settings → Environment Variables.'
    );
  }

  // Already connected — return immediately
  if (cached.conn) return cached.conn;

  // Connection in progress — wait for it
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000, // fail fast on bad URI
        socketTimeoutMS: 45000,
        maxPoolSize: 10,                 // keep pool small for serverless
        minPoolSize: 1,
      })
      .then((conn) => {
        logger.info(`MongoDB connected: ${conn.connection.host}`);
        return conn;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Clear the promise so a retry is possible on the next invocation
    cached.promise = null;
    logger.error('MongoDB connection error:', err);
    throw err;
  }

  return cached.conn;
};

module.exports = connectDB;
