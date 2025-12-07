import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  UserCredential,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';

interface WaiterProfile {
  uid: string;
  email: string;
  name: string;
  restaurant: string;
  hederaId: string;
  baseAddress?: string;
  bio?: string;
  photoURL?: string;
  createdAt: any;
  updatedAt: any;
  isActive: boolean;
  qrCodeUrl: string;
}

interface AuthContextType {
  user: User | null;
  profile: WaiterProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (
    email: string,
    password: string,
    profileData: {
      name: string;
      restaurant: string;
      hederaId: string;
      baseAddress?: string;
    }
  ) => Promise<UserCredential>;
  registerWithGoogle: (profileData: {
    name: string;
    restaurant: string;
    hederaId: string;
    baseAddress?: string;
  }) => Promise<void>;
  completeGoogleProfile: (profileData: {
    name: string;
    restaurant: string;
    hederaId: string;
    baseAddress?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (updates: Partial<WaiterProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
  firebaseAuth: Auth | null;
  firebaseDb: Firestore | null;
  googleProvider: GoogleAuthProvider | null;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, firebaseAuth, firebaseDb, googleProvider }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<WaiterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load waiter profile from Firestore with retry logic
  const loadProfile = useCallback(async (uid: string, retries = 3): Promise<void> => {
    if (!firebaseDb) {
      console.warn('Firestore not initialized');
      return;
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const profileRef = doc(firebaseDb, 'waiters', uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          setProfile({ uid, ...profileSnap.data() } as WaiterProfile);
          return; // Success - exit
        } else {
          if (attempt < retries) {
            console.log(`Profile not found, retrying... (${retries - attempt} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          } else {
            console.warn('Profile not found for user after retries:', uid);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        if (attempt >= retries) {
          setProfile(null);
        }
      }
    }
  }, [firebaseDb]);

  // Listen to auth state changes
  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      setUser(user);

      if (user) {
        await loadProfile(user.uid);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [firebaseAuth, loadProfile]);

  // Login
  const login = async (email: string, password: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login');
      throw err;
    }
  };

  // Login with Google
  const loginWithGoogle = async () => {
    try {
      setError(null);

      if (!firebaseAuth || !googleProvider) {
        throw new Error('Firebase Auth or Google Provider not initialized');
      }

      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const { uid } = result.user;

      // Check if profile exists
      if (firebaseDb) {
        const profileRef = doc(firebaseDb, 'waiters', uid);
        const profileSnap = await getDoc(profileRef);

        if (!profileSnap.exists()) {
          // New user - profile doesn't exist yet
          // Sign out and throw error to redirect to registration
          await signOut(firebaseAuth);
          throw new Error('PROFILE_NOT_FOUND');
        }
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Failed to login with Google');
      throw err;
    }
  };

  // Register
  const register = async (
    email: string,
    password: string,
    profileData: {
      name: string;
      restaurant: string;
      hederaId: string;
      baseAddress?: string;
    }
  ) => {
    try {
      setError(null);

      if (!firebaseAuth || !firebaseDb) {
        throw new Error('Firebase not initialized');
      }

      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        firebaseAuth,
        email,
        password
      );

      const { uid } = userCredential.user;

      // Update display name
      await updateProfile(userCredential.user, {
        displayName: profileData.name
      });

      // Create QR code URL
      const qrCodeUrl = `${window.location.origin}${window.location.pathname}?waiter=${uid}`;

      // Create Firestore profile
      const waiterProfile: Partial<WaiterProfile> = {
        uid,
        email,
        name: profileData.name,
        restaurant: profileData.restaurant,
        hederaId: profileData.hederaId,
        baseAddress: profileData.baseAddress || '',
        bio: '',
        photoURL: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        qrCodeUrl
      };

      await setDoc(doc(firebaseDb, 'waiters', uid), waiterProfile);

      // Manually load the profile to ensure it's in state
      await loadProfile(uid);

      // Send verification email
      await sendEmailVerification(userCredential.user);

      console.log('Registration successful. Verification email sent.');

      return userCredential;
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to register');
      throw err;
    }
  };

  // Register with Google
  const registerWithGoogle = async (profileData: {
    name: string;
    restaurant: string;
    hederaId: string;
    baseAddress?: string;
  }) => {
    try {
      setError(null);

      if (!firebaseAuth || !googleProvider || !firebaseDb) {
        throw new Error('Firebase not initialized');
      }

      // Sign in with Google
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const { uid, email, displayName, photoURL } = result.user;

      if (!email) {
        throw new Error('No email found in Google account');
      }

      // Check if profile already exists
      const profileRef = doc(firebaseDb, 'waiters', uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        // Profile already exists - just load it
        await loadProfile(uid);
        return;
      }

      // Create QR code URL
      const qrCodeUrl = `${window.location.origin}${window.location.pathname}?waiter=${uid}`;

      // Create Firestore profile
      const waiterProfile: Partial<WaiterProfile> = {
        uid,
        email,
        name: profileData.name || displayName || 'Unknown',
        restaurant: profileData.restaurant,
        hederaId: profileData.hederaId,
        baseAddress: profileData.baseAddress || '',
        bio: '',
        photoURL: photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        qrCodeUrl
      };

      await setDoc(doc(firebaseDb, 'waiters', uid), waiterProfile);

      // Load the profile
      await loadProfile(uid);

      console.log('Google registration successful');
    } catch (err: any) {
      console.error('Google registration error:', err);
      setError(err.message || 'Failed to register with Google');
      throw err;
    }
  };

  // Complete Google profile (user already authenticated)
  const completeGoogleProfile = async (profileData: {
    name: string;
    restaurant: string;
    hederaId: string;
    baseAddress?: string;
  }) => {
    try {
      setError(null);

      if (!firebaseAuth || !firebaseDb) {
        throw new Error('Firebase not initialized');
      }

      // Get current user (already authenticated)
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      const { uid, email, displayName, photoURL } = currentUser;

      if (!email) {
        throw new Error('No email found in user account');
      }

      // Check if profile already exists
      const profileRef = doc(firebaseDb, 'waiters', uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        // Profile already exists - just load it
        await loadProfile(uid);
        return;
      }

      // Create QR code URL
      const qrCodeUrl = `${window.location.origin}${window.location.pathname}?waiter=${uid}`;

      // Create Firestore profile
      const waiterProfile: Partial<WaiterProfile> = {
        uid,
        email,
        name: profileData.name || displayName || 'Unknown',
        restaurant: profileData.restaurant,
        hederaId: profileData.hederaId,
        baseAddress: profileData.baseAddress || '',
        bio: '',
        photoURL: photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        qrCodeUrl
      };

      await setDoc(doc(firebaseDb, 'waiters', uid), waiterProfile);

      // Load the profile
      await loadProfile(uid);

      console.log('Google profile completion successful');
    } catch (err: any) {
      console.error('Complete Google profile error:', err);
      setError(err.message || 'Failed to complete Google profile');
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    try {
      setError(null);
      await signOut(firebaseAuth);
      setProfile(null);
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(err.message || 'Failed to logout');
      throw err;
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(firebaseAuth, email);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send reset email');
      throw err;
    }
  };

  // Update profile
  const updateUserProfile = async (updates: Partial<WaiterProfile>) => {
    try {
      setError(null);

      if (!user || !firebaseDb) {
        throw new Error('Not authenticated or Firestore not initialized');
      }

      const profileRef = doc(firebaseDb, 'waiters', user.uid);
      await updateDoc(profileRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      // Reload profile
      await loadProfile(user.uid);
    } catch (err: any) {
      console.error('Profile update error:', err);
      setError(err.message || 'Failed to update profile');
      throw err;
    }
  };

  // Refresh profile manually
  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.uid);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    error,
    login,
    loginWithGoogle,
    register,
    registerWithGoogle,
    completeGoogleProfile,
    logout,
    resetPassword,
    updateUserProfile,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
