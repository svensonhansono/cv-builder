"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserSubscription } from '@/types/cv';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  subscription: UserSubscription | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isPremium: () => boolean;
  isInTrial: () => boolean;
  getTrialDaysRemaining: () => number;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const router = useRouter();

  // Load subscription from Firestore
  const loadSubscription = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setSubscription(data.subscription || { tier: 'free' });
      } else {
        // Create default free subscription for new users
        const defaultSubscription: UserSubscription = { tier: 'free' };
        await setDoc(doc(db, 'users', userId), { subscription: defaultSubscription });
        setSubscription(defaultSubscription);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
      setSubscription({ tier: 'free' });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await loadSubscription(user.uid);
      } else {
        setSubscription(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const register = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Configure email verification with redirect URL
      const actionCodeSettings = {
        url: `${window.location.origin}/login?verified=true`,
        handleCodeInApp: false,
      };

      await sendEmailVerification(userCredential.user, actionCodeSettings);
      await signOut(auth);
      // User bleibt ausgeloggt bis Email verifiziert ist
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Fehler bei der Registrierung');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Email verification is optional - users can access during trial without verification
      router.push('/dashboard');
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Fehler beim Login');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Fehler beim Logout');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Fehler beim Zurücksetzen des Passworts');
    }
  };

  const isPremium = () => {
    return subscription?.tier === 'premium' &&
           (subscription?.status === 'trialing' || subscription?.status === 'active');
  };

  const isInTrial = () => {
    return subscription?.status === 'trialing';
  };

  const getTrialDaysRemaining = () => {
    if (!subscription?.trialEndDate) return 0;
    const end = new Date(subscription.trialEndDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const value = {
    user,
    loading,
    subscription,
    login,
    register,
    logout,
    resetPassword,
    isPremium,
    isInTrial,
    getTrialDaysRemaining,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
