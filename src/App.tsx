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
const firebaseConfig = JSON.parse(
  typeof __firebase_config !== 'undefined' ? __firebase_config : '{}'
);

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

// Brand Colors
const HEDERA_GREEN = "#00eb78";
const TRON_RED = "#FF0013";
const BASE_BLUE = "#0052FF";
const BRAND_BLACK = "#181818"; 

// --- TYPES ---
type WaiterProfile = {
  id?: string;
  name: string;
  restaurant: string;
  hederaId: string; // Hedera Account ID
  tronAddress?: string; // USDT TRC20
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
};

const AVAILABLE_TOKENS: TokenOption[] = [
  { id: 'hbar', name: 'Hedera', network: 'Hedera', symbol: 'HBAR', color: HEDERA_GREEN, addressKey: 'hederaId' },
  { id: 'usdt_trc20', name: 'Tron', network: 'TRC20', symbol: 'USDT', color: TRON_RED, addressKey: 'tronAddress' },
  { id: 'usdt_base', name: 'Base', network: 'Base', symbol: 'USDT', color: BASE_BLUE, addressKey: 'baseAddress' },
];

// --- MOCK DATA FOR PREVIEW ---
const MOCK_WAITER: WaiterProfile = {
  id: 'demo-waiter',
  name: 'Alex',
  restaurant: 'Burger Heroes',
  hederaId: '0.0.451923',
  tronAddress: 'TXj7...9x2A',
  baseAddress: '0x71C...9A21',
  bio: 'Saving for my own food truck! 🍔'
};

export default function App() {
  // State
  const [view, setView] = useState<'landing' | 'register' | 'pay' | 'success'>('landing');
  const [waiterData, setWaiterData] = useState<WaiterProfile | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [review, setReview] = useState<string>(''); 
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenOption>(AVAILABLE_TOKENS[0]);

  // Registration Form State
  const [regForm, setRegForm] = useState({
    name: '',
    restaurant: '',
    hederaId: '',
    tronAddress: '',
    baseAddress: '',
  });

  // --- NAVIGATION HELPERS ---
  
  const openPaymentPage = (profile: WaiterProfile) => {
    setWaiterData(profile);
    setAmount(''); 
    setReview(''); 
    setSelectedToken(AVAILABLE_TOKENS[0]); // Reset to default
    setView('pay');
  };

  // --- ACTIONS ---

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Basic validation: ensure at least one payment method is provided
      if (!regForm.hederaId && !regForm.tronAddress && !regForm.baseAddress) {
        alert("Please provide at least one payment address (Hedera, Tron, or Base).");
        setLoading(false);
        return;
      }

      if (db) {
        const docRef = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'waiters'), {
          ...regForm,
          createdAt: serverTimestamp()
        });
        
        const newProfile = { ...regForm, id: docRef.id };
        setWaiterData(newProfile);
        console.log(`Profile created! ID: ${docRef.id}`);
        openPaymentPage(newProfile); 
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

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      await processPayment(targetAddress);
      setView('success');
    } catch (error) {
      console.error("Payment cancelled or failed", error);
      alert("Payment failed. See console.");
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (address: string) => {
    const networkName = selectedToken.network;
    console.log(`--- STARTING ${networkName.toUpperCase()} PAYMENT ---`);
    console.log(`Token: ${selectedToken.symbol}`);
    console.log(`Recipient: ${address}`);
    console.log(`Amount: ${amount}`);
    
    let simulationMsg = "";

    if (selectedToken.id === 'hbar') {
       simulationMsg = `[HEDERA SIMULATION]\nCall Hedera SDK/HashPack\nTransfer ${amount} HBAR to ${address}`;
    } else if (selectedToken.id === 'usdt_trc20') {
       simulationMsg = `[TRON SIMULATION]\nCall TronWeb/TronLink\nTransfer ${amount} USDT (TRC20) to ${address}`;
    } else if (selectedToken.id === 'usdt_base') {
       simulationMsg = `[BASE SIMULATION]\nCall Wagmi/MetaMask (Base Chain)\nTransfer ${amount} USDT to ${address}`;
    }

    console.log(simulationMsg);
    // alert(simulationMsg); // Uncomment for explicit popup during demo
  };

  // --- VIEWS ---

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
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
            <p className="text-gray-400 font-mono tracking-widest text-xs uppercase">
              <span style={{color: HEDERA_GREEN}}>Hedera</span> • <span style={{color: TRON_RED}}>Tron</span> • <span style={{color: BASE_BLUE}}>Base</span>
            </p>
          </div>
          
          <p className="text-gray-400 text-lg leading-relaxed font-light">
            The future of tipping. Instant. Direct. <br/>
            Multi-chain support.
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
            <p className="text-gray-400">Set up your wallet addresses</p>
          </div>
          
          <form onSubmit={handleRegister} className="p-8 space-y-4">
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
                  <label className="block text-xs font-bold text-[#FF0013] mb-1">Tron Address (TRC20)</label>
                  <input 
                    type="text" 
                    className="w-full bg-black text-white p-3 border border-gray-700 rounded-xl focus:border-[#FF0013] outline-none font-mono text-sm"
                    placeholder="T..."
                    value={regForm.tronAddress}
                    onChange={e => setRegForm({...regForm, tronAddress: e.target.value})}
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
              {loading ? 'Creating...' : 'Generate QR Code'}
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
             <p className="text-gray-500 uppercase text-xs tracking-wider">{waiterData?.restaurant}</p>
          </div>

          {/* Payment Form */}
          <div className="bg-[#181818] border border-gray-800 rounded-3xl p-8">
            
            {/* Token Selection */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {AVAILABLE_TOKENS.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => setSelectedToken(token)}
                    className={`p-2 rounded-lg text-sm font-bold border transition-all ${
                      selectedToken.id === token.id 
                        ? `bg-gray-800 border-[${token.color}] text-white` 
                        : 'bg-black border-gray-800 text-gray-500 hover:border-gray-600'
                    }`}
                    style={{ borderColor: selectedToken.id === token.id ? token.color : undefined }}
                  >
                    {token.name}
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
                 {[5, 10, 20].map((val) => (
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

            <div className="mb-8">
               <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Review (Optional)</label>
               <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    className="w-full bg-black text-white p-4 border border-gray-700 rounded-xl outline-none focus:border-white transition-colors placeholder-gray-600 resize-none"
                    placeholder="Great service!"
                    rows={2}
               />
            </div>

            <button 
              onClick={handlePayment}
              disabled={!amount || loading || !hasAddress}
              className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
               {loading ? 'Processing...' : (
                 <>
                   <Wallet size={20} />
                   Pay on {selectedToken.network}
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
          <Coins size={64} color={selectedToken.color} className="relative z-10" />
        </div>
        
        <h2 className="text-4xl font-bold text-white mb-2">Success!</h2>
        <p className="text-gray-400 max-w-xs mx-auto mb-10 text-lg">
          Your tip was sent to <span className="text-white font-medium">{waiterData?.name}</span> via {selectedToken.network}.
        </p>

        <div className="bg-[#181818] p-6 rounded-2xl border border-gray-800 w-full max-w-sm text-left mb-8 space-y-4">
           <div className="flex justify-between items-center pb-4 border-b border-gray-800">
             <span className="text-gray-500 text-sm">Total Amount</span>
             <span className="font-bold text-2xl text-white">{amount} <span className="text-sm text-gray-500 font-normal">{selectedToken.symbol}</span></span>
           </div>
           
           <div className="flex justify-between items-center">
             <span className="text-gray-500 text-sm">Network</span>
             <span className="font-mono text-xs text-black px-2 py-1 rounded" style={{backgroundColor: selectedToken.color}}>
                {selectedToken.network}
             </span>
           </div>
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