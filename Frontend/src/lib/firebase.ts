import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize only if config is present to avoid crash in dev if not set up
let app;
let messaging: any = null;

try {
    if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig);
        messaging = getMessaging(app);
    } else {
        console.warn("Firebase config missing. Notifications will not work.");
    }
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

export { messaging };
