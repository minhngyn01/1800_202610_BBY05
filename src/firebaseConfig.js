/**
 * firebaseConfig.js
 *
 * Reads Firebase credentials from Vite environment variables (.env)
 * and exports a single config object used by all other modules.
 *
 * All variables must be prefixed with VITE_ in the .env file so Vite
 * exposes them to client-side code via import.meta.env.
 */

export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGEBUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};
