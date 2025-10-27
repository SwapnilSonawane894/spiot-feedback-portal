#!/usr/bin/env node
/*
  backup-database.js
  Exports listed collections to ./backup/[timestamp]/<collection>.json
  Writes metadata.json with indexes and counts and a combined all_collections.json

  Usage: node backup-database.js [--dry-run] [--out ./backup]
*/

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { MongoClient } = require('mongodb');

const DEFAULT_URI = process.env.MONGO_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'feedbackPortal';

// include settings collection, matches current DB structure
const COLLECTIONS = [
  'academicYears',
  'users',
  'feedback',
  'staff',
  'facultyAssignments',
  'departments',
  'hodSuggestions',
  'subjects',
  'settings',
];

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const outArgIndex = args.indexOf('--out');
  const outBase = outArgIndex >= 0 && args[outArgIndex + 1] ? args[outArgIndex + 1] : './backup';

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.resolve(outBase, timestamp);

  console.log(`Connecting to ${DEFAULT_URI} (DB: ${DB_NAME})`);
  if (dryRun) console.log('Dry-run: no files will be written');

  const client = new MongoClient(DEFAULT_URI, { connectTimeoutMS: 10000 });
  await client.connect();
  const db = client.db(DB_NAME);

  const metadata = { createdAt: new Date().toISOString(), db: DB_NAME, collections: {} };
  const combined = {};

  for (const name of COLLECTIONS) {
    console.log(`Processing collection: ${name}`);
    const col = db.collection(name);
    const count = await col.countDocuments();
    const indexes = await col.indexes();
    metadata.collections[name] = { count, indexes };

    if (dryRun) {
      console.log(`  would export ${count} docs and ${indexes.length} indexes`);
      continue;
    }

    const docs = await col.find({}).toArray();
    combined[name] = docs;

    await fs.mkdir(outDir, { recursive: true });
    const filePath = path.join(outDir, `${name}.json`);
    await fs.writeFile(filePath, JSON.stringify(docs, null, 2), 'utf8');
    console.log(`  wrote ${filePath}`);
  }

  if (!dryRun) {
    const metaPath = path.join(outDir, 'metadata.json');
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
    const combinedPath = path.join(outDir, 'all_collections.json');
    await fs.writeFile(combinedPath, JSON.stringify(combined, null, 2), 'utf8');
    console.log(`Wrote metadata and combined backup to ${outDir}`);
  }

  await client.close();
}

main().catch(err => {
  console.error('Backup failed:', err);
  process.exit(2);
});
