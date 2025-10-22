import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MONGODB_URI to environment variables');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
      console.error('Failed to connect to MongoDB. Check MONGODB_URI, network/DNS and Atlas IP access list. Error:');
      console.error(err);
      throw err;
    });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect().catch((err) => {
    console.error('Failed to connect to MongoDB. Check MONGODB_URI, network/DNS and Atlas IP access list. Error:');
    console.error(err);
    throw err;
  });
}

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db('feedbackPortal');
}

export default clientPromise;
