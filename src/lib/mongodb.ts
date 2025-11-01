import { MongoClient, Db } from 'mongodb';

// Prefer MONGODB_URI but also accept MONGO_URI for compatibility with different hosts
const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || '';
const options = {};

// We'll lazily initialize the client promise to avoid throwing during module import
let clientPromise: Promise<MongoClient> | undefined;

function createClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error('Please add your MONGODB_URI (or MONGO_URI) to environment variables');
  }

  if (process.env.NODE_ENV === 'development') {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
        console.error('Failed to connect to MongoDB. Check MONGODB_URI/MONGO_URI, network/DNS and Atlas IP access list. Error:');
        console.error(err);
        throw err;
      });
    }
    return globalWithMongo._mongoClientPromise as Promise<MongoClient>;
  }

  const client = new MongoClient(uri, options);
  return client.connect().catch((err) => {
    console.error('Failed to connect to MongoDB. Check MONGODB_URI/MONGO_URI, network/DNS and Atlas IP access list. Error:');
    console.error(err);
    throw err;
  });
}

export async function getDatabase(): Promise<Db> {
  if (!clientPromise) clientPromise = createClientPromise();
  const client = await clientPromise;
  return client.db('FeedbackPortal2');
}

export default async function getClientPromise() {
  if (!clientPromise) clientPromise = createClientPromise();
  return clientPromise;
}
