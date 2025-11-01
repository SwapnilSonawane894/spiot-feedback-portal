const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'feedbackPortal';

async function main() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    try {
        // Get all subjects
        const subjects = await db.collection('subjects').find({}).toArray();
        
        // Get academic years for reference
        const academicYears = await db.collection('academicYears').find({}).toArray();
        const yearMap = new Map(academicYears.map(y => [y._id.toString(), y]));

        // Group subjects by academic year
        const subjectsByYear = {};
        
        for (const subject of subjects) {
            const yearId = subject.academicYearId?.toString();
            const yearInfo = yearMap.get(yearId);
            const yearKey = yearInfo ? yearInfo.name : 'Unknown Year';
            
            if (!subjectsByYear[yearKey]) {
                subjectsByYear[yearKey] = [];
            }
            
            subjectsByYear[yearKey].push({
                id: subject._id.toString(),
                name: subject.name,
                subjectCode: subject.subjectCode,
                departmentId: subject.departmentId?.toString()
            });
        }

        // Print subjects grouped by year
        console.log('=== All Subjects in Database ===\n');
        
        for (const [year, subjectList] of Object.entries(subjectsByYear)) {
            console.log(`\n${year}:`);
            console.log('----------------------------------------');
            for (const subject of subjectList) {
                console.log(`${subject.name} (${subject.subjectCode})`);
                console.log(`ID: ${subject.id}`);
                console.log('----------------------------------------');
            }
        }

    } finally {
        await client.close();
    }
}

main().catch(console.error);