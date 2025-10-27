#!/usr/bin/env node
/*
  rollback-migration.js
  - Restores collections from a backup directory created by backup-database.js
  - Drops the departmentSubjects collection
  - Restores indexes from metadata.json

  Usage: node rollback-migration.js --backup ./backup/2025-10-26-TIME [--dry-run]
*/

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { MongoClient } = require('mongodb');

const DEFAULT_URI = process.env.MONGO_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'feedbackPortal';

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question + ' ', ans => { rl.close(); resolve(ans.match(/^y(es)?$/i)); }));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const bIndex = args.indexOf('--backup');
  if (bIndex === -1 || !args[bIndex + 1]) {
    console.error('Please provide --backup <path>');
    process.exit(1);
  }
  const backupDir = path.resolve(args[bIndex + 1]);

  console.log(`Restore from backup: ${backupDir}`);
  if (dryRun) console.log('Dry-run: no changes will be made');

  // read metadata
  const metaPath = path.join(backupDir, 'metadata.json');
  let metadata;
  try {
    const meta = await fs.readFile(metaPath, 'utf8');
    metadata = JSON.parse(meta);
  } catch (err) {
    console.error('Could not read metadata.json from backup:', err.message);
    process.exit(2);
  }

  const client = new MongoClient(DEFAULT_URI, { connectTimeoutMS: 10000 });
  await client.connect();
  const db = client.db(DB_NAME);

  // Drop departmentSubjects
  const deptSubjName = 'departmentSubjects';
  const exists = (await db.listCollections({ name: deptSubjName }).toArray()).length > 0;
  if (exists) {
    const ok = await confirm(`This will drop collection ${deptSubjName}. Proceed? (yes to continue)`);
    if (!ok) {
      console.log('Aborting rollback');
      await client.close();
      return;
    }
    if (!dryRun) {
      await db.collection(deptSubjName).drop();
      console.log(`Dropped ${deptSubjName}`);
    } else {
      console.log('(dry-run) would drop', deptSubjName);
    }
  } else {
    console.log(`${deptSubjName} does not exist; skipping drop`);
  }

  // Restore collections and indexes from backup metadata
  for (const [colName, info] of Object.entries(metadata.collections || {})) {
    const filePath = path.join(backupDir, `${colName}.json`);
    try {
      await fs.access(filePath);
    } catch (err) {
      console.warn(`Backup file for ${colName} not found at ${filePath}; skipping restore of documents`);
      continue;
    }
    const docsJson = await fs.readFile(filePath, 'utf8');
    const docs = JSON.parse(docsJson);

    console.log(`Restoring ${docs.length} docs into ${colName}`);
    if (dryRun) continue;

    const col = db.collection(colName);
    await col.deleteMany({});
    if (docs.length) await col.insertMany(docs, { ordered: false });

    // restore indexes
    if (info && info.indexes && info.indexes.length) {
      // drop all indexes except _id
      const existing = await col.indexes();
      for (const ix of existing) {
        if (ix.name !== '_id_') {
          try { await col.dropIndex(ix.name); } catch (e) { /* ignore */ }
        }
      }
      for (const ix of info.indexes) {
        if (ix.name === '_id_') continue;
        const key = ix.key || {};
        const options = Object.assign({}, ix);
        delete options.key;
        delete options.ns;
        if (!options.name) options.name = undefined;
        try {
          await col.createIndex(key, options);
        } catch (e) {
          console.warn(`Could not create index ${ix.name} on ${colName}:`, e.message);
        }
      }
    }
  }

  console.log('Rollback complete');
  await client.close();
}

main().catch(err => {
  console.error('Rollback failed:', err);
  process.exit(4);
});
