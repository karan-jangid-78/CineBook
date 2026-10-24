import mongoose from 'mongoose';
import { config } from './env.js';

let memoryReplSet = null;

export async function connectDB() {
  // If already connected, return
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    // First, attempt connecting to the configured MONGO_URI with short timeout
    console.log(`[Database] Attempting connection to MongoDB at: ${config.mongoUri}`);
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 2500,
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
        console.log(`[Database] Embedded MongoDB Replica Set started at: ${uri}`);
        await mongoose.connect(uri);
        console.log(`[Database] Connected to embedded MongoDB successfully.`);
        return mongoose.connection;
      } catch (innerErr) {
        console.error(`[Database] Failed to start embedded MongoDB:`, innerErr);
        throw innerErr;
      }
    } else {
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
