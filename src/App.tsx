import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Wallet, 
  User, 
  Share2, 
  Zap, 
  Coins,
  ArrowLeft
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
// In a real project, these values come from env variables
const firebaseConfig = JSON.parse(__firebase_config || '{}');

// Initialization (safe check for preview environment)
let db: any;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase not initialized (likely missing config in preview). Using Mock Mode.");
}

// --- CONSTANTS ---
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'ez-crypto-tips';

// Hedera Brand Colors
const HEDERA_GREEN = "#00eb78";
const HEDERA_BLACK = "#181818"; // Slightly lighter than pure black for cards

// --- TYPES ---
type WaiterProfile = {
  id?: string;
  name: string;
  restaurant: string;
  hederaId: string; // Waiter's Hedera Account ID
  bio?: string;
};

// --- MOCK DATA FOR PREVIEW ---
// Used if Firebase is unavailable
const MOCK_WAITER: WaiterProfile = {
  id: 'demo-waiter',
  name: 'Alex',
  restaurant: 'Burger Heroes',
  hederaId: '0.0.451923',
  bio: 'Saving for my own food truck! 🍔'
};

export default function App() {
  // State
  const [view, setView] = useState<'landing' | 'register' | 'pay' | 'success'>('landing');
  const [waiterData, setWaiterData] = useState<WaiterProfile | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [review, setReview] = useState<string>(''); // Review text state
  const [loading, setLoading] = useState(false);
  
  // Registration Form State (only Hedera ID needed now)
  const [regForm, setRegForm] = useState({
    name: '',
    restaurant: '',
    hederaId: '',
  });

  // --- NAVIGATION HELPERS ---
  
  // Emulate QR code scanning (navigates to specific waiter's payment page)
  const openPaymentPage = (profile: WaiterProfile) => {
    setWaiterData(profile);
    setAmount(''); // Reset state when opening pay view
    setReview(''); // Reset review state
    setView('pay');
  };

  // --- ACTIONS ---

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (db) {
        // Save to Firestore
        const docRef = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'waiters'), {
          ...regForm,
          createdAt: serverTimestamp()
        });
        
        const newProfile = { ...regForm, id: docRef.id };
        setWaiterData(newProfile);
        alert(`Profile created! ID: ${docRef.id}`);
        openPaymentPage(newProfile); // Show immediately as client sees it
      } else {
        // Mock mode
        setWaiterData({ ...regForm, id: 'mock-id' });
        openPaymentPage({ ...regForm, id: 'mock-id' });
      }
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Registration error. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // --- PAYMENT LOGIC (THE CORE) ---

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      await processPayment();
      setView('success');
    } catch (error) {
      alert("Payment cancelled or failed");
    } finally {
      setLoading(false);
    }
  };

  /**
   * HEDERA Payment Logic (Using EVM Smart Contract)
   * Calls the TipSplitter.sol contract deployed on Hedera EVM to split the tip and record the review.
   */
  const processPayment = async () => {
    console.log("--- HEDERA EVM SMART CONTRACT PAYMENT LOGIC START ---");
    // Waiter's Hedera ID (0.0.xxxxx) needs to be converted to a corresponding EVM address (0x...) 
    // for contract interaction. For simulation, we assume an EVM address is used.
    
    // In a real app: Call TipSplitter.sendTipAndReview(waiterEVMAddress, reviewText) via web3/ethers on Hedera EVM
    const evmAddressSim = '0x123...abc'; // Simulated EVM address derived from waiterData.hederaId
    
    const reviewPayload = review.trim() ? `\nReview: "${review.trim()}"` : '';
    
    alert(
      `[HEDERA EVM SMART CONTRACT SIMULATION]\n\n` +
      `Opening HashPack/MetaMask...\n\n` +
      `Calling Contract TipSplitter.sendTipAndReview()\n` +
      `Waiter EVM Address (Simulated): ${evmAddressSim}\n` +
      `Amount: ${amount} HBAR${reviewPayload}\n\n` +
      `Status: Transaction successfully executed (HSCS)`
    );
  };

  // --- VIEWS ---

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Abstract Background Element (Hedera Style) */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-[20%] -right-[20%] w-[60%] h-[60%] bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-[#00eb78]/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-md w-full text-center space-y-10 relative z-10">
          <div className="flex justify-center mb-6">
            <div className="border border-white/20 p-6 rounded-3xl bg-white/5 backdrop-blur-md shadow-2xl">
              <QrCode size={64} color={HEDERA_GREEN} />
            </div>
          </div>
          
          <div>
            <h1 className="text-5xl font-bold tracking-tighter text-white mb-2">
              Ez Crypto Tips
            </h1>
            <p className="text-[#00eb78] font-mono tracking-widest text-sm uppercase">Powered by Hedera EVM</p>
          </div>
          
          <p className="text-gray-400 text-lg leading-relaxed font-light">
            The future of tipping. Instant. Direct. <br/>
            Happiness is not in money, but  <span className="text-white font-medium">money brings happiness</span>.
          </p>

          <div className="grid gap-4 pt-8">
            <button 
              onClick={() => setView('register')}
              className="w-full bg-[#00eb78] hover:bg-[#00c96d] text-black font-bold py-4 px-6 rounded-full transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(0,235,120,0.3)] flex items-center justify-center gap-2"
            >
              <User size={20} />
              I am a Waiter (Create QR)
            </button>
            
            <button 
              onClick={() => openPaymentPage(MOCK_WAITER)}
              className="w-full bg-transparent hover:bg-white/10 text-white font-semibold py-4 px-6 rounded-full border border-white/30 transition-all flex items-center justify-center gap-2"
            >
              <Zap size={20} color={HEDERA_GREEN} />
              Demo Payment (Guest)
            </button>
          </div>
          
          <div className="pt-16 flex justify-center gap-6 text-[10px] uppercase tracking-widest text-gray-500 font-mono">
            <span className="flex items-center gap-1">Reviews are recorded on-chain and cannot be edited or deleted.</span>
            <span className="flex items-center gap-1">Low 5% service fee.</span>
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
            <p className="text-gray-400">Create your Ez Crypto Tips profile</p>
          </div>
          
          <form onSubmit={handleRegister} className="p-8 space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Your Name</label>
              <input 
                required
                type="text" 
                className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl focus:border-[#00eb78] focus:ring-1 focus:ring-[#00eb78] outline-none transition-all placeholder-gray-600"
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
                className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl focus:border-[#00eb78] focus:ring-1 focus:ring-[#00eb78] outline-none transition-all placeholder-gray-600"
                placeholder="Burger Heroes"
                value={regForm.restaurant}
                onChange={e => setRegForm({...regForm, restaurant: e.target.value})}
              />
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center justify-between">
                 Hedera Account ID
                 <span className="text-[10px] text-[#00eb78] bg-[#00eb78]/10 px-2 py-1 rounded">Required for payment</span>
              </label>
              <input 
                required
                type="text" 
                className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl focus:border-[#00eb78] focus:ring-1 focus:ring-[#00eb78] outline-none transition-all font-mono placeholder-gray-600"
                placeholder="0.0.xxxxx"
                value={regForm.hederaId}
                onChange={e => setRegForm({...regForm, hederaId: e.target.value})}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-4 bg-[#00eb78] hover:bg-[#00c96d] text-black font-bold py-4 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(0,235,120,0.2)] disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Generate QR Code'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'pay') {
    return (
      <div className="min-h-screen bg-black flex flex-col p-4 font-sans">
        <div className="max-w-md w-full mx-auto">
          {/* Back Button */}
          <button onClick={() => setView('landing')} className="text-gray-500 hover:text-white mb-6 transition-colors flex items-center gap-2">
            <ArrowLeft size={20} /> <span className="text-sm">Back to Ez Crypto Tips</span>
          </button>

          {/* Waiter Card */}
          <div className="bg-[#181818] border border-gray-800 rounded-3xl p-8 mb-6 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00eb78] to-transparent opacity-50"></div>
             
             <div className="w-24 h-24 bg-black rounded-full mx-auto mb-4 border border-gray-700 flex items-center justify-center text-3xl font-bold text-[#00eb78]">
                {waiterData?.name.charAt(0)}
             </div>
             <h2 className="text-2xl font-bold text-white mb-1">{waiterData?.name}</h2>
             <p className="text-gray-500 uppercase text-xs tracking-wider">{waiterData?.restaurant}</p>
          </div>

          {/* Payment Form */}
          <div className="bg-[#181818] border border-gray-800 rounded-3xl p-8">
            <div className="mb-8">
               <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Tip Amount</label>
               <div className="grid grid-cols-3 gap-3 mb-4">
                 {[10, 25, 50].map((val) => (
                   <button 
                     key={val}
                     onClick={() => setAmount(val.toString())}
                     className={`py-3 rounded-xl font-medium transition-all border ${amount === val.toString() ? 'border-[#00eb78] bg-[#00eb78]/10 text-[#00eb78]' : 'border-gray-700 bg-black text-gray-400 hover:border-gray-500'}`}
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
                    className="w-full bg-black text-white p-4 pr-16 border border-gray-700 rounded-xl text-lg font-bold outline-none focus:border-[#00eb78] transition-colors"
                    placeholder="Custom amount"
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold text-sm">
                     HBAR
                  </span>
               </div>
               <p className="text-[10px] text-[#00eb78] mt-3 flex items-center gap-1 font-mono">
                   <Zap size={10}/> LIGHTNING FAST ON HEDERA
               </p>
            </div>

            {/* Review Field */}
            <div className="mb-8">
               <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Review (Optional)</label>
               <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl outline-none focus:border-[#00eb78] transition-colors placeholder-gray-600 resize-none"
                    placeholder="Great service, thank you!"
                    rows={3}
               />
            </div>

            <button 
              onClick={handlePayment}
              disabled={!amount || loading}
              className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
               {loading ? 'Processing...' : (
                 <>
                   <Wallet size={20} />
                   Pay {amount || '0'} HBAR
                 </>
               )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'success') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="bg-[#181818] p-8 rounded-full border border-gray-800 mb-8 relative">
          <div className="absolute inset-0 bg-[#00eb78] blur-3xl opacity-20 rounded-full"></div>
          <Coins size={64} color={HEDERA_GREEN} className="relative z-10" />
        </div>
        
        <h2 className="text-4xl font-bold text-white mb-2">Success!</h2>
        <p className="text-gray-400 max-w-xs mx-auto mb-10 text-lg">
          Your tip was sent to <span className="text-white font-medium">{waiterData?.name}</span> via Ez Crypto Tips.
        </p>

        <div className="bg-[#181818] p-6 rounded-2xl border border-gray-800 w-full max-w-sm text-left mb-8 space-y-4">
           <div className="flex justify-between items-center pb-4 border-b border-gray-800">
             <span className="text-gray-500 text-sm">Total Amount</span>
             <span className="font-bold text-2xl text-white">{amount} <span className="text-sm text-gray-500 font-normal">HBAR</span></span>
           </div>
           
           {/* Display Review */}
           {review.trim() && (
             <div className="pt-4 border-t border-gray-800">
               <span className="text-gray-500 text-sm block mb-2">Review Left (Recorded On-Chain)</span>
               <p className="text-white italic text-sm p-3 bg-black/50 rounded-lg border border-gray-700">
                 "{review.trim()}"
               </p>
             </div>
           )}

           <div className="flex justify-between items-center">
             <span className="text-gray-500 text-sm">Recipient ID</span>
             <span className="font-mono text-xs text-[#00eb78] bg-[#00eb78]/10 px-2 py-1 rounded">
                {waiterData?.hederaId}
             </span>
           </div>
        </div>

        <button 
          onClick={() => setView('landing')}
          className="bg-[#00eb78] hover:bg-[#00c96d] text-black font-bold py-4 px-12 rounded-full shadow-[0_0_20px_rgba(0,235,120,0.4)] transition-all"
        >
          Done
        </button>
        
        {/* Token Rewards Teaser */}
        <div className="mt-12 p-1 border-t border-gray-900 w-full max-w-xs">
           <div className="mt-4 flex items-center gap-3 text-left">
              <div className="p-3 bg-gray-900 rounded-full text-purple-400">
                 <Share2 size={20}/>
              </div>
              <div>
                 <p className="text-xs font-bold text-gray-500 uppercase mb-0.5">Coming Soon</p>
                 <p className="text-sm text-white font-medium">Earn $THX tokens for tipping.</p>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return null;
}