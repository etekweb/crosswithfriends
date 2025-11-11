import {initializeApp, getApps, type FirebaseApp} from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  off,
  serverTimestamp,
  type Database,
  type DatabaseReference,
} from 'firebase/database';

const offline = false;
const CONFIGS: Record<
  string,
  {
    apiKey: string;
    authDomain: string;
    databaseURL: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId?: string;
  }
> = {
  production: {
    apiKey: 'AIzaSyCe4BWm9kbjXFwlZcmq4x8DvLD3TDoinhA',
    authDomain: 'crosswordsio.firebaseapp.com',
    databaseURL: 'https://crosswordsio.firebaseio.com',
    projectId: 'crosswordsio',
    storageBucket: 'crosswordsio.appspot.com',
    messagingSenderId: '1021412055058',
  },
  development: {
    apiKey: 'AIzaSyC4Er27aLKgSK4u2Z8aRfD6mr8AvLPA8tA',
    authDomain: 'dfac-fa059.firebaseapp.com',
    databaseURL: 'https://dfac-fa059.firebaseio.com',
    projectId: 'dfac-fa059',
    storageBucket: 'dfac-fa059.appspot.com',
    messagingSenderId: '132564774895',
    appId: '1:132564774895:web:a3bf48cd38c4df81e8901a',
  },
};
const env = (import.meta.env.VITE_ENV || import.meta.env.MODE) as string;
const config = CONFIGS[env] || CONFIGS.development;

// Initialize Firebase app if not already initialized
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(config);
} else {
  app = getApps()[0];
}

const db = getDatabase(app);

const SERVER_TIME = serverTimestamp();

// Get server time offset - use onValue for better connection handling
// This will wait for the connection to be established before reading
let offset = 0;
let offsetListener: (() => void) | null = null;

try {
  const offsetRef = ref(db, '.info/serverTimeOffset');
  // Use onValue instead of get for better connection handling
  // It will wait for connection and handle errors more gracefully
  offsetListener = onValue(offsetRef, (snapshot) => {
    try {
      const val = snapshot.val();
      if (val !== null && val !== undefined && typeof val === 'number') {
        offset = val;
      }
    } catch (error) {
      // Silently handle error - server time offset is not critical
      offset = 0;
    }
    // Unsubscribe after first successful read
    if (offsetListener) {
      off(offsetRef, 'value', offsetListener);
      offsetListener = null;
    }
  });
} catch (error) {
  // Handle initialization error gracefully - server time offset is not critical
  // Using local time is acceptable fallback
  offset = 0;
}

function getTime(): number {
  return new Date().getTime() + offset;
}

export {db, SERVER_TIME};
export {offline, getTime};
export type {Database, DatabaseReference};
export default app;
