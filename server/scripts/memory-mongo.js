/**
 * Local MongoDB replica set without Docker — for machines that only have Node.
 *   npm run db:memory
 * Then run `npm run seed` and `npm run dev` as usual.
 */
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const PORT = Number(process.env.MEMORY_MONGO_PORT || 27017);

const replSet = await MongoMemoryReplSet.create({
  replSet: { count: 1, name: 'rs0' },
  instanceOpts: [{ port: PORT, dbName: 'reddit_clone' }],
});

console.log(`[mongo] replica set ready: mongodb://127.0.0.1:${PORT}/reddit_clone?replicaSet=rs0`);
console.log('[mongo] press Ctrl+C to stop');

const stop = async () => {
  await replSet.stop();
  process.exit(0);
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
