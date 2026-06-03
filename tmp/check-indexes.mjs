import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('FeedbackPortal2');

// Get all indexes on facultyAssignments
const indexes = await db.collection('facultyAssignments').indexes();
console.log('Indexes on facultyAssignments:');
for (const idx of indexes) {
  console.log(`  name: ${idx.name}`);
  console.log(`  key : ${JSON.stringify(idx.key)}`);
  console.log(`  unique: ${idx.unique || false}`);
  console.log();
}

// Now check: for the first mapping entry, is there already an assignment 
// with the same staffId + subjectId + semester?
const testEntry = { 
  staffId: '6906f6e678529e9646b0c5f4', 
  subjectId: '6907140a78529e9646b0c633',
  semester: 'Odd 2025-26'
};
const existing = await db.collection('facultyAssignments').findOne(testEntry);
console.log('Existing with same staffId/subjectId/semester:', existing ? JSON.stringify(existing) : 'NOT FOUND');

await client.close();
