import { getApps, initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Increase max listeners to prevent warning
require('events').EventEmitter.defaultMaxListeners = 15;

function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    try {
      // Get the storage bucket name without the 'gs://' prefix
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET?.replace('gs://', '');
      
      if (!bucketName) {
        throw new Error('FIREBASE_STORAGE_BUCKET is not set');
      }

      const serviceAccount: ServiceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };

      // Initialize the app with the correct bucket name
      const app = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: bucketName // Use the cleaned bucket name
      });

      console.log('Firebase Admin initialized with bucket:', bucketName);
      return app;
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
      throw error;
    }
  }
  return getApps()[0];
}

const app = initializeFirebaseAdmin();
export const adminDb = getFirestore(app);
export const adminStorage = getStorage(app);

// Add error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection in Firebase Admin:', error);
}); 