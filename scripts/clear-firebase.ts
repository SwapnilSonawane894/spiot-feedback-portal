import { firestore } from '../src/lib/firebase';

const COLLECTIONS = [
  'users',
  'departments',
  'staff',
  'academicYears',
  'subjects',
  'facultyAssignments',
  'feedback',
  'hodSuggestions',
  'accounts',
  'sessions',
];

async function clearCollection(collectionName: string) {
  try {
    const batch = firestore.batch();
    const snapshot = await firestore.collection(collectionName).get();
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`✓ Cleared ${collectionName} (${snapshot.size} documents deleted)`);
    return snapshot.size;
  } catch (error) {
    console.error(`✗ Error clearing ${collectionName}:`, error);
    return 0;
  }
}

async function clearAllCollections() {
  console.log('🗑️  CLEARING ENTIRE FIREBASE DATABASE...\n');
  
  let totalDeleted = 0;
  
  for (const collection of COLLECTIONS) {
    const count = await clearCollection(collection);
    totalDeleted += count;
  }
  
  console.log(`\n✅ Total documents deleted: ${totalDeleted}`);
  console.log('✨ Database is now empty!\n');
}

clearAllCollections()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
