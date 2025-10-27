const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://swapnilsonawane:TVDFjnMt9C97ieJO@cluster0.wqnku0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function analyzeDatabase() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");
    
    const db = client.db('feedbackPortal'); // Get default database
    const collections = await db.listCollections().toArray();
    
    console.log("\n=== DATABASE STRUCTURE ANALYSIS ===\n");
    console.log(`Database Name: ${db.databaseName}`);
    console.log(`Total Collections: ${collections.length}\n`);
    
    // Analyze each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      
      console.log(`\n--- Collection: ${collectionName} ---`);
      
      // Get document count
      const count = await collection.countDocuments();
      console.log(`Document Count: ${count}`);
      
      // Get sample document to understand schema
      const sampleDoc = await collection.findOne();
      if (sampleDoc) {
        console.log("\nSample Document Structure:");
        console.log(JSON.stringify(sampleDoc, null, 2));
        
        // Analyze fields and potential foreign keys
        console.log("\nField Analysis:");
        analyzeFields(sampleDoc, "");
      }
      
      // Get indexes to understand relationships and constraints
      const indexes = await collection.indexes();
      console.log("\nIndexes:");
      indexes.forEach(index => {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        if (index.unique) console.log(`    UNIQUE CONSTRAINT`);
      });
      
      console.log("\n" + "=".repeat(60));
    }
    
    // Analyze relationships between collections
    console.log("\n\n=== RELATIONSHIP ANALYSIS ===\n");
    await analyzeRelationships(db, collections);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

function analyzeFields(obj, prefix) {
  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    const type = Array.isArray(value) ? 'Array' : typeof value;
    
    console.log(`  ${fieldPath}: ${type}`);
    
    // Check if field might be a foreign key reference
    if (key.toLowerCase().includes('id') && key !== '_id') {
      console.log(`    ⚠️  Potential Foreign Key Reference`);
    }
    
    if (key.toLowerCase().includes('ref') || key.toLowerCase().includes('department') || key.toLowerCase().includes('subject')) {
      console.log(`    ⚠️  Potential Relationship Field`);
    }
    
    // Recursively analyze nested objects (but not too deep)
    if (type === 'object' && value !== null && !value._bsontype && prefix.split('.').length < 2) {
      analyzeFields(value, fieldPath);
    }
  }
}

async function analyzeRelationships(db, collections) {
  const collectionNames = collections.map(c => c.name);
  
  for (const collectionName of collectionNames) {
    const collection = db.collection(collectionName);
    const sampleDoc = await collection.findOne();
    
    if (!sampleDoc) continue;
    
    console.log(`\n${collectionName} relationships:`);
    
    // Look for potential foreign key fields
    const foreignKeyFields = findForeignKeyFields(sampleDoc);
    
    if (foreignKeyFields.length > 0) {
      for (const field of foreignKeyFields) {
        console.log(`  - ${field.path} → Likely references another collection`);
        
        // Try to guess which collection it references
        const referencedCollection = guessReferencedCollection(field.path, collectionNames);
        if (referencedCollection) {
          console.log(`    Probable target: ${referencedCollection}`);
        }
      }
    } else {
      console.log(`  No obvious foreign key relationships detected`);
    }
  }
}

function findForeignKeyFields(obj, prefix = "", fields = []) {
  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    
    // Check for common foreign key patterns
    if (key.toLowerCase().includes('id') && key !== '_id' && key !== 'id') {
      fields.push({ path: fieldPath, value: value });
    }
    
    if (key.toLowerCase().includes('ref') && typeof value === 'string') {
      fields.push({ path: fieldPath, value: value });
    }
    
    // Check for arrays of IDs
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      if (key.toLowerCase().includes('id') || key.toLowerCase().includes('ref')) {
        fields.push({ path: fieldPath, value: value });
      }
    }
    
    // Recursively check nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && !value._bsontype) {
      findForeignKeyFields(value, fieldPath, fields);
    }
  }
  
  return fields;
}

function guessReferencedCollection(fieldPath, collectionNames) {
  const fieldLower = fieldPath.toLowerCase();
  
  for (const collectionName of collectionNames) {
    const collectionLower = collectionName.toLowerCase();
    
    // Check if field name contains collection name
    if (fieldLower.includes(collectionLower.replace(/s$/, ''))) {
      return collectionName;
    }
    
    // Check common patterns
    if (fieldLower.includes('department') && collectionLower.includes('department')) {
      return collectionName;
    }
    if (fieldLower.includes('subject') && collectionLower.includes('subject')) {
      return collectionName;
    }
    if (fieldLower.includes('faculty') && collectionLower.includes('faculty')) {
      return collectionName;
    }
    if (fieldLower.includes('user') && collectionLower.includes('user')) {
      return collectionName;
    }
  }
  
  return null;
}

// Run the analysis
analyzeDatabase();
