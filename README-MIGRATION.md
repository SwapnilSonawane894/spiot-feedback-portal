# Migration: departmentSubjects junction and backup scripts

This folder contains helpers to backup the database, perform a migration that introduces a departmentSubjects junction collection, verify the migration, and rollback from a backup.

Files added:

- `backup-database.js` — Exports the 8 collections to `./backup/[timestamp]/` and writes `metadata.json` and a combined `all_collections.json`.
- `migrate-add-department-subjects.js` — Creates `departmentSubjects`, infers department-subject relations from `facultyAssignments -> staff -> departments`, inserts rows in batches, and creates indexes. Optionally drops unique index on `subjects.subjectCode` when passed `--drop-subjectcode-index`.
- `verify-migration.js` — Quick integrity checks: compares inferred pair counts, samples assignments, checks duplicates.
- `rollback-migration.js` — Restores collections and indexes from a backup folder created by `backup-database.js` and drops `departmentSubjects`.

Prerequisites
-------------

- Node.js (v18+ recommended)
- `mongodb` driver is listed in project deps. If not installed, run `npm install`.
- Access to the MongoDB cluster. Set `MONGO_URI` environment variable or edit the scripts' DEFAULT_URI directly (not recommended for secrets).

Basic workflow
--------------

1. Backup your database (required):

```bash
node backup-database.js --out ./backup
```

2. Dry-run migration to preview inferred rows:

```bash
node migrate-add-department-subjects.js --dry-run
```

3. Perform migration (creates `departmentSubjects` and inserts inferred rows):

```bash
node migrate-add-department-subjects.js
```

4. (Optional) Drop unique index on `subjects.subjectCode` if you want the same subjectCode in multiple departments:

```bash
node migrate-add-department-subjects.js --drop-subjectcode-index
```

5. Verify migration:

```bash
node verify-migration.js
```

6. If something goes wrong, rollback using the backup created in step 1:

```bash
node rollback-migration.js --backup ./backup/<timestamp> --dry-run  # preview
node rollback-migration.js --backup ./backup/<timestamp>         # restore
```

Notes & Best practices
----------------------

- Always take a fresh backup before running the migration.
- These scripts are intentionally conservative. They require confirmations for destructive actions and support `--dry-run` where noted.
- The migration creates a composite unique index on `(departmentId, subjectId)` to prevent duplicates. If any pairs already exist, insertion uses unordered operations and duplicates are tolerated.
- Index creation and index dropping are DDL operations that run outside of transactions.
- If your dataset is very large, consider streaming or using server-side aggregation to avoid loading entire collections into memory.

If you want, I can additionally:

- Convert these scripts to ESM (.mjs)
- Add automated unit tests or a small runner to run these in sequence with safe rollbacks
- Add logging to a file instead of console
