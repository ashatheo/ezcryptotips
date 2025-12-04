# Ez Crypto Tips

Ez Crypto Tips is a non-custodial payment infrastructure for the hospitality industry. It enables instant peer-to-peer tips via QR codes, with automatic wallet detection and immutable on-chain reviews powered by Hedera Consensus Service (HCS).

**Testnet**: [ezcryptotips.web.app](https://ezcryptotips.web.app)

**Mainnet**: Coming soon at [www.ezcryptotips.app](https://www.ezcryptotips.app)

---

## Quick Start

### Installation

1. **Clone and install dependencies**

```bash
git clone https://github.com/ashatheo/ezcryptotips.git
cd ezcryptotips
npm install
```

2. **Set up environment variables**

Copy `.env.sample` to `.env` and configure:

```bash
cp .env.sample .env
```

Required variables:

```env
# Hedera
VITE_HEDERA_NETWORK=testnet
VITE_HCS_TOPIC_ID=0.0.5158297
VITE_WALLETCONNECT_PROJECT_ID=your_project_id

# Firebase
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

3. **Start the development server**

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

---

## Project Structure

```
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── ui/          # UI primitives (buttons, inputs)
│   │   └── StarRating.tsx
│   ├── contexts/        # React Context providers
│   │   └── AuthContext.tsx
│   ├── hooks/           # Custom React hooks
│   │   └── useWaiterRating.ts
│   ├── lib/             # Utilities
│   │   └── utils.ts
│   ├── App.tsx          # Main application component
│   ├── HederaWalletContext.tsx  # Hedera wallet integration
│   ├── firebase.ts      # Firebase configuration
│   └── main.tsx         # Application entry point
└── contracts/
    └── HederaTipSplitter.sol  # Smart contract (5% fee split)
```


