import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';

// Edit the URI below if you want to run locally with different connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spiot';

async function main() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db();
    const coll = db.collection('facultyAssignments');

    // Pull all assignments and normalize semester similar to service
    const docs = await coll.find({}).toArray();
    const normalizeSemester = (s: any) => {
      if (!s && s !== 0) return s;
      let str = String(s).trim();
      const m = str.match(/(Odd|Even)\s*(?:Semester)?\s*(\d{4}(?:-|–)\d{2})/i);
      if (m) {
        const type = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
        const year = m[2];
        return `${type} Semester ${year}`;
      }
      const num = parseInt(str, 10);
      if (!isNaN(num) && num >=1 && num <=6) {
        const isOdd = num % 2 === 1;
        const yearStr = `${new Date().getFullYear()}-${(new Date().getFullYear()+1).toString().slice(-2)}`;
        return `${isOdd ? 'Odd' : 'Even'} Semester ${yearStr}`;
      }
      return str;
    };

    const groups: Record<string, any[]> = {};
    for (const d of docs) {
      const staff = d.staffId ? String(d.staffId) : '';
      const subj = d.subjectId ? String(d.subjectId) : '';
      const sem = normalizeSemester(d.semester || '');
      const key = `${staff}::${subj}::${sem}`;
      groups[key] = groups[key] || [];
      groups[key].push(d);
    }

    const duplicates = Object.entries(groups).filter(([k, arr]) => arr.length > 1).map(([k, arr]) => ({ key: k, count: arr.length, ids: arr.map(x => x._id?.toString()), samples: arr.slice(0,5).map(a => ({ _id: a._id?.toString(), semester: a.semester })) }));

    const out = {
      checked: docs.length,
      duplicateGroups: duplicates.length,
      duplicates,
    };

    const outPath = path.join(process.cwd(), 'dedupe-dryrun.json');
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(`Wrote dry-run report to ${outPath}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
