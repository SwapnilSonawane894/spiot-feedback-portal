const { MongoClient } = require('mongodb');

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('Please provide MONGODB_URI environment variable');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('feedbackPortal');
        console.log('Using database: feedbackPortal');

        // Department IDs
        const ME_DEPT_ID = "68f6390b641c7bcb2781b39f";
        const CE_DEPT_ID = "68f6390b641c7bcb2781b39e";
        const EE_DEPT_ID = "68f6390b641c7bcb2781b39d";

        // Get academic year using the known ID
        const academicYear = {
            _id: "68f8cdcc1a105584418efad2",
            name: "2025-26"
        };

        // Define subjects for ME
        const meSubjects = [
            { name: "Strength of Material", subjectCode: "313308", semester: 3 },
            { name: "Fluid Mechanics and Machinary", subjectCode: "313309", semester: 3 },
            { name: "Thermal Engineering", subjectCode: "313310", semester: 3 },
            { name: "Production Drawing", subjectCode: "313311", semester: 3 },
            { name: "Basic Electrical and Electronics", subjectCode: "312020", semester: 3 },
            { name: "Essence of Indian Constitution", subjectCode: "313002", semester: 3 },
            { name: "Computer Aided Drafting", subjectCode: "313006", semester: 3 },
            { name: "Fundamentals of Python Programming", subjectCode: "313007", semester: 3 },
            { name: "Emerging Trends in Mechanical Engineering", subjectCode: "315363", semester: 5 },
            { name: "Power Engineering", subjectCode: "315371", semester: 5 },
            { name: "Automobile Engineering", subjectCode: "315372", semester: 5 },
            { name: "Seminar and Project initiation Course", subjectCode: "315003", semester: 5 },
            { name: "Power Plant Engineering", subjectCode: "315374", semester: 5 }
        ];

        // Define subjects for CE
        const ceSubjects = [
            { name: "Strength Of Materials", subjectCode: "313308", semester: 3 },
            { name: "Advanced Surveying", subjectCode: "313321", semester: 3 },
            { name: "Concrete Technology", subjectCode: "313322", semester: 3 },
            { name: "Highway Engineering", subjectCode: "313323", semester: 3 },
            { name: "Essence Of Indian Constitution", subjectCode: "313002", semester: 3 },
            { name: "Building Planning & Drawing With CAD", subjectCode: "313009", semester: 3 },
            { name: "Construction Management", subjectCode: "313010", semester: 3 },
            { name: "Theory Of Structure", subjectCode: "315313", semester: 5 },
            { name: "Water Resource Engineering", subjectCode: "315314", semester: 5 },
            { name: "Emerging Trends In Civil Engineering", subjectCode: "315315", semester: 5 },
            { name: "Road Traffic Engineering", subjectCode: "315318", semester: 5 },
            { name: "Entrepreneurship Development And Startups", subjectCode: "315002", semester: 5 },
            { name: "Seminar And Project Initiation Course", subjectCode: "315003", semester: 5 }
        ];

        // Define missing EE subjects
        const eeSubjects = [
            { name: "Essence Of Indian Constitution", subjectCode: "313002", semester: 3 },
            { name: "Electrical Material And Wiring Practice", subjectCode: "313015", semester: 3 },
            { name: "A.C. Machines Performance", subjectCode: "315333", semester: 5 },
            { name: "Switchgear And Protection", subjectCode: "315334", semester: 5 },
            { name: "Entrepreneurship Development And Startups", subjectCode: "315002", semester: 5 },
            { name: "Seminar And Project Initiation Course", subjectCode: "315003", semester: 5 },
            { name: "Electric Vehicle Technology", subjectCode: "315335", semester: 5 }
        ];

                    async function addSubjectsForDepartment(subjects, departmentId, deptName) {
                console.log(`\nProcessing ${deptName} department...`);
                
                for (const subject of subjects) {
                    try {
                        // Add subject with department ID
                        // Map semester to target year
                const targetYear = subject.semester === 1 ? "FY" : 
                                 subject.semester === 3 ? "SY" :
                                 subject.semester === 5 ? "TY" : "";

                const newSubject = {
                    ...subject,
                    departmentId,
                    targetYear,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                        
                        const result = await db.collection('subjects').insertOne(newSubject);
                        console.log(`Added subject: ${subject.name} (${subject.subjectCode})`);

                        // Create junction record to link subject with department and academic year
                        const junctionRecord = {
                            subjectId: result.insertedId.toString(),
                            departmentId: departmentId,
                            academicYearId: academicYear._id.toString(),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        
                        await db.collection('departmentSubjects').insertOne(junctionRecord);
                        console.log(`Created junction record for ${subject.name}`);
                    } catch (err) {
                    if (err.code === 11000) {
                        console.log(`Subject ${subject.name} already exists, updating target year and creating junction record...`);
                        // Find and update the existing subject
                        const targetYear = subject.semester === 1 ? "FY" : 
                                         subject.semester === 3 ? "SY" :
                                         subject.semester === 5 ? "TY" : "";
                                         
                        const existingSubject = await db.collection('subjects').findOneAndUpdate(
                            { subjectCode: subject.subjectCode },
                            { $set: { targetYear: targetYear } },
                            { returnDocument: 'after' }
                        );                            if (existingSubject) {
                                // Create junction record for existing subject
                                // Check if junction record already exists
                                const existingJunction = await db.collection('departmentSubjects').findOne({
                                    subjectId: existingSubject._id.toString(),
                                    departmentId: departmentId,
                                    academicYearId: academicYear._id.toString()
                                });

                                if (!existingJunction) {
                                    const junctionRecord = {
                                        subjectId: existingSubject._id.toString(),
                                        departmentId: departmentId,
                                        academicYearId: academicYear._id.toString(),
                                        createdAt: new Date(),
                                        updatedAt: new Date()
                                    };
                                    
                                    await db.collection('departmentSubjects').insertOne(junctionRecord);
                                    console.log(`Created junction record for existing subject: ${subject.name}`);
                                } else {
                                    console.log(`Junction record already exists for subject: ${subject.name}`);
                                }
                            }
                        } else {
                            throw err;
                        }
                    }
                }
        }

        // Add subjects for each department
        await addSubjectsForDepartment(meSubjects, ME_DEPT_ID, "Mechanical");
        await addSubjectsForDepartment(ceSubjects, CE_DEPT_ID, "Civil");
        await addSubjectsForDepartment(eeSubjects, EE_DEPT_ID, "Electrical");

        console.log('\nAll subjects and junction records created successfully');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

main();