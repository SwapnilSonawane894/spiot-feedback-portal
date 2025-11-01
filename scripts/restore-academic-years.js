const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB connection URI
const uri = "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = 'feedback';

async function restoreAcademicYears() {
  console.log('Starting academic years restoration...');
  
  // Read backup data
  const academicYearsPath = path.join(__dirname, '..', '..', 'backup', '2025-10-26T05-44-40-306Z', 'academicYears.json');
  const academicYearsData = JSON.parse(fs.readFileSync(academicYearsPath, 'utf-8'));

  console.log(`Found ${academicYearsData.length} academic years to restore`);

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);

    // Clear existing academic years
    await db.collection('academicYears').deleteMany({});
    console.log('Cleared existing academic years');

    // Insert academic years
    const result = await db.collection('academicYears').insertMany(academicYearsData);
    console.log(`Restored ${result.insertedCount} academic years`);

    // Verify restoration
    const restoredCount = await db.collection('academicYears').countDocuments();
    console.log(`\nVerification:`);
    console.log(`Total academic years in database: ${restoredCount}`);

    const sample = await db.collection('academicYears').findOne();
    if (sample) {
      console.log('\nSample academic year:');
      console.log(JSON.stringify(sample, null, 2));
    }

  } catch (error) {
    console.error('Error during restoration:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Closed MongoDB connection');
  }
}

// Run the restoration
restoreAcademicYears().catch(console.error);