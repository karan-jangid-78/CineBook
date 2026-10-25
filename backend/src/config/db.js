import mongoose from 'mongoose';
import { config } from './env.js';

let memoryReplSet = null;

function maskMongoUri(uri) {
  if (!uri) return 'undefined';
  return uri.replace(/:([^@]+)@/, ':****@');
}

export async function connectDB() {
  // If already connected, return
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    // Attempt connecting to the configured MONGO_URI
    console.log(`[Database] Attempting connection to MongoDB at: ${maskMongoUri(config.mongoUri)}`);
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: config.isProduction ? 5000 : 2500,
    });
    console.log(`[Database] Connected successfully to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
    return mongoose.connection;
  } catch (err) {
    console.warn(`[Database] Direct MongoDB connection failed (${err.message}).`);

    if (config.useEmbeddedMongoFallback) {
      console.log(`[Database] Starting embedded MongoDB Replica Set for zero-config local operation & transactions...`);
      try {
        const { MongoMemoryReplSet } = await import('mongodb-memory-server');
        memoryReplSet = await MongoMemoryReplSet.create({
          replSet: { count: 1, storageEngine: 'wiredTiger' },
        });
        const uri = memoryReplSet.getUri('cinebook');
        console.log(`[Database] Embedded MongoDB Replica Set started at: ${maskMongoUri(uri)}`);
        await mongoose.connect(uri);
        console.log(`[Database] Connected to embedded MongoDB successfully.`);
        return mongoose.connection;
      } catch (innerErr) {
        console.error(`[Database] Failed to start embedded MongoDB:`, innerErr);
        throw innerErr;
      }
    } else {
      if (config.isProduction) {
        throw new Error(
          `[Database] Fatal: Unable to connect to production MongoDB (${err.message}). Embedded in-memory MongoDB fallback is disabled in production. Please check your MONGO_URI configuration.`
        );
      }
      throw err;
    }
  }
}

export async function disconnectDB() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (memoryReplSet) {
      await memoryReplSet.stop();
      memoryReplSet = null;
    }
    console.log('[Database] Disconnected from database.');
  } catch (err) {
    console.error('[Database] Error disconnecting:', err);
  }
}

export function isReplicaSet() {
  const repl = mongoose.connection?.client?.topology?.description?.setName;
  return Boolean(repl);
}
