import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Wallet,
  User,
  Share2,
  Zap,
  Coins,
  ArrowLeft,
  Download,
  Link as LinkIcon
} from 'lucide-react';
import QRCode from 'react-qr-code';
import {
  collection,
  addDoc,
  getDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { useHederaWallet, type ReviewData } from './HederaWalletContext';
import { useAuth } from './contexts/AuthContext';
import { db, auth, googleProvider } from './firebase';
import { StarRating } from './components/StarRating';
import { ReviewList } from './components/ReviewList';
import { WaiterRatingCard } from './components/WaiterRatingCard';
import { useWaiterRating } from './hooks/useWaiterRating';
import { submitReviewToHCS, getReviewHashScanUrl } from './lib/hcsReviewService';
import { SparklesCore } from './components/ui/sparkles';
import { Confetti, type ConfettiRef } from './components/ui/confetti';
import confetti from 'canvas-confetti';

// --- CONSTANTS ---
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'ez-crypto-tips';

// Brand Colors
const HEDERA_GREEN = "#00eb78";
const BASE_BLUE = "#0052FF";
const BRAND_BLACK = "#181818"; 

// --- TYPES ---
type WaiterProfile = {
  id?: string;
  name: string;
  restaurant: string;
  hederaId: string; // Hedera Account ID
  baseAddress?: string; // USDT Base (EVM)
  bio?: string;
};

type TokenOption = {
  id: string;
  name: string;
  network: string;
  symbol: string;
  color: string;
  addressKey: keyof WaiterProfile;
  disabled?: boolean;
  comingSoon?: boolean;
  tokenId?: string; // Hedera Token ID for HTS tokens (e.g., USDC)
  decimals?: number; // Token decimals (HBAR=8, USDC=6)
};

const AVAILABLE_TOKENS: TokenOption[] = [
  {
    id: 'hbar',
    name: 'Hedera',
    network: 'Hedera',
    symbol: 'HBAR',
    color: HEDERA_GREEN,
    addressKey: 'hederaId',
    decimals: 8 // HBAR has 8 decimals (1 HBAR = 100,000,000 tinybar)
  },
  {
    id: 'usdc_hedera',
    name: 'Hedera',
    network: 'Hedera',
    symbol: 'USDC',
    color: '#2775CA', // USDC blue
    addressKey: 'hederaId',
    tokenId: '0.0.456858', // USDC on Hedera testnet (placeholder - update with real token ID)
    decimals: 6 // USDC has 6 decimals
  },
  {
    id: 'usdt_base',
    name: 'Base',
    network: 'Base',
    symbol: 'USDT',
    color: BASE_BLUE,
    addressKey: 'baseAddress',
    disabled: true,
    comingSoon: true
  },
];

// --- MOCK DATA FOR PREVIEW ---
const MOCK_WAITER: WaiterProfile = {
  id: 'demo-waiter',
  name: 'Alex',
  restaurant: 'Burger Heroes',
  hederaId: '0.0.451923',
  baseAddress: '0x71C...9A21',
  bio: 'Saving for my own food truck! 🍔'
};

export default function App() {
  // Auth Hook
  const { user, profile, login, loginWithGoogle, register, registerWithGoogle, logout, loading: authLoading, updateUserProfile } = useAuth();

  // Hedera Wallet Hook
  const {
    accountId: hederaAccountId,
    isConnected: isHederaConnected,
    isConnecting: isHederaConnecting,
    connectWallet: connectHederaWallet,
    disconnectWallet: disconnectHederaWallet,
    sendHbarTransfer,
    sendTipViaContract,
    submitReview,
    error: hederaError
  } = useHederaWallet();

  // State
  const [view, setView] = useState<'landing' | 'register' | 'login' | 'dashboard' | 'qr' | 'pay' | 'success' | 'edit-profile' | 'google-profile'>('landing');
  const [waiterData, setWaiterData] = useState<WaiterProfile | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [review, setReview] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenOption>(AVAILABLE_TOKENS[0]);
  const [transactionId, setTransactionId] = useState<string>('');
  const [coverFee, setCoverFee] = useState<boolean>(false);
  const [googleUserData, setGoogleUserData] = useState<{uid: string; email: string; displayName: string | null; photoURL: string | null} | null>(null);

  // Rating hooks - called at top level to comply with React Hooks rules
  const { averageRating: dashboardRating, totalReviews: dashboardTotalReviews, totalRatings: dashboardTotalRatings, isLoading: dashboardRatingLoading } = useWaiterRating(user?.uid);
  const { averageRating: paymentRating, totalRatings: paymentTotalRatings, isLoading: paymentRatingLoading } = useWaiterRating(waiterData?.id);

  // Confetti effect for success view
  useEffect(() => {
    if (view === 'success') {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

      const randomInRange = (min: number, max: number) =>
        Math.random() * (max - min) + min;

      const interval = window.setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#00eb78', '#0052FF', '#FFD700', '#FF69B4', '#00FFFF'],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#00eb78', '#0052FF', '#FFD700', '#FF69B4', '#00FFFF'],
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [view]);

  // --- AUTO-LOGIN TO DASHBOARD ---
  useEffect(() => {
    // If user is logged in, redirect to dashboard (from landing or register views)
    // Only redirect when not loading and both user and profile are ready
    if (!authLoading && user && profile && (view === 'landing' || view === 'register' || view === 'login')) {
      setView('dashboard');
    }
    // If user is logged out and on dashboard, redirect to landing
    if (!authLoading && !user && view === 'dashboard') {
      setView('landing');
    }
  }, [authLoading, user, profile, view]);

  // --- URL PARAMETER HANDLING ---
  useEffect(() => {
    // Check for waiter ID in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const waiterId = urlParams.get('waiter');

    if (waiterId) {
      // Try to load waiter data from Firebase or use mock
      loadWaiterProfile(waiterId);
    }
  }, []);

  const loadWaiterProfile = async (waiterId: string) => {
    console.log('[QR] Starting to load waiter profile for ID:', waiterId);
    console.log('[QR] Firebase DB initialized:', !!db);

    setLoading(true);
    try {
      if (db) {
        // Try to load from main waiters collection (used by registration)
        console.log('[QR] Attempting to load from path: waiters/' + waiterId);
        const docRef = doc(db, 'waiters', waiterId);
        const docSnap = await getDoc(docRef);

        console.log('[QR] Document exists in main path:', docSnap.exists());

        if (docSnap.exists()) {
          const profile = { id: docSnap.id, ...docSnap.data() } as WaiterProfile;
          console.log('[QR] ✅ Waiter profile loaded:', profile);
          openPaymentPage(profile);
        } else {
          // Fallback: try old path for backwards compatibility
          console.log('[QR] Attempting fallback path: artifacts/' + APP_ID + '/public/data/waiters/' + waiterId);
          const oldDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'waiters', waiterId);
          const oldDocSnap = await getDoc(oldDocRef);

          console.log('[QR] Document exists in old path:', oldDocSnap.exists());

          if (oldDocSnap.exists()) {
            const profile = { id: oldDocSnap.id, ...oldDocSnap.data() } as WaiterProfile;
            console.log('[QR] ✅ Waiter profile loaded (old path):', profile);
            openPaymentPage(profile);
          } else {
            console.error('[QR] ❌ Waiter profile not found in any path');
            alert('Waiter profile not found. Waiter ID: ' + waiterId + '\n\nPlease make sure you are registered and try again.');
            setView('landing');
          }
        }
      } else {
        console.log('[QR] Firebase not initialized, using mock waiter');
        // Mock mode - use demo waiter
        openPaymentPage(MOCK_WAITER);
      }
    } catch (error: any) {
      console.error('[QR] ❌ Error loading waiter profile:', error);
      console.error('[QR] Error details:', error.message, error.code);
      alert('Error loading waiter profile: ' + (error.message || 'Unknown error'));
      setView('landing');
    } finally {
      setLoading(false);
    }
  };

  // --- QR CODE GENERATION ---
  const generateQRUrl = (waiterId: string): string => {
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
    return `${baseUrl}?waiter=${waiterId}`;
  };

  // Registration Form State
  const [regForm, setRegForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    restaurant: '',
    hederaId: '',
    baseAddress: '',
  });

  // Login Form State
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  // Edit Profile Form State
  const [editForm, setEditForm] = useState({
    name: '',
    restaurant: '',
    hederaId: '',
    baseAddress: '',
    bio: '',
    photoURL: '',
  });

  // --- NAVIGATION HELPERS ---
  
  const openPaymentPage = (profile: WaiterProfile) => {
    setWaiterData(profile);
    setAmount('');
    setReview('');
    setRating(0);
    setSelectedToken(AVAILABLE_TOKENS[0]); // Reset to default
    setCoverFee(false); // Reset cover fee checkbox
    setView('pay');
  };

  // --- ACTIONS ---

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!regForm.email || !regForm.password) {
        alert("Please provide email and password.");
        setLoading(false);
        return;
      }

      if (regForm.password !== regForm.confirmPassword) {
        alert("Passwords do not match.");
        setLoading(false);
        return;
      }

      if (regForm.password.length < 6) {
        alert("Password must be at least 6 characters.");
        setLoading(false);
        return;
      }

      if (!regForm.hederaId && !regForm.baseAddress) {
        alert("Please provide at least one payment address (Hedera or Base).");
        setLoading(false);
        return;
      }

      // Register with Firebase Auth
      await register(
        regForm.email,
        regForm.password,
        {
          name: regForm.name,
          restaurant: regForm.restaurant,
          hederaId: regForm.hederaId,
          baseAddress: regForm.baseAddress
        }
      );

      alert('Registration successful! Please check your email to verify your account.');

      // Don't automatically redirect - let the AUTO-LOGIN effect handle it
      // This ensures the profile is fully loaded before showing dashboard
    } catch (error: any) {
      console.error("Registration error: ", error);
      alert(error.message || "Registration error. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(loginForm.email, loginForm.password);
      setView('dashboard');
    } catch (error: any) {
      console.error("Login error:", error);
      alert(error.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Google Login handler
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      setView('dashboard');
    } catch (error: any) {
      console.error("Google login error:", error);
      if (error.message === 'PROFILE_NOT_FOUND') {
        alert('No profile found. Please register first.');
        setView('register');
      } else {
        alert(error.message || "Google login failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Google Register handler - Step 1: Sign in with Google
  const handleGoogleRegister = async () => {
    setLoading(true);

    try {
      if (!auth || !googleProvider) {
        throw new Error('Firebase Auth or Google Provider not initialized');
      }

      // Import needed functions
      const { signInWithPopup } = await import('firebase/auth');

      // Sign in with Google first
      const result = await signInWithPopup(auth, googleProvider);
      const { uid, email, displayName, photoURL } = result.user;

      if (!email) {
        throw new Error('No email found in Google account');
      }

      // Check if profile already exists
      if (db) {
        const { doc, getDoc } = await import('firebase/firestore');
        const profileRef = doc(db, 'waiters', uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          // Profile already exists - redirect to dashboard
          alert('Account already exists! Redirecting to dashboard...');
          setView('dashboard');
          setLoading(false);
          return;
        }
      }

      // Store Google user data temporarily
      setGoogleUserData({ uid, email, displayName, photoURL });

      // Show profile completion form
      setView('google-profile');
    } catch (error: any) {
      console.error("Google sign-in error: ", error);
      if (error.code === 'auth/popup-closed-by-user') {
        alert('Sign-in cancelled.');
      } else {
        alert(error.message || "Google sign-in error. Check console.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Complete Google registration with profile data
  const handleCompleteGoogleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!regForm.hederaId && !regForm.baseAddress) {
        alert("Please provide at least one payment address (Hedera or Base).");
        setLoading(false);
        return;
      }

      if (!regForm.name || !regForm.restaurant) {
        alert("Please provide your name and restaurant.");
        setLoading(false);
        return;
      }

      if (!googleUserData) {
        throw new Error('No Google user data found');
      }

      // Register with Google using stored data
      await registerWithGoogle({
        name: regForm.name,
        restaurant: regForm.restaurant,
        hederaId: regForm.hederaId,
        baseAddress: regForm.baseAddress
      });

      alert('Registration successful!');
      setGoogleUserData(null);

      // Let the AUTO-LOGIN effect handle redirect to dashboard
    } catch (error: any) {
      console.error("Google registration error: ", error);
      alert(error.message || "Google registration error. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // Update Profile handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateUserProfile({
        name: editForm.name,
        restaurant: editForm.restaurant,
        hederaId: editForm.hederaId,
        baseAddress: editForm.baseAddress,
        bio: editForm.bio,
        photoURL: editForm.photoURL,
      });

      alert('Profile updated successfully!');
      setView('dashboard');
    } catch (error: any) {
      console.error("Update profile error:", error);
      alert(error.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  // --- PAYMENT LOGIC ---

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    // Check if waiter has the address for selected token
    const targetAddress = waiterData ? waiterData[selectedToken.addressKey] : null;
    if (!targetAddress) {
      alert(`This waiter has not set up a ${selectedToken.network} address.`);
      return;
    }

    setLoading(true);

    try {
      await processPayment(targetAddress);
      setView('success');
    } catch (error: any) {
      console.error("Payment cancelled or failed", error);
      alert(error.message || "Payment failed. Please check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (address: string) => {
    const networkName = selectedToken.network;
    const tipAmount = parseFloat(amount);
    const totalAmount = coverFee ? tipAmount * 1.05 : tipAmount;
    const waiterReceives = coverFee ? tipAmount : tipAmount * 0.95;

    console.log(`--- STARTING ${networkName.toUpperCase()} PAYMENT ---`);
    console.log(`Token: ${selectedToken.symbol}`);
    console.log(`Recipient: ${address}`);
    console.log(`Tip Amount: ${amount}`);
    console.log(`Cover Fee: ${coverFee ? 'Yes' : 'No'}`);
    console.log(`Total to Send: ${totalAmount}`);
    console.log(`Waiter Receives: ${waiterReceives}`);

    if (selectedToken.id === 'hbar') {
      // Real Hedera transaction via Smart Contract
      if (!isHederaConnected) {
        throw new Error('Please connect your Hedera wallet first');
      }

      console.log('[HEDERA CONTRACT TRANSACTION]');
      console.log(`Sending ${totalAmount} HBAR via HederaTipSplitter contract`);
      console.log(`Waiter address: ${address}`);
      console.log(`Cover fee: ${coverFee ? 'Yes (customer pays extra 5%)' : 'No (deducted from tip)'}`);

      // Prepare review text (combining rating and comment)
      const reviewText = review.trim() || (rating > 0 ? `Rating: ${rating}/5` : '');

      try {
        // Send tip via smart contract
        // The contract will automatically split: 95% to waiter, 5% to platform
        const txId = await sendTipViaContract(address, totalAmount, reviewText);
        setTransactionId(txId);

        console.log(`✅ Contract transaction successful! ID: ${txId}`);
        console.log(`💰 Waiter receives: ${waiterReceives} HBAR (after 5% platform fee)`);
        console.log(`🏦 Platform receives: ${totalAmount - waiterReceives} HBAR (5% fee)`);

        // Submit review to HCS (Hedera Consensus Service) for tamper-proof storage
        if (waiterData?.id && ((review && review.trim()) || rating > 0)) {
          try {
            console.log('[HCS] Submitting review to HCS...');
            await submitReview({
              waiterId: waiterData.id,
              waiterName: waiterData.name,
              restaurant: waiterData.restaurant || '',
              rating: rating > 0 ? rating : undefined,
              comment: review.trim(),
              tipAmount: waiterReceives,
              timestamp: Date.now(),
            });
            console.log('[HCS] ✅ Review submitted to Hedera Consensus Service');
            console.log('[HCS] Review is now immutably stored on blockchain');
          } catch (hcsError: any) {
            console.error('[HCS] ⚠️ Failed to submit review to HCS:', hcsError);
            // Don't throw - transaction was successful, HCS submission is optional
            // Review will still be associated with the transaction
          }
        }
      } catch (contractError: any) {
        console.error('[CONTRACT] Transaction failed:', contractError);
        throw new Error(contractError.message || 'Failed to send tip via smart contract');
      }
    } else if (selectedToken.id === 'usdc_hedera') {
      // USDC on Hedera via HTS (Hedera Token Service)
      if (!isHederaConnected) {
        throw new Error('Please connect your Hedera wallet first');
      }

      console.log('[HEDERA USDC TRANSACTION]');
      console.log(`Sending ${totalAmount} USDC on Hedera`);
      console.log(`Waiter address: ${address}`);
      console.log(`Token ID: ${selectedToken.tokenId}`);

      try {
        // TODO: Implement USDC transfer via HTS
        // For now, show alert that USDC is coming soon
        throw new Error('USDC transfers are coming soon! Please use HBAR for now.');

        // Future implementation will be:
        // const txId = await sendTokenTransfer(selectedToken.tokenId!, address, totalAmount);
        // setTransactionId(txId);
      } catch (usdcError: any) {
        console.error('[USDC] Transaction failed:', usdcError);
        throw new Error(usdcError.message || 'Failed to send USDC');
      }
    } else if (selectedToken.id === 'usdt_base') {
      // For Base network - still simulation (you can integrate wagmi/MetaMask later)
      const simulationMsg = `[BASE SIMULATION]\nCall Wagmi/MetaMask (Base Chain)\nTransfer ${amount} USDT to ${address}`;
      console.log(simulationMsg);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  };

  // --- VIEWS ---

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-black text-white font-sans">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Sparkles Animation Background */}
          <div className="absolute inset-0 w-full h-full z-0">
            <SparklesCore
              id="tsparticlesfullpage"
              background="transparent"
              minSize={0.6}
              maxSize={1.4}
              particleDensity={80}
              className="w-full h-full"
              particleColor="#00eb78"
              speed={0.5}
            />
          </div>

          {/* Background Effects */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute -top-[20%] -right-[20%] w-[60%] h-[60%] bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-[#00eb78]/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[10%] right-[20%] w-[30%] h-[30%] bg-[#0052FF]/10 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-6xl mx-auto px-6 py-20 relative z-10">
            <div className="text-center space-y-8">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="border border-white/20 p-6 rounded-3xl bg-white/5 backdrop-blur-md shadow-2xl">
                  <QrCode size={64} color={HEDERA_GREEN} />
                </div>
              </div>

              {/* Main Heading */}
              <h1 className="text-6xl md:text-7xl font-bold tracking-tighter text-white mb-4 relative">
                The Future of Tipping
              </h1>

              {/* Animated Gradient Lines */}
              <div className="w-full max-w-2xl mx-auto h-32 relative mb-8">
                {/* Gradients */}
                <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-[#00eb78] to-transparent h-[2px] w-3/4 blur-sm mx-auto" />
                <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-[#00eb78] to-transparent h-px w-3/4 mx-auto" />
                <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-[#0052FF] to-transparent h-[5px] w-1/4 blur-sm mx-auto" />
                <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-[#0052FF] to-transparent h-px w-1/4 mx-auto" />

                {/* Radial Gradient to prevent sharp edges */}
                <div className="absolute inset-0 w-full h-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]"></div>
              </div>

              <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Instant crypto tips on <span className="text-[#00eb78] font-semibold">Hedera</span> network.
                Direct to waiters. Zero intermediaries. Built on blockchain.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 max-w-2xl mx-auto">
                {!user ? (
                  <>
                    <button
                      onClick={() => setView('register')}
                      className="flex-1 bg-[#00eb78] hover:bg-[#00c96d] text-black font-bold py-4 px-8 rounded-full transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(0,235,120,0.3)] flex items-center justify-center gap-2"
                    >
                      <User size={20} />
                      Register as Waiter
                    </button>

                    <button
                      onClick={() => openPaymentPage(MOCK_WAITER)}
                      className="flex-1 bg-transparent hover:bg-white/10 text-white font-semibold py-4 px-8 rounded-full border border-white/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Zap size={20} color={HEDERA_GREEN} />
                      Try Demo
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setView('dashboard')}
                    className="flex-1 bg-[#00eb78] hover:bg-[#00c96d] text-black font-bold py-4 px-8 rounded-full transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(0,235,120,0.3)] flex items-center justify-center gap-2"
                  >
                    <User size={20} />
                    Go to Dashboard
                  </button>
                )}
              </div>

              {user && (
                <button
                  onClick={() => setView('login')}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Sign in with different account
                </button>
              )}
            </div>
          </div>

          {/* Gradient Fade Overlay at bottom - smoother transition */}
          <div className="absolute bottom-0 left-0 w-full h-60 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10 pointer-events-none"></div>
        </section>

        {/* Features Section */}
        <section className="relative py-20 px-6 bg-black/95">
          {/* Extended Sparkles with Fade Effect */}
          <div className="absolute top-0 left-0 w-full h-[400px] pointer-events-none overflow-hidden">
            <SparklesCore
              id="tsparticlesfeatures"
              background="transparent"
              minSize={0.4}
              maxSize={1}
              particleDensity={20}
              className="w-full h-full"
              particleColor="#00eb78"
              speed={0.3}
            />
            {/* Fade out gradient - more subtle */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/95"></div>
          </div>

          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Why Ez Crypto Tips?</h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Modern tipping solution built for the digital age
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-black/40 border border-gray-800 rounded-3xl p-8 hover:border-[#00eb78]/50 transition-all">
                <div className="w-14 h-14 bg-[#00eb78]/10 rounded-2xl flex items-center justify-center mb-6">
                  <Zap size={28} color={HEDERA_GREEN} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Instant Transfers</h3>
                <p className="text-gray-400 leading-relaxed">
                  Tips arrive in seconds, not days. No waiting for payment processing or bank transfers.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-black/40 border border-gray-800 rounded-3xl p-8 hover:border-[#0052FF]/50 transition-all">
                <div className="w-14 h-14 bg-[#00eb78]/10 rounded-2xl flex items-center justify-center mb-6">
                  <Coins size={28} color={HEDERA_GREEN} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Smart Contract Integration</h3>
                <p className="text-gray-400 leading-relaxed">
                  Automated 95/5 split via Hedera smart contract. Instant, secure, transparent on-chain transactions.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-black/40 border border-gray-800 rounded-3xl p-8 hover:border-[#00eb78]/50 transition-all">
                <div className="w-14 h-14 bg-[#00eb78]/10 rounded-2xl flex items-center justify-center mb-6">
                  <QrCode size={28} color={HEDERA_GREEN} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Simple QR Codes</h3>
                <p className="text-gray-400 leading-relaxed">
                  One QR code, unlimited tips. Customers scan and pay in seconds. No apps required.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-black/40 border border-gray-800 rounded-3xl p-8 hover:border-[#00eb78]/50 transition-all">
                <div className="w-14 h-14 bg-[#00eb78]/10 rounded-2xl flex items-center justify-center mb-6">
                  <Share2 size={28} color={HEDERA_GREEN} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Direct to Your Wallet</h3>
                <p className="text-gray-400 leading-relaxed">
                  Tips go directly to your wallet with only 5% platform fee. No banks, no payment processors, minimal delays.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-black/40 border border-gray-800 rounded-3xl p-8 hover:border-[#0052FF]/50 transition-all">
                <div className="w-14 h-14 bg-[#0052FF]/10 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7" fill="none" stroke={BASE_BLUE} viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Blockchain Security</h3>
                <p className="text-gray-400 leading-relaxed">
                  Every transaction is recorded on-chain. Transparent, secure, and verifiable.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-black/40 border border-gray-800 rounded-3xl p-8 hover:border-[#00eb78]/50 transition-all">
                <div className="w-14 h-14 bg-[#00eb78]/10 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7" fill="none" stroke={HEDERA_GREEN} viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Rating System</h3>
                <p className="text-gray-400 leading-relaxed">
                  Build your reputation with customer reviews and star ratings stored on blockchain.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 px-6 bg-gradient-to-br from-black via-[#00eb78]/5 to-[#0052FF]/5">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                  More Tips, More Often
                </h2>
                <p className="text-xl text-gray-400 leading-relaxed mb-6">
                  QR code payments make tipping easier than ever. Customers are more likely to tip when the process is simple and convenient.
                </p>
                <p className="text-gray-400 leading-relaxed">
                  Our platform removes friction from the tipping process - no need to calculate percentages, no handling cash, just scan and pay.
                </p>
              </div>

              <div className="bg-black/40 border border-gray-800 rounded-3xl p-12 text-center">
                <div className="mb-6">
                  <div className="text-7xl md:text-8xl font-bold bg-gradient-to-r from-[#00eb78] to-[#0052FF] bg-clip-text text-transparent">
                    +18%
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Average Tip Increase</h3>
                <p className="text-gray-400 leading-relaxed">
                  Waiters using QR code tipping see an average 18% increase in tips thanks to the simplicity and convenience of the payment process.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">How It Works</h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Get started in three simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-[#00eb78] to-[#00c96d] rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-black">
                  1
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Register</h3>
                <p className="text-gray-400 leading-relaxed">
                  Create your account and add your Hedera wallet address
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-[#0052FF] to-[#0041CC] rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white">
                  2
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Get Your QR</h3>
                <p className="text-gray-400 leading-relaxed">
                  Download your personalized QR code and display it at your workplace
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-[#00eb78] to-[#00c96d] rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-black">
                  3
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Receive Tips</h3>
                <p className="text-gray-400 leading-relaxed">
                  Customers scan your QR code and send tips directly to your wallet
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 px-6 bg-gradient-to-br from-[#00eb78]/10 to-[#0052FF]/10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Start Earning?
            </h2>
            <p className="text-xl text-gray-400 mb-4 max-w-2xl mx-auto">
              Join waiters around the world who are already receiving crypto tips
            </p>
            <p className="text-sm text-gray-500 mb-10">
              Only 5% platform fee · No hidden charges · Instant payouts
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
              {!user ? (
                <>
                  <button
                    onClick={() => setView('register')}
                    className="flex-1 bg-[#00eb78] hover:bg-[#00c96d] text-black font-bold py-4 px-8 rounded-full transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(0,235,120,0.3)] flex items-center justify-center gap-2"
                  >
                    <User size={20} />
                    Create Account - It's Free
                  </button>

                  <button
                    onClick={() => setView('login')}
                    className="flex-1 bg-transparent hover:bg-white/10 text-white font-semibold py-4 px-8 rounded-full border border-white/30 transition-all flex items-center justify-center gap-2"
                  >
                    <User size={20} />
                    Sign In
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setView('dashboard')}
                  className="flex-1 bg-[#00eb78] hover:bg-[#00c96d] text-black font-bold py-4 px-8 rounded-full transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(0,235,120,0.3)] flex items-center justify-center gap-2"
                >
                  <User size={20} />
                  Go to Dashboard
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-gray-800">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-gray-500 text-sm">
              Powered by <span className="text-[#00eb78] font-semibold">Hedera</span> blockchain
            </p>
          </div>
        </footer>
      </div>
    );
  }

  if (view === 'qr') {
    if (!waiterData || !waiterData.id) {
      setView('landing');
      return null;
    }

    const qrUrl = generateQRUrl(waiterData.id);

    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full mx-auto bg-[#181818] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-gray-800 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Your QR Code</h2>
            <p className="text-gray-400 text-sm">Share this code with customers to receive tips</p>
          </div>

          <div className="p-8 flex flex-col items-center space-y-6">
            {/* QR Code */}
            <div className="bg-white p-6 rounded-2xl shadow-2xl">
              <QRCode
                value={qrUrl}
                size={256}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
            </div>

            {/* Waiter Info */}
            <div className="w-full text-center space-y-2">
              <div className="w-16 h-16 bg-black rounded-full mx-auto border border-gray-700 flex items-center justify-center text-2xl font-bold text-white">
                {waiterData.name.charAt(0)}
              </div>
              <h3 className="text-xl font-bold text-white">{waiterData.name}</h3>
              <p className="text-gray-500 uppercase text-xs tracking-wider">{waiterData.restaurant}</p>
            </div>

            {/* QR URL (for sharing) */}
            <div className="w-full p-4 bg-black rounded-xl border border-gray-800">
              <p className="text-xs text-gray-500 mb-2 text-center">Share Link:</p>
              <p className="font-mono text-xs text-gray-300 break-all text-center">{qrUrl}</p>
            </div>

            {/* Action Buttons */}
            <div className="w-full grid gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrUrl);
                  alert('Link copied to clipboard!');
                }}
                className="w-full bg-[#00eb78] hover:bg-[#00c96d] text-black font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Share2 size={18} />
                Copy Link
              </button>
              
              <button
                onClick={() => openPaymentPage(waiterData)}
                className="w-full bg-transparent hover:bg-white/10 text-white font-semibold py-3 px-6 rounded-xl border border-white/30 transition-all flex items-center justify-center gap-2"
              >
                <Wallet size={18} />
                Test Payment Page
              </button>

              <button
                onClick={() => setView('landing')}
                className="w-full bg-transparent hover:bg-white/5 text-gray-400 font-medium py-2 px-6 rounded-xl transition-all"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'register') {
    return (
      <div className="min-h-screen bg-black flex flex-col p-6 font-sans">
        <div className="max-w-md w-full mx-auto bg-[#181818] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-gray-800">
            <button onClick={() => setView('landing')} className="text-gray-400 hover:text-white mb-6 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-3xl font-bold text-white mb-1">Registration</h2>
            <p className="text-gray-400">Quick setup with Google or Email</p>
          </div>

          <div className="p-8">
            {/* Google Sign Up Button - Top Priority */}
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 border-2 border-gray-300 hover:border-[#00eb78] disabled:opacity-50 disabled:hover:border-gray-300 shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'Connecting...' : 'Continue with Google'}
            </button>
            <p className="text-xs text-gray-500 text-center mt-2 mb-6">
              Fastest way to get started - complete your profile after sign in
            </p>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#181818] px-2 text-gray-500">Or register with email</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleRegister} className="px-8 pb-8 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Email</label>
              <input
                required
                type="email"
                className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl focus:border-[#00eb78] outline-none transition-all placeholder-gray-600"
                placeholder="your@email.com"
                value={regForm.email}
                onChange={e => setRegForm({...regForm, email: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Password</label>
              <input
                required
                type="password"
                className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl focus:border-[#00eb78] outline-none transition-all placeholder-gray-600"
                placeholder="••••••••"
                value={regForm.password}
                onChange={e => setRegForm({...regForm, password: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Confirm Password</label>
              <input
                required
                type="password"
                className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl focus:border-[#00eb78] outline-none transition-all placeholder-gray-600"
                placeholder="••••••••"
                value={regForm.confirmPassword}
                onChange={e => setRegForm({...regForm, confirmPassword: e.target.value})}
              />
            </div>

            <div className="pt-4 border-t border-gray-800">
              <p className="text-gray-400 text-sm mb-4">Profile Information:</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Your Name</label>
              <input
                required
                type="text"
                className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl focus:border-[#00eb78] outline-none transition-all placeholder-gray-600"
                placeholder="Alex"
                value={regForm.name}
                onChange={e => setRegForm({...regForm, name: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Restaurant / Venue</label>
              <input 
                required
                type="text" 
                className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl focus:border-[#00eb78] outline-none transition-all placeholder-gray-600"
                placeholder="Burger Heroes"
                value={regForm.restaurant}
                onChange={e => setRegForm({...regForm, restaurant: e.target.value})}
              />
            </div>

            <div className="pt-4 border-t border-gray-800">
              <p className="text-gray-400 text-sm mb-4">Add at least one wallet address:</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#00eb78] mb-1">Hedera Account ID</label>
                  <input
                    type="text"
                    className="w-full bg-black text-white p-3 border border-gray-700 rounded-xl focus:border-[#00eb78] outline-none font-mono text-sm"
                    placeholder="0.0.xxxxx"
                    value={regForm.hederaId}
                    onChange={e => setRegForm({...regForm, hederaId: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0052FF] mb-1">Base Address (EVM)</label>
                  <input 
                    type="text" 
                    className="w-full bg-black text-white p-3 border border-gray-700 rounded-xl focus:border-[#0052FF] outline-none font-mono text-sm"
                    placeholder="0x..."
                    value={regForm.baseAddress}
                    onChange={e => setRegForm({...regForm, baseAddress: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-[#00eb78] hover:bg-[#00c96d] text-black font-bold py-4 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(0,235,120,0.2)] disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="text-center pt-6">
              <p className="text-gray-500 text-sm">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="text-[#00eb78] hover:text-[#00c96d] font-semibold transition-colors"
                >
                  Login
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'google-profile') {
    if (!googleUserData) {
      setView('register');
      return null;
    }

    return (
      <div className="min-h-screen bg-black flex flex-col p-6 font-sans">
        <div className="max-w-md w-full mx-auto bg-[#181818] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-gray-800">
            <h2 className="text-3xl font-bold text-white mb-1">Complete Your Profile</h2>
            <p className="text-gray-400">Just a few more details to get started</p>
          </div>

          {/* Google Account Info */}
          <div className="p-8 border-b border-gray-800 bg-black/30">
            <div className="flex items-center gap-4">
              {googleUserData.photoURL ? (
                <img src={googleUserData.photoURL} alt="Profile" className="w-16 h-16 rounded-full border-2 border-[#00eb78]" />
              ) : (
                <div className="w-16 h-16 bg-[#00eb78] rounded-full flex items-center justify-center text-2xl font-bold text-black">
                  {googleUserData.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex-1">
                <p className="text-white font-semibold">{googleUserData.displayName || 'User'}</p>
                <p className="text-gray-400 text-sm">{googleUserData.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-xs text-gray-500">Connected with Google</span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleCompleteGoogleRegistration} className="p-8 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Your Name *</label>
              <input
                required
                type="text"
                className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl focus:border-[#00eb78] outline-none transition-all placeholder-gray-600"
                placeholder="Alex"
                value={regForm.name}
                onChange={e => setRegForm({...regForm, name: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Restaurant / Venue *</label>
              <input
                required
                type="text"
                className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl focus:border-[#00eb78] outline-none transition-all placeholder-gray-600"
                placeholder="Burger Heroes"
                value={regForm.restaurant}
                onChange={e => setRegForm({...regForm, restaurant: e.target.value})}
              />
            </div>

            <div className="pt-4 border-t border-gray-800">
              <p className="text-gray-400 text-sm mb-4">Add at least one wallet address *</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#00eb78] mb-1">Hedera Account ID</label>
                  <input
                    type="text"
                    className="w-full bg-black text-white p-3 border border-gray-700 rounded-xl focus:border-[#00eb78] outline-none font-mono text-sm"
                    placeholder="0.0.xxxxx"
                    value={regForm.hederaId}
                    onChange={e => setRegForm({...regForm, hederaId: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0052FF] mb-1">Base Address (EVM)</label>
                  <input
                    type="text"
                    className="w-full bg-black text-white p-3 border border-gray-700 rounded-xl focus:border-[#0052FF] outline-none font-mono text-sm"
                    placeholder="0x..."
                    value={regForm.baseAddress}
                    onChange={e => setRegForm({...regForm, baseAddress: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-[#00eb78] hover:bg-[#00c96d] text-black font-bold py-4 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(0,235,120,0.2)] disabled:opacity-50"
            >
              {loading ? 'Creating Profile...' : 'Complete Registration'}
            </button>

            <p className="text-xs text-gray-400 text-center mt-4">
              Your QR code will be generated after completing registration
            </p>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-black flex flex-col p-6 font-sans">
        <div className="max-w-md w-full mx-auto bg-[#181818] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-gray-800">
            <button onClick={() => setView('landing')} className="text-gray-400 hover:text-white mb-6 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-3xl font-bold text-white mb-1">Waiter Login</h2>
            <p className="text-gray-400">Access your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Email</label>
              <input
                required
                type="email"
                className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl focus:border-[#00eb78] outline-none transition-all placeholder-gray-600"
                placeholder="your@email.com"
                value={loginForm.email}
                onChange={e => setLoginForm({...loginForm, email: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Password</label>
              <input
                required
                type="password"
                className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl focus:border-[#00eb78] outline-none transition-all placeholder-gray-600"
                placeholder="••••••••"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-[#00eb78] hover:bg-[#00c96d] text-black font-bold py-4 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(0,235,120,0.2)] disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#181818] px-2 text-gray-500">Or</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 border border-gray-300 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="text-center pt-4">
              <p className="text-gray-500 text-sm">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setView('register')}
                  className="text-[#00eb78] hover:text-[#00c96d] font-semibold transition-colors"
                >
                  Register
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'dashboard') {
    if (authLoading || !user || !profile) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-white">Loading profile...</p>
        </div>
      );
    }

    const qrUrl = profile.qrCodeUrl || generateQRUrl(user.uid);

    const downloadQRCode = () => {
      const svg = document.getElementById('dashboard-qr-code');
      if (!svg) return;

      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Convert SVG to canvas
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a');
            link.download = `${profile.name}-qr-code.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
          }
        });
      };

      img.src = url;
    };

    return (
      <div className="min-h-screen bg-black flex flex-col p-6 font-sans">
        <div className="max-w-4xl w-full mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Welcome, {profile.name}! 👋</h1>
              <p className="text-gray-400">{profile.restaurant}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  // Populate edit form with current profile data
                  setEditForm({
                    name: profile.name,
                    restaurant: profile.restaurant,
                    hederaId: profile.hederaId,
                    baseAddress: profile.baseAddress || '',
                    bio: profile.bio || '',
                    photoURL: profile.photoURL || '',
                  });
                  setView('edit-profile');
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Edit Profile
              </button>
              <button
                onClick={async () => {
                  try {
                    await logout();
                    setView('landing');
                  } catch (error) {
                    console.error('Logout error:', error);
                    // Still redirect to landing even if logout fails
                    setView('landing');
                  }
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* QR Code Card */}
            <div className="bg-[#181818] rounded-3xl border border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Your QR Code</h2>

              <div className="bg-white p-6 rounded-2xl shadow-2xl mb-6">
                <QRCode
                  id="dashboard-qr-code"
                  value={qrUrl}
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              </div>

              <div className="space-y-3">
                <button
                  onClick={downloadQRCode}
                  className="w-full bg-[#00eb78] hover:bg-[#00c96d] text-black font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Download QR Code
                </button>
              </div>
            </div>

            {/* Share Link Card */}
            <div className="bg-[#181818] rounded-3xl border border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Share Link</h2>

              <div className="bg-black p-4 rounded-xl border border-gray-800 mb-4">
                <p className="text-xs text-gray-500 mb-2">Payment URL:</p>
                <p className="font-mono text-xs text-gray-300 break-all">{qrUrl}</p>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrUrl);
                  alert('Link copied to clipboard!');
                }}
                className="w-full bg-[#00eb78] hover:bg-[#00c96d] text-black font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Share2 size={18} />
                Copy Link
              </button>

              <div className="mt-8 pt-8 border-t border-gray-800">
                <h3 className="text-lg font-bold text-white mb-4">Profile Info</h3>

                {/* Profile Photo */}
                {profile.photoURL && (
                  <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#00eb78]">
                      <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="text-white ml-2">{profile.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Restaurant:</span>
                    <span className="text-white ml-2">{profile.restaurant}</span>
                  </div>
                  {profile.bio && (
                    <div>
                      <span className="text-gray-500">Bio:</span>
                      <p className="text-white mt-1">{profile.bio}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Hedera ID:</span>
                    <span className="text-white ml-2 font-mono text-xs">{profile.hederaId}</span>
                  </div>
                  {profile.baseAddress && (
                    <div>
                      <span className="text-gray-500">Base Address:</span>
                      <span className="text-white ml-2 font-mono text-xs">{profile.baseAddress}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rating & Recent Reviews */}
              <div className="mt-8 pt-8 border-t border-gray-800">
                <h3 className="text-lg font-bold text-white mb-4">Your Rating & Reviews</h3>
                <WaiterRatingCard
                  waiterId={user.uid}
                  waiterName={profile.name}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => openPaymentPage({
                id: user.uid,
                name: profile.name,
                restaurant: profile.restaurant,
                hederaId: profile.hederaId,
                baseAddress: profile.baseAddress
              })}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Test Payment Page →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'edit-profile') {
    if (!user || !profile) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-white">Loading...</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black flex flex-col p-6 font-sans">
        <div className="max-w-md w-full mx-auto bg-[#181818] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-gray-800">
            <button onClick={() => setView('dashboard')} className="text-gray-400 hover:text-white mb-6 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-3xl font-bold text-white mb-1">Edit Profile</h2>
            <p className="text-gray-400">Update your information</p>
          </div>

          <form onSubmit={handleUpdateProfile} className="p-8 space-y-4">
            {/* Profile Photo */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 bg-black rounded-full border border-gray-700 flex items-center justify-center text-3xl font-bold text-white mb-4 overflow-hidden">
                {editForm.photoURL ? (
                  <img src={editForm.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profile.name.charAt(0)
                )}
              </div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Photo URL</label>
              <input
                type="url"
                className="w-full bg-black text-white p-3 border border-gray-700 rounded-xl focus:border-[#00eb78] outline-none transition-all placeholder-gray-600 text-sm"
                placeholder="https://example.com/photo.jpg"
                value={editForm.photoURL}
                onChange={e => setEditForm({...editForm, photoURL: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">Enter a URL to your profile photo</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Your Name</label>
              <input
                required
                type="text"
                className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl focus:border-[#00eb78] outline-none transition-all placeholder-gray-600"
                placeholder="Alex"
                value={editForm.name}
                onChange={e => setEditForm({...editForm, name: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Restaurant / Venue</label>
              <input
                required
                type="text"
                className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl focus:border-[#00eb78] outline-none transition-all placeholder-gray-600"
                placeholder="Burger Heroes"
                value={editForm.restaurant}
                onChange={e => setEditForm({...editForm, restaurant: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Bio (Optional)</label>
              <textarea
                className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl focus:border-[#00eb78] outline-none transition-all placeholder-gray-600 resize-none"
                placeholder="Tell people about yourself..."
                rows={3}
                value={editForm.bio}
                onChange={e => setEditForm({...editForm, bio: e.target.value})}
              />
            </div>

            <div className="pt-4 border-t border-gray-800">
              <p className="text-gray-400 text-sm mb-4">Payment Addresses:</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#00eb78] mb-1">Hedera Account ID</label>
                  <input
                    type="text"
                    className="w-full bg-black text-white p-3 border border-gray-700 rounded-xl focus:border-[#00eb78] outline-none font-mono text-sm"
                    placeholder="0.0.xxxxx"
                    value={editForm.hederaId}
                    onChange={e => setEditForm({...editForm, hederaId: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0052FF] mb-1">Base Address (EVM)</label>
                  <input
                    type="text"
                    className="w-full bg-black text-white p-3 border border-gray-700 rounded-xl focus:border-[#0052FF] outline-none font-mono text-sm"
                    placeholder="0x..."
                    value={editForm.baseAddress}
                    onChange={e => setEditForm({...editForm, baseAddress: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-[#00eb78] hover:bg-[#00c96d] text-black font-bold py-4 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(0,235,120,0.2)] disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              type="button"
              onClick={() => setView('dashboard')}
              className="w-full bg-transparent hover:bg-white/10 text-gray-400 font-medium py-3 px-6 rounded-xl transition-all"
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'pay') {
    const currentAddress = waiterData ? waiterData[selectedToken.addressKey] : null;
    const hasAddress = !!currentAddress;

    return (
      <div className="min-h-screen bg-black flex flex-col p-4 font-sans">
        <div className="max-w-md w-full mx-auto">
          <button onClick={() => setView('landing')} className="text-gray-500 hover:text-white mb-6 transition-colors flex items-center gap-2">
            <ArrowLeft size={20} /> <span className="text-sm">Back</span>
          </button>

          {/* Waiter Card */}
          <div className="bg-[#181818] border border-gray-800 rounded-3xl p-8 mb-6 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00eb78] to-transparent opacity-50"></div>
             <div className="w-24 h-24 bg-black rounded-full mx-auto mb-4 border border-gray-700 flex items-center justify-center text-3xl font-bold text-white">
                {waiterData?.name.charAt(0)}
             </div>
             <h2 className="text-2xl font-bold text-white mb-1">{waiterData?.name}</h2>
             <p className="text-gray-500 uppercase text-xs tracking-wider mb-3">{waiterData?.restaurant}</p>
          </div>

          {/* Rating & Recent Reviews Card */}
          {waiterData?.id && (
            <div className="mb-6">
              <WaiterRatingCard
                waiterId={waiterData.id}
                waiterName={waiterData.name}
                compact={true}
              />
            </div>
          )}

          {/* Payment Form */}
          <div className="bg-[#181818] border border-gray-800 rounded-3xl p-8">
            
            {/* Token Selection */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {AVAILABLE_TOKENS.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => !token.disabled && setSelectedToken(token)}
                    disabled={token.disabled}
                    className={`p-2 rounded-lg text-sm font-bold border transition-all relative ${
                      token.disabled
                        ? 'bg-black border-gray-800 text-gray-600 opacity-50 cursor-not-allowed'
                        : selectedToken.id === token.id
                          ? `bg-gray-800 border-[${token.color}] text-white`
                          : 'bg-black border-gray-800 text-gray-500 hover:border-gray-600'
                    }`}
                    style={{ borderColor: !token.disabled && selectedToken.id === token.id ? token.color : undefined }}
                  >
                    <div className="text-center">
                      <span className="block font-bold">{token.symbol}</span>
                      <span className="text-[10px] text-gray-400 block">{token.network}</span>
                      {token.comingSoon && (
                        <span className="text-[9px] text-gray-500 font-normal block mt-0.5">Coming Soon</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Address Display */}
            <div className="mb-6 p-3 bg-black rounded-lg border border-gray-800">
               <div className="flex justify-between items-center mb-1">
                 <span className="text-xs text-gray-500">Recipient Address ({selectedToken.network})</span>
                 {hasAddress ? (
                   <span className="text-xs text-green-500 flex items-center"><Zap size={10} className="mr-1"/>Active</span>
                 ) : (
                   <span className="text-xs text-red-500">Not Setup</span>
                 )}
               </div>
               <p className="font-mono text-xs text-gray-300 break-all">
                 {currentAddress || "Waiter hasn't set up this wallet"}
               </p>
            </div>

            <div className="mb-8">
               <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Tip Amount ({selectedToken.symbol})</label>
               <div className="grid grid-cols-3 gap-3 mb-4">
                 {(selectedToken.id === 'hbar' ? [50, 100, 200] : selectedToken.id === 'usdc_hedera' ? [5, 10, 20] : [5, 10, 20]).map((val) => (
                   <button
                     key={val}
                     onClick={() => setAmount(val.toString())}
                     className={`py-3 rounded-xl font-medium transition-all border ${amount === val.toString() ? 'border-white bg-white text-black' : 'border-gray-700 bg-black text-gray-400 hover:border-gray-500'}`}
                   >
                     {val}
                   </button>
                 ))}
               </div>
               <div className="relative">
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black text-white p-4 pr-16 border border-gray-700 rounded-xl text-lg font-bold outline-none focus:border-white transition-colors"
                    placeholder="Custom amount"
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold text-sm">
                     {selectedToken.symbol}
                  </span>
               </div>
            </div>

            {/* Cover Platform Fee Checkbox */}
            {amount && parseFloat(amount) > 0 && (
              <div className="mb-8 p-4 bg-black/60 border border-gray-800 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={coverFee}
                    onChange={(e) => setCoverFee(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded bg-black border-gray-700 text-[#00eb78] focus:ring-[#00eb78] focus:ring-2 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold text-sm">Cover 5% platform fee</span>
                      {coverFee && (
                        <span className="text-xs bg-[#00eb78] text-black px-2 py-0.5 rounded-full font-bold">
                          +{(parseFloat(amount) * 0.05).toFixed(2)} {selectedToken.symbol}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {coverFee ? (
                        <>
                          Total: <span className="text-white font-bold">{(parseFloat(amount) * 1.05).toFixed(2)} {selectedToken.symbol}</span>
                          {' '}(Waiter receives full {amount} {selectedToken.symbol})
                        </>
                      ) : (
                        <>
                          Waiter receives: <span className="text-gray-300">{(parseFloat(amount) * 0.95).toFixed(2)} {selectedToken.symbol}</span>
                          {' '}after 5% platform fee
                        </>
                      )}
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Rating Section */}
            <div className="mb-6">
               <div className="flex items-center justify-between mb-3">
                 <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Rating (Optional)</label>
                 {selectedToken.id === 'hbar' && isHederaConnected && rating > 0 && (
                   <div className="flex items-center gap-1 text-xs text-[#00eb78]">
                     <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                       <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                     </svg>
                     <span className="font-medium">Saved to blockchain</span>
                   </div>
                 )}
               </div>
               <div className="flex items-center justify-center gap-2">
                 <StarRating
                   rating={rating}
                   onRatingChange={setRating}
                   size={32}
                   color="#00eb78"
                 />
                 {rating > 0 && (
                   <span className="text-gray-400 text-sm ml-2">
                     {rating} {rating === 1 ? 'star' : 'stars'}
                   </span>
                 )}
               </div>
            </div>

            <div className="mb-8">
               <div className="flex items-center justify-between mb-3">
                 <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Review (Optional)</label>
                 {selectedToken.id === 'hbar' && isHederaConnected && review && (
                   <div className="flex items-center gap-1 text-xs text-[#00eb78]">
                     <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                       <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                     </svg>
                     <span className="font-medium">Saved to blockchain</span>
                   </div>
                 )}
               </div>
               <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl outline-none focus:border-white transition-colors placeholder-gray-600 resize-none"
                    placeholder="Great service!"
                    rows={2}
               />
               {selectedToken.id === 'hbar' && isHederaConnected && (review || rating > 0) && (
                 <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                   <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                   </svg>
                   Your review will be permanently recorded on Hedera blockchain via HCS
                 </p>
               )}
            </div>

            {/* Hedera Wallet Connection Status */}
            {selectedToken.id === 'hbar' && (
              <div className="mb-6">
                {isHederaConnected ? (
                  <div className="p-4 bg-green-900/20 border border-green-700 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-green-400">Hedera Wallet Connected</span>
                      </div>
                      <button
                        onClick={disconnectHederaWallet}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 font-mono">
                      Account: {hederaAccountId}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={connectHederaWallet}
                    disabled={isHederaConnecting}
                    className="w-full bg-[#00eb78] hover:bg-[#00c96d] text-black font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,235,120,0.3)] disabled:opacity-50"
                  >
                    {isHederaConnecting ? (
                      'Connecting...'
                    ) : (
                      <>
                        <LinkIcon size={20} />
                        Connect Hedera Wallet
                      </>
                    )}
                  </button>
                )}
                {hederaError && (
                  <p className="text-xs text-red-400 mt-2">{hederaError}</p>
                )}
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={!amount || loading || !hasAddress || (selectedToken.id === 'hbar' && !isHederaConnected)}
              className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
               {loading ? 'Processing...' : (
                 <>
                   <Wallet size={20} />
                   {selectedToken.id === 'hbar' && !isHederaConnected ? 'Connect Wallet First' : `Pay on ${selectedToken.network}`}
                 </>
               )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'success') {
    const tipAmount = parseFloat(amount);
    const totalPaid = coverFee ? tipAmount * 1.05 : tipAmount;
    const waiterReceived = coverFee ? tipAmount : tipAmount * 0.95;

    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center font-sans relative">
        <div className="bg-[#181818] p-8 rounded-full border border-gray-800 mb-8 relative">
          <div className="absolute inset-0 bg-[#00eb78] blur-3xl opacity-20 rounded-full"></div>
          <Coins size={64} color={selectedToken.color} className="relative z-10" />
        </div>

        <h2 className="text-4xl font-bold text-white mb-2">Success!</h2>
        <p className="text-gray-400 max-w-xs mx-auto mb-10 text-lg">
          Your tip was sent to <span className="text-white font-medium">{waiterData?.name}</span> via {selectedToken.network}.
        </p>

        <div className="bg-[#181818] p-6 rounded-2xl border border-gray-800 w-full max-w-sm text-left mb-8 space-y-4">
           <div className="flex justify-between items-center pb-4 border-b border-gray-800">
             <span className="text-gray-500 text-sm">You Paid</span>
             <span className="font-bold text-2xl text-white">{totalPaid.toFixed(2)} <span className="text-sm text-gray-500 font-normal">{selectedToken.symbol}</span></span>
           </div>

           <div className="flex justify-between items-center">
             <span className="text-gray-500 text-sm">Waiter Received</span>
             <span className="text-white font-bold">{waiterReceived.toFixed(2)} {selectedToken.symbol}</span>
           </div>

           {coverFee && (
             <div className="flex justify-between items-center">
               <span className="text-gray-500 text-sm">Platform Fee (Covered)</span>
               <span className="text-[#00eb78] font-semibold text-sm">+{(tipAmount * 0.05).toFixed(2)} {selectedToken.symbol}</span>
             </div>
           )}

           {!coverFee && (
             <div className="flex justify-between items-center">
               <span className="text-gray-500 text-sm">Platform Fee (5%)</span>
               <span className="text-gray-400 text-sm">{(tipAmount * 0.05).toFixed(2)} {selectedToken.symbol}</span>
             </div>
           )}

           <div className="flex justify-between items-center pt-4 border-t border-gray-800">
             <span className="text-gray-500 text-sm">Network</span>
             <span className="font-mono text-xs text-black px-2 py-1 rounded" style={{backgroundColor: selectedToken.color}}>
                {selectedToken.network}
             </span>
           </div>

           {transactionId && selectedToken.id === 'hbar' && (
             <div className="pt-4 border-t border-gray-800">
               <span className="text-gray-500 text-sm block mb-2">Transaction ID</span>
               <p className="font-mono text-xs text-gray-300 break-all bg-black p-3 rounded-lg">
                 {transactionId}
               </p>
             </div>
           )}
        </div>

        <button 
          onClick={() => setView('landing')}
          className="bg-white hover:bg-gray-200 text-black font-bold py-4 px-12 rounded-full shadow-lg transition-all"
        >
          Done
        </button>
      </div>
    );
  }

  return null;
}