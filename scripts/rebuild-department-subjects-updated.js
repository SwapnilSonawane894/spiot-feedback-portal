const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'feedbackPortal';

// Department-wise subject names exactly as they appear in database
const DEPT_SUBJECTS = {
    CO: {
        'First Year': [
            'Basic Mathematics',
            'Communication Skills (English)',
            'Basic Science   Physics, Chemistry',
            'Fundamentals Of ICT',
            'Engineering Workshop Practice (Computer Group)',
            'Yoga And Meditation',
            'Engineering Graphics (Electronics, Computer And Allied Branches)'
        ],
        'Second Year': [
            'Data Structure Using C',
            'Database Management System',
            'Digital Techniques',
            'Object Oriented Programming Using C++',
            'Computer Graphics',
            'Essence Of Indian Constitution'
        ],
        'Third Year': [
            'Operating System',
            'Software Engineering',
            'Entrepreneurship Development And Startups',
            'Seminar And Project Initiation Course',
            'Advance Computer Network'
        ]
    },
    EE: {
        'Second Year': [
            'Electrical Circuits And Network',
            'Electrical Power Generation,Transmission And Distribution',
            'Electrical And Electronic Measurement',
            'Fundamentals Of Power Electronics',
            'Essence Of Indian Constitution',
            'Electrical Material And Wiring Practice'
        ],
        'Third Year': [
            'A.C. Machines Performance',
            'Switchgear And Protection',
            'Entrepreneurship Development And Startups',
            'Seminar And Project Initiation Course',
            'Electric Vehicle Technology'
        ]
    },
    CE: {
        'Second Year': [
            'Strength Of Materials',
            'Advanced Surveying',
            'Concrete Technology',
            'Highway Engineering',
            'Essence Of Indian Constitution',
            'Building Planning & Drawing With CAD',
            'Construction Management'
        ],
        'Third Year': [
            'Theory Of Structure',
            'Water Resource Engineering',
            'Emerging Trends In Civil Engineering',
            'Road Traffic Engineering',
            'Entrepreneurship Development And Startups',
            'Seminar And Project Initiation Course'
        ]
    },
    ME: {
        'Second Year': [
            'Strength Of Materials',
            'Fluid Mechanics and Machinary',
            'Thermal Engineering',
            'Production Drawing',
            'Basic Electrical and Electronics',
            'Essence Of Indian Constitution',
            'Computer Aided Drafting',
            'Fundamentals of Python Programming'
        ],
        'Third Year': [
            'Emerging Trends in Mechanical Engineering',
            'Power Engineering',
            'Automobile Engineering',
            'Seminar And Project Initiation Course',
            'Power Plant Engineering'
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
        const subjectMap = new Map(subjects.map(s => [s.name, s]));

        // 4. Clear existing department-subject mappings
        await db.collection('departmentSubjects').deleteMany({});
        
        // 5. Create new mappings
        const newMappings = [];
        
        for (const [deptAbbr, yearSubjects] of Object.entries(DEPT_SUBJECTS)) {
            const dept = deptMap.get(deptAbbr);
            if (!dept) {
                console.log(`Department ${deptAbbr} not found`);
                continue;
            }

            for (const [yearName, subjectNames] of Object.entries(yearSubjects)) {
                const yearKey = `${deptAbbr}-${yearName.includes('First') ? 'FY' : 
                                               yearName.includes('Second') ? 'SY' :
                                               yearName.includes('Third') ? 'TY' : ''}`;
                const yearId = yearMap.get(yearKey);
                if (!yearId) {
                    console.log(`Academic year not found for ${yearKey}`);
                    continue;
                }

                for (const subjectName of subjectNames) {
                    const subject = subjectMap.get(subjectName);
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

        // 7. Print results
        console.log('\nDepartment Subject Mappings:');
        for (const [deptAbbr] of Object.entries(DEPT_SUBJECTS)) {
            const dept = deptMap.get(deptAbbr);
            if (!dept) continue;

            const mappings = await db.collection('departmentSubjects')
                .find({ departmentId: dept._id })
                .toArray();

            console.log(`\nDepartment ${deptAbbr}:`);
            
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