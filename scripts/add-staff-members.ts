#!/usr/bin/env tsx

import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';

const staffMembers = [
  { name: "Mrs. Bhosale S. S.", email: "bhosale@gmail.com", password: "bhosale", department: "CO" },
  { name: "Mrs. Raut D. A", email: "raut@gmail.com", password: "raut", department: "EE" },
  { name: "MS. Rajwade V. V", email: "rajwade@gmail.com", password: "rajwade", department: "CO" },
  { name: "Ms. Wagh S. S.", email: "wagh@gmail.com", password: "wagh", department: "CO" },
  { name: "Mr. Kadam R. C.", email: "kadam@gmail.com", password: "kadam", department: "CO" },
  { name: "Ms. Kamble P. D.", email: "kamble@gmail.com", password: "Kamble", department: "CO" },
  { name: "Mr. Jagtap R. G.", email: "jagtap@gmail.com", password: "jagtap", department: "NA" },
  { name: "Ms. Dhapte S. N.", email: "dhapte@gmail.com", password: "dhapte", department: "NA" },
  { name: "Mrs. Bankar P. S.", email: "bankar@gmail.com", password: "bankar", department: "NA" },
  { name: "Mr. Hajare S. K.", email: "hajare@gmail.com", password: "hajare", department: "CE" },
  { name: "Mr. Khatake R. B.", email: "khatake@gmail.com", password: "khatake", department: "NA" },
  { name: "Ms. Shinde P.J.", email: "shinde@gmail.com", password: "shinde", department: "NA" },
  { name: "Mr. Gharjare V. N.", email: "gharjare@gmail.com", password: "gharjare", department: "NA" },
  { name: "Ms. Bhoite D. C.", email: "bhoite@gmail.com", password: "bhoite", department: "NA" },
  { name: "Mr. Pawar A. N.", email: "pawar@gmail.com", password: "pawar", department: "ME" },
  { name: "Mr. Bhoite M. A.", email: "bhoite2@gmail.com", password: "bhoite2", department: "ME" },
  { name: "Mrs. Nagawade M. S.", email: "nagawade@gmail.com", password: "nagawade", department: "NA" },
  { name: "Mr. Wagh S.T.", email: "wagh2@gmail.com", password: "wagh2", department: "NA" },
];

async function main() {
  const MONGODB_URI = process.env.DATABASE_URL || process.env.MONGODB_URI;

  if (!MONGODB_URI || MONGODB_URI.trim() === '') {
    throw new Error('DATABASE_URL or MONGODB_URI environment variable is required');
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('\n🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('spiot_feedback_portal');
    const usersCollection = db.collection('users');
    const staffCollection = db.collection('staff');
    const departmentsCollection = db.collection('departments');

    console.log('📋 Fetching departments...');
    const departments = await departmentsCollection.find({}).toArray();
    console.log(`✅ Found ${departments.length} departments\n`);

    const departmentMap = new Map();
    for (const dept of departments) {
      if (dept.abbreviation) {
        departmentMap.set(dept.abbreviation.toUpperCase(), dept._id.toString());
      }
    }

    console.log('Department mappings:');
    departmentMap.forEach((id, abbr) => {
      console.log(`  ${abbr} -> ${id}`);
    });
    console.log('');

    console.log('🧹 Cleaning up employeeId and designation fields from existing staff...');
    const updateResult = await staffCollection.updateMany(
      {},
      { $unset: { employeeId: "", designation: "" } }
    );
    console.log(`✅ Updated ${updateResult.modifiedCount} staff records\n`);

    console.log('👥 Adding staff members...\n');

    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const member of staffMembers) {
      try {
        const existingUser = await usersCollection.findOne({ email: member.email });

        if (existingUser) {
          console.log(`⏭️  Skipping ${member.name} (${member.email}) - already exists`);
          skippedCount++;
          continue;
        }

        const deptAbbr = member.department.toUpperCase();
        const departmentId = departmentMap.get(deptAbbr);

        if (!departmentId) {
          console.log(`❌ Error: Department ${member.department} not found for ${member.name}`);
          errorCount++;
          continue;
        }

        const hashedPassword = await bcrypt.hash(member.password, 10);

        const userResult = await usersCollection.insertOne({
          name: member.name,
          email: member.email,
          hashedPassword,
          role: 'STAFF',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await staffCollection.insertOne({
          userId: userResult.insertedId.toString(),
          departmentId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`✅ Added ${member.name} (${member.email}) to department ${member.department}`);
        addedCount++;
      } catch (error) {
        console.error(`❌ Error adding ${member.name}:`, error);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Added: ${addedCount}`);
    console.log(`  ⏭️  Skipped (already exists): ${skippedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📝 Total: ${staffMembers.length}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

main();
