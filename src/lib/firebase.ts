import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let db: Firestore;

function initializeFirebase() {
  if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. ' +
        'Please add your Firebase service account key as an environment variable.'
      );
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error) {
      throw new Error(
        'Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. ' +
        'Make sure it contains valid JSON from your Firebase service account.'
      );
    }
  } else {
    app = getApps()[0];
  }

  db = getFirestore(app);
  return { app, db };
}

const { db: firestore } = initializeFirebase();

export { firestore };
export default firestore;
