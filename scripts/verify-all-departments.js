const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'feedbackPortal';

const STUDENT_MAPPING = {
    // CO Department
    '25213070081': { dept: 'CO', year: 'FYCO' },
    '24213070081': { dept: 'CO', year: 'SYCO' },
    '23213070081': { dept: 'CO', year: 'TYCO' },
    
    // EE Department
    '23213070244': { dept: 'EE', year: 'SYEE' },
    '23213070114': { dept: 'EE', year: 'TYEE' },
    
    // CE Department
    '23213070009': { dept: 'CE', year: 'SYCE' },
    '23213070006': { dept: 'CE', year: 'TYCE' },
    
    // ME Department
    '24213070312': { dept: 'ME', year: 'SYME' },
    '2215200219': { dept: 'ME', year: 'TYME' }
};

const EXPECTED_ASSIGNMENTS = {
    'FYCO': 14,
    'SYCO': 6,
    'TYCO': 5,
    'SYEE': 7,
    'TYEE': 6,
    'SYCE': 7,
    'TYCE': 6,
    'SYME': 9,
    'TYME': 5
};

async function main() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    try {
        // 1. Load all departments
        const departments = await db.collection('departments').find({}).toArray();
        const deptMap = new Map(departments.map(d => [d.abbreviation, d]));

        // 2. Load academic years
        const academicYears = await db.collection('academicYears').find({}).toArray();
        console.log('Academic Years:', academicYears.map(y => ({ id: y._id.toString(), name: y.name })));

        const yearMap = new Map();
        academicYears.forEach(year => {
            // Map FY/SY/TY to their respective IDs
            if (year.name.includes('First Year')) {
                ['FYCO', 'FYCE', 'FYEE', 'FYME'].forEach(y => yearMap.set(y, year._id));
            } else if (year.name.includes('Second Year')) {
                ['SYCO', 'SYCE', 'SYEE', 'SYME'].forEach(y => yearMap.set(y, year._id));
            } else if (year.name.includes('Third Year')) {
                ['TYCO', 'TYCE', 'TYEE', 'TYME'].forEach(y => yearMap.set(y, year._id));
            }
        });

        // 3. For each student, verify and fix:
        for (const [prn, info] of Object.entries(STUDENT_MAPPING)) {
            const dept = deptMap.get(info.dept);
            if (!dept) {
                console.error(`Department ${info.dept} not found for student ${prn}`);
                continue;
            }

            const yearId = yearMap.get(info.year);
            if (!yearId) {
                console.error(`Academic year not found for ${info.year} (student ${prn})`);
                continue;
            }

            // Update student record
            const updated = await db.collection('users').updateOne(
                { email: prn },
                { 
                    $set: { 
                        departmentId: dept._id,
                        academicYearId: yearId
                    } 
                }
            );

            // Get assignments for this student's dept and year
            const deptSubjects = await db.collection('departmentSubjects')
                .find({ 
                    departmentId: dept._id,
                    academicYearId: yearId
                }).toArray();

            const assignments = await db.collection('facultyAssignments')
                .find({ 
                    departmentId: dept._id,
                    academicYearId: yearId
                }).toArray();

            const expectedCount = EXPECTED_ASSIGNMENTS[info.year] || 0;

            console.log(`\nStudent ${prn} (${info.dept} - ${info.year}):` + 
                `\n  Student update: ${updated.modifiedCount} modified` +
                `\n  Found ${deptSubjects.length} department subjects` +
                `\n  Found ${assignments.length} assignments` +
                `\n  Expected ${expectedCount} assignments`
            );

            if (assignments.length !== expectedCount) {
                console.log('  ⚠️ Assignment count mismatch!');
            }
        }

        // 4. Print department summary
        for (const [abbr, dept] of deptMap) {
            const subjects = await db.collection('departmentSubjects')
                .find({ departmentId: dept._id }).toArray();

            const assignments = await db.collection('facultyAssignments')
                .find({ departmentId: dept._id }).toArray();

            console.log(`\nDepartment ${abbr}:` +
                `\n  Total subjects mapped: ${subjects.length}` +
                `\n  Total assignments: ${assignments.length}`
            );

            // Group assignments by academic year
            const byYear = assignments.reduce((acc, a) => {
                const yearId = a.academicYearId?.toString();
                if (!acc[yearId]) acc[yearId] = 0;
                acc[yearId]++;
                return acc;
            }, {});

            for (const [yearId, count] of Object.entries(byYear)) {
                const year = academicYears.find(y => y._id.toString() === yearId);
                console.log(`  ${year?.name || yearId}: ${count} assignments`);
            }
        }

    } finally {
        await client.close();
    }
}

main().catch(console.error);