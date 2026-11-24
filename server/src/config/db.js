import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connect to MongoDB. Vote correctness depends on a replica set (transactions),
 * so we fail loudly in production if the deployment is a standalone mongod.
 */
export async function connectDatabase(uri = env.mongoUri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 20,
  });

  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && env.isProduction) {
    throw new Error(
      'MongoDB is not running as a replica set. ACID vote transactions require a replica set (Atlas or docker compose).',
    );
  }
  if (!hello.setName) {
    console.warn('[db] Connected to a standalone MongoDB — vote transactions will fail. Use a replica set.');
  }
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.connection.close();
}
