// @ts-check
import { MongoClient, ObjectId } from 'mongodb';

const uri = "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = 'FeedbackPortal2';

// Helper function to generate next subject code
async function getNextSubjectCode(db, departmentId, name) {
  try {
    // First check if same subject name exists in any department
    const existingSubject = await db.collection('subjects')
      .findOne({ 
        name: name.trim().toLowerCase()
      });
    
    // If found, use the same code
    if (existingSubject && existingSubject.subjectCode) {
      console.log(`Found existing subject "${name}" with code ${existingSubject.subjectCode}`);
      return existingSubject.subjectCode;
    }
    
    // If not found, generate new code based on total unique codes
    const allSubjects = await db.collection('subjects').find({}).toArray();
    const codes = allSubjects
      .map(s => s.subjectCode ? parseInt(s.subjectCode) : null)
      .filter(code => code !== null && !isNaN(code));
    
    // Return next number as string
    const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
    const newCode = String(maxCode + 1);
    console.log(`Generated new code ${newCode} for subject "${name}"`);
    return newCode;
  } catch (error) {
    console.error('Error generating subject code:', error);
    throw error;
  }
}

async function testSubjects() {
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  try {
    // First get the EE and CO departments
    const departments = await db.collection('departments').find({
      abbreviation: { $in: ['EE', 'CO'] }
    }).toArray();

    const eeDept = departments.find(d => d.abbreviation === 'EE');
    const coDept = departments.find(d => d.abbreviation === 'CO');

    if (!eeDept || !coDept) {
      throw new Error('Could not find EE or CO departments');
    }

    // Test subject data with auto-generated codes
    const testSubjectsData = [
      // Common subjects (Math) - notice same names but will get different codes
      { departmentId: eeDept._id.toString(), name: "Engineering Mathematics I", semester: 1 },
      { departmentId: coDept._id.toString(), name: "Engineering Mathematics I", semester: 1 },
      
      // Department specific subjects
      { departmentId: eeDept._id.toString(), name: "Basic Electrical Engineering", semester: 1 },
      { departmentId: eeDept._id.toString(), name: "Electrical Measurements", semester: 2 },
      
      { departmentId: coDept._id.toString(), name: "Programming Fundamentals", semester: 1 },
      { departmentId: coDept._id.toString(), name: "Data Structures", semester: 2 },
    ];

    // Generate subject codes and insert one by one
    const insertedIds = [];
    for (const data of testSubjectsData) {
      const subjectCode = await getNextSubjectCode(db, data.departmentId, data.name);
      if (!subjectCode) {
        throw new Error(`Failed to generate subject code for ${data.name}`);
      }
      const result = await db.collection('subjects').insertOne({
        ...data,
        name: data.name.trim().toLowerCase(), // Store normalized name
        subjectCode: String(subjectCode),
        createdAt: new Date()
      });
      insertedIds.push(result.insertedId);
    }

    console.log('Created test subjects:', insertedIds.length);

    // Show the created subjects
    const createdSubjects = await db.collection('subjects')
      .find({ _id: { $in: insertedIds } })
      .toArray();

    console.log('\nTest Subjects Created:');
    console.log('---------------------');
    for (const sub of createdSubjects) {
      console.log(`Department: ${departments.find(d => d._id.toString() === sub.departmentId)?.abbreviation}`);
      console.log(`Name: ${sub.name}`);
      console.log(`Subject Code: ${sub.subjectCode}`);
      console.log('---------------------');
    }

    // Ask for confirmation before deleting
    console.log('\nPress Ctrl+C within 10 seconds to keep these test subjects.');
    console.log('Otherwise, they will be automatically deleted.');
    
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Delete the test subjects
    const deleteResult = await db.collection('subjects').deleteMany({
      _id: { $in: insertedIds }
    });

    console.log(`\nDeleted ${deleteResult.deletedCount} test subjects`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testSubjects().catch(console.error);