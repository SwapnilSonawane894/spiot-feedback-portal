const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'feedbackPortal';

// Staff data
const STAFF_DATA = [
    { name: 'Mrs. Bhosale S. S.', email: 'bhosale@gmail.com', dept: 'CO' },
    { name: 'Mrs. Raut D. A', email: 'raut@gmail.com', dept: 'EE' },
    { name: 'MS. Rajwade V. V', email: 'rajwade@gmail.com', dept: 'CO' },
    { name: 'Ms. Wagh S. S.', email: 'wagh@gmail.com', dept: 'CO' },
    { name: 'Mr. Kadam R. C.', email: 'kadam@gmail.com', dept: 'CO' },
    { name: 'Ms. Kamble P. D.', email: 'kamble@gmail.com', dept: 'CO' },
    { name: 'Mr. Hajare S. K.', email: 'hajare@gmail.com', dept: 'CE' },
    { name: 'Mr. Pawar A. N.', email: 'pawar@gmail.com', dept: 'ME' },
    { name: 'Mr. Bhoite M. A.', email: 'bhoite2@gmail.com', dept: 'ME' }
];

async function main() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    try {
        // 1. Get departments
        const departments = await db.collection('departments').find({}).toArray();
        const deptMap = new Map(departments.map(d => [d.abbreviation, d]));

        console.log('Found departments:', departments.map(d => `${d.abbreviation} (${d._id})`));

        // 2. Create or update staff records
        for (const staffData of STAFF_DATA) {
            const dept = deptMap.get(staffData.dept);
            if (!dept) {
                console.log(`Department ${staffData.dept} not found for ${staffData.name}`);
                continue;
            }

            // Check if user exists
            let user = await db.collection('users').findOne({ email: staffData.email });
            
            if (!user) {
                // Create user
                const result = await db.collection('users').insertOne({
                    email: staffData.email,
                    name: staffData.name,
                    role: 'FACULTY',
                    departmentId: dept._id,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                user = { _id: result.insertedId };
                console.log(`Created user for ${staffData.name}`);
            }

            // Check if staff profile exists
            const existingStaff = await db.collection('staff').findOne({ userId: user._id });

            if (!existingStaff) {
                // Create staff profile
                await db.collection('staff').insertOne({
                    userId: user._id,
                    departmentId: dept._id,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                console.log(`Created staff profile for ${staffData.name}`);
            } else {
                // Update existing staff profile
                await db.collection('staff').updateOne(
                    { _id: existingStaff._id },
                    { 
                        $set: { 
                            departmentId: dept._id,
                            updatedAt: new Date()
                        } 
                    }
                );
                console.log(`Updated staff profile for ${staffData.name}`);
            }
        }

        // 3. Verify staff records
        console.log('\nStaff Records by Department:');
        for (const [deptAbbr, dept] of deptMap) {
            const staff = await db.collection('staff')
                .find({ departmentId: dept._id })
                .toArray();

            const staffUsers = await db.collection('users')
                .find({ _id: { $in: staff.map(s => s.userId) } })
                .toArray();

            console.log(`\nDepartment ${deptAbbr}:`);
            for (const user of staffUsers) {
                console.log(`  - ${user.name} (${user.email})`);
            }
        }

    } finally {
        await client.close();
    }
}

main().catch(console.error);