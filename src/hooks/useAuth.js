import { useState, useEffect, useCallback } from 'react';
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../services/firebase';
import { DEFAULT_USER_STATS } from '../constants/data';
import logger from '../utils/logger';

/**
 * Required fields that must be present in Firestore user doc
 * for onboarding to be considered complete.
 */
const REQUIRED_ONBOARDING_FIELDS = ['targetExam', 'targetYear', 'name'];

/**
 * Custom hook for Firebase Authentication
 * Handles login, logout, and user session state
 */
export function useAuth() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null); // Extended user data from Firestore
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [loginError, setLoginError] = useState('');

    /**
     * Check whether onboarding is fully complete
     * Prevents dashboard access if required fields are missing
     */
    const isOnboardingComplete = useCallback((data) => {
        if (!data) return false;

        // Institution Validation
        if (data.role === 'institution') {
            return !!(data.name && data.institutionProfile);
        }

        // Student Validation
        return REQUIRED_ONBOARDING_FIELDS.every(field => {
            const value = data[field];
            return value !== undefined && value !== null && value !== '';
        });
    }, []);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setAuthLoading(true);
            if (currentUser) {
                setUser(currentUser);
                setIsAuthenticated(true);

                // Fetch extended user data from Firestore
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        // Only set userData if onboarding is complete
                        // This ensures ProtectedLayout redirects to onboarding
                        if (isOnboardingComplete(data)) {
                            setUserData(data);
                        } else {
                            logger.warn('User onboarding incomplete, missing fields', {
                                uid: currentUser.uid,
                                missingFields: REQUIRED_ONBOARDING_FIELDS.filter(f => !data[f])
                            });
                            setUserData(null);
                        }
                    } else {
                        setUserData(null); // User exists in Auth but not in DB (Needs onboarding)
                    }
                } catch (error) {
                    logger.error("Error fetching user data:", error);
                }
            } else {
                setUser(null);
                setUserData(null);
                setIsAuthenticated(false);
            }
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, [isOnboardingComplete]);

    // Google Sign In
    const handleGoogleLogin = useCallback(async () => {
        setLoginError('');
        setAuthLoading(true);
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            logger.error("Google Sign In Error:", error);
            setLoginError('Failed to sign in with Google. Please try again.');
        } finally {
            setAuthLoading(false);
        }
    }, []);

    // Email Login
    const handleEmailLogin = useCallback(async (email, password) => {
        setLoginError('');
        setAuthLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            logger.error("Login Error:", error);
            setLoginError('Invalid email or password.');
        } finally {
            setAuthLoading(false);
        }
    }, []);

    // Email Signup
    const handleEmailSignup = useCallback(async (name, email, password) => {
        setLoginError('');
        setAuthLoading(true);
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = result.user;

            // Update Auth Profile
            await updateProfile(newUser, { displayName: name });

            // Note: We DO NOT create the Firestore doc here.
            // This ensures the App check (!userData) sends the user to OnboardingView
            // where they can select their Target Exam and Year.

        } catch (error) {
            logger.error("Signup Error:", error);
            if (error.code === 'auth/email-already-in-use') {
                setLoginError('Account already exists. Please Sign In.');
            } else if (error.code === 'auth/weak-password') {
                setLoginError('Password should be at least 6 characters.');
            } else {
                setLoginError('Failed to create account. Try again.');
            }
        } finally {
            setAuthLoading(false);
        }
    }, []);

    // Logout
    const handleLogout = useCallback(async () => {
        try {
            await signOut(auth);
        } catch (error) {
            logger.error("Logout Error:", error);
        }
    }, []);

    // Refresh User Data
    const refreshUser = useCallback(async () => {
        if (auth.currentUser) {
            try {
                const userDocRef = doc(db, 'users', auth.currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (isOnboardingComplete(data)) {
                        setUserData(data);
                    } else {
                        setUserData(null);
                    }
                }
            } catch (error) {
                logger.error("Error refreshing user:", error);
            }
        }
    }, [isOnboardingComplete]);

    return {
        user,
        userData,
        isAuthenticated,
        authLoading,
        loginError,
        isOnboardingComplete,
        handleGoogleLogin,
        handleEmailLogin,
        handleEmailSignup,
        handleLogout,
        refreshUser,
    };
}

export default useAuth;
