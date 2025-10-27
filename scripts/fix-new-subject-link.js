const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || "feedbackPortal";

async function fixLink() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    const subject = await db.collection('subjects').findOne({ subjectCode: '888888' });
    if (!subject) {
      console.log('Subject 888888 not found');
      return;
    }

    const subjectId = subject._id.toString();
    const badLinks = await db.collection('departmentSubjects').find({ subjectId, departmentId: 'undefined' }).toArray();
    console.log('Found bad links count:', badLinks.length);
    for (const bl of badLinks) {
      console.log('Updating link:', bl._id.toString());
      const res = await db.collection('departmentSubjects').updateOne({ _id: bl._id }, { $set: { departmentId: subject.departmentId } });
      console.log('ModifiedCount:', res.modifiedCount);
    }

    const coDeptId = '68f6390b641c7bcb2781b39c';
    const nowLinks = await db.collection('departmentSubjects').find({ departmentId: coDeptId, subjectId }).toArray();
    console.log('Now CO links for subject:', nowLinks.length);
    console.log(JSON.stringify(nowLinks, null, 2));

  } finally {
    await client.close();
  }
}

fixLink().catch(err => {
  console.error('Error running fixer:', err);
  process.exit(1);
});
