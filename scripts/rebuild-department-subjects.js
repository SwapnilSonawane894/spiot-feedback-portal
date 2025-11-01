const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'feedbackPortal';

// Department-wise subject allocation with academic years
const DEPT_SUBJECTS = {
    CO: {
        'First Year': [
            'Basic Mathematics',
            'Fundamentals Of ICT',
            'Communication Skills (English)',
            'Basic Workshop',
            'Basic Science'
        ],
        'Second Year': [
            'Data Structure Using C',
            'Object Oriented Programming Using C++',
            'Database Management System',
            'Computer Graphics',
            'Digital Techniques',
            'Computer Networks'
        ],
        'Third Year': [
            'Operating System',
            'Software Engineering',
            'Advance Computer Network',
            'Web Development',
            'IoT And Applications'
        ]
    },
    ME: {
        'Second Year': [
            'Thermal Engineering',
            'Strength of Materials',
            'Engineering Mathematics',
            'Machine Design',
            'Manufacturing Process',
            'Industrial Management',
            'Engineering Drawing',
            'Workshop Practice',
            'Professional Communication'
        ],
        'Third Year': [
            'Machine Tools',
            'Heat Transfer',
            'Industrial Engineering',
            'CAD/CAM',
            'Metrology'
        ]
    }
};

async function main() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    try {
        // 1. Get all departments
        const departments = await db.collection('departments').find({}).toArray();
        const deptMap = new Map(departments.map(d => [d.abbreviation, d]));

        // 2. Get academic years
        const academicYears = await db.collection('academicYears').find({}).toArray();
        const yearMap = new Map();
        academicYears.forEach(y => {
            const deptAbbr = y.name.includes('Computer') ? 'CO' :
                           y.name.includes('Mechanical') ? 'ME' :
                           y.name.includes('Electrical') ? 'EE' :
                           y.name.includes('Civil') ? 'CE' : null;
            
            if (deptAbbr) {
                const key = `${deptAbbr}-${y.name.includes('First') ? 'FY' : 
                                         y.name.includes('Second') ? 'SY' :
                                         y.name.includes('Third') ? 'TY' : ''}`;
                yearMap.set(key, y._id);
            }
        });

        // 3. Get all subjects
        const subjects = await db.collection('subjects').find({}).toArray();

        // 4. Clear existing department-subject mappings
        await db.collection('departmentSubjects').deleteMany({});
        
        // 5. Create new mappings
        const newMappings = [];
        
        for (const [deptAbbr, yearSubjects] of Object.entries(DEPT_SUBJECTS)) {
            const dept = deptMap.get(deptAbbr);
            if (!dept) continue;

            for (const [yearName, subjectNames] of Object.entries(yearSubjects)) {
                const yearKey = `${deptAbbr}-${yearName.includes('First') ? 'FY' : 
                                               yearName.includes('Second') ? 'SY' :
                                               yearName.includes('Third') ? 'TY' : ''}`;
                const yearId = yearMap.get(yearKey);
                if (!yearId) continue;

                for (const subjectName of subjectNames) {
                    const subject = subjects.find(s => s.name === subjectName);
                    if (!subject) {
                        console.warn(`Subject not found: ${subjectName}`);
                        continue;
                    }

                    newMappings.push({
                        departmentId: dept._id,
                        subjectId: subject._id,
                        academicYearId: yearId,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                }
            }
        }

        // 6. Insert new mappings
        if (newMappings.length > 0) {
            const result = await db.collection('departmentSubjects').insertMany(newMappings);
            console.log(`Created ${result.insertedCount} department-subject mappings`);
        }

        // 7. Verify results
        for (const [deptAbbr] of Object.entries(DEPT_SUBJECTS)) {
            const dept = deptMap.get(deptAbbr);
            if (!dept) continue;

            const mappings = await db.collection('departmentSubjects')
                .find({ departmentId: dept._id })
                .toArray();

            const assignments = await db.collection('facultyAssignments')
                .find({ departmentId: dept._id })
                .toArray();

            console.log(`\nDepartment ${deptAbbr}:`);
            console.log(`  Subjects mapped: ${mappings.length}`);
            console.log(`  Assignments: ${assignments.length}`);

            // Group by academic year
            const byYear = mappings.reduce((acc, m) => {
                const yearId = m.academicYearId.toString();
                if (!acc[yearId]) acc[yearId] = 0;
                acc[yearId]++;
                return acc;
            }, {});

            for (const [yearId, count] of Object.entries(byYear)) {
                const year = academicYears.find(y => y._id.toString() === yearId);
                console.log(`  ${year?.name}: ${count} subjects`);
            }
        }

    } finally {
        await client.close();
    }
}

main().catch(console.error);