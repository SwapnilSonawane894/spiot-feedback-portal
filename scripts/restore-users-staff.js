const { MongoClient } = require('mongodb');

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI environment variable is required');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('spiot-feedback');

        // Load data from backup
        const usersData = require('../../backup/2025-10-26T05-44-40-306Z/users.json');
        const staffData = require('../../backup/2025-10-26T05-44-40-306Z/staff.json');
        
        // Insert users first
        const usersResult = await db.collection('users').insertMany(usersData);
        console.log(`✓ Restored ${usersResult.insertedCount} users`);

        // Insert staff records
        const staffResult = await db.collection('staff').insertMany(staffData);
        console.log(`✓ Restored ${staffResult.insertedCount} staff records`);

        console.log('Restore completed successfully!');
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    } finally {
        await client.close();
    }
}

main().catch(console.error);