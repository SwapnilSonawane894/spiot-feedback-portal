// Debug why existingIds check is wrong
import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('FeedbackPortal2');

// Get a few assignments and check how _id serialises
const sample = await db.collection('facultyAssignments').find({}).limit(3).toArray();
for (const a of sample) {
  console.log('_id type:', typeof a._id, '  value:', a._id, '  String:', String(a._id));
}

// Try to find one of the orphaned IDs directly
const testId = '690723c178529e9646b0c914';
const byObjId = await db.collection('facultyAssignments').findOne({ _id: new ObjectId(testId) });
const byString = await db.collection('facultyAssignments').findOne({ _id: testId });
console.log('\nLookup by ObjectId:', byObjId ? 'FOUND' : 'NOT FOUND');
console.log('Lookup by string  :', byString ? 'FOUND' : 'NOT FOUND');

// Check how existingIds looks
const existingAssigns = await db.collection('facultyAssignments').find({}, { projection: { _id: 1 } }).toArray();
const existingIds = new Set(existingAssigns.map(a => String(a._id)));
console.log('\nexistingIds sample:', [...existingIds].slice(0,3));
console.log('Test ID in set:', existingIds.has(testId));

await client.close();
