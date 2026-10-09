import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail
} from 'firebase/auth';

// Read Firebase Web Client Configuration from Vite environment variables
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'safesphere-app',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey && 
    !firebaseConfig.apiKey.includes('your_') && 
    firebaseConfig.apiKey.length > 10
  );
};

// Initialize Firebase App instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Mock storage for local development/offline testing if real Firebase API key is not configured
const MOCK_STORAGE_KEY = 'safesphere_mock_session';

export interface AuthSession {
  uid: string;
  email: string;
  displayName?: string;
  token: string;
}

export const getStoredDevSession = (): AuthSession | null => {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredDevSession = (session: AuthSession | null) => {
  if (session) {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem('safesphere_auth_token', session.token);
  } else {
    localStorage.removeItem(MOCK_STORAGE_KEY);
    localStorage.removeItem('safesphere_auth_token');
  }
};

/**
 * Signs up a new user via Firebase Authentication, with automatic fallback for dev/demo mode.
 */
export const registerWithFirebaseAuth = async (email: string, password: string): Promise<string> => {
  if (isFirebaseConfigured()) {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const token = await userCred.user.getIdToken();
      localStorage.setItem('safesphere_auth_token', token);
      return userCred.user.uid;
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        // Safe recovery: If Firebase account already exists (e.g. from a prior step where profile
        // creation failed or was interrupted), sign in with credentials to obtain the ID token and UID
        try {
          const userCred = await signInWithEmailAndPassword(auth, email, password);
          const token = await userCred.user.getIdToken();
          localStorage.setItem('safesphere_auth_token', token);
          return userCred.user.uid;
        } catch {
          // If sign-in fails (e.g., incorrect password), propagate the original email-already-in-use error
          throw err;
        }
      }
      throw err;
    }
  } else {
    // Development / Hackathon Mock Auth Mode
    const mockUid = 'uid_' + Math.abs(hashCode(email));
    const mockToken = `dev-token-${mockUid}`;
    setStoredDevSession({
      uid: mockUid,
      email,
      token: mockToken,
    });
    return mockUid;
  }
};

/**
 * Signs in an existing user with Firebase Authentication.
 */
export const loginWithFirebaseAuth = async (email: string, password: string): Promise<{ uid: string; token: string }> => {
  if (isFirebaseConfigured()) {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCred.user.getIdToken();
    localStorage.setItem('safesphere_auth_token', token);
    return { uid: userCred.user.uid, token };
  } else {
    // Development / Hackathon Mock Auth Mode
    const mockUid = 'uid_' + Math.abs(hashCode(email));
    const mockToken = `dev-token-${mockUid}`;
    setStoredDevSession({
      uid: mockUid,
      email,
      token: mockToken,
    });
    return { uid: mockUid, token: mockToken };
  }
};

/**
 * Logs out the active user session.
 */
export const logoutFromFirebaseAuth = async (): Promise<void> => {
  if (isFirebaseConfigured()) {
    await signOut(auth);
  }
  setStoredDevSession(null);
};

/**
 * Dispatches password reset email.
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  if (isFirebaseConfigured()) {
    await sendPasswordResetEmail(auth, email);
  } else {
    // Mock simulation
    console.info(`[SafeSphere Mock Auth] Password reset link simulated for: ${email}`);
  }
};

// Simple deterministic hash for mock development UIDs
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}
