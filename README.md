# Ez Crypto Tips

A non-custodial, multi-chain tipping platform built on Hedera Hashgraph. It bridges the gap between Web3 and the real-world service industry by allowing guests to tip waiters instantly via QR code using HBAR, USDC, or USDT (supporting Hedera, Tron, and Base networks). Beyond payments, the platform utilizes the Hedera Consensus Service (HCS) to record customer reviews on-chain, creating an immutable "Proof-of-Service" reputation system for hospitality workers.

## Features

- **Multi-chain support**: Hedera, Tron (TRC20), and Base (EVM)
- **Unique QR Code generation** for each waiter - customers scan to tip instantly
- **Firebase integration** for waiter profiles and data storage
- **Responsive design** with dark theme
- **Real-time payment simulation**
- **URL-based waiter profiles** - share your unique QR code link

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Firebase Firestore
- Lucide React Icons
- react-qr-code

## Development

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## How It Works

1. **Waiter Registration**: Waiters fill out a registration form with their wallet addresses (Hedera, Tron, and/or Base)
2. **QR Code Generation**: After registration, a unique QR code is generated containing a link to the waiter's payment page
3. **Customer Tipping**: Customers scan the QR code, which opens the payment page with the waiter's profile
4. **Multi-chain Payments**: Customers can choose their preferred payment method and send tips directly

## Deployment

This project is configured for automatic deployment to GitHub Pages.

### Automatic Deployment

The project uses GitHub Actions for automatic deployment. When you push to the `main` branch, the application will be automatically built and deployed to GitHub Pages.

### Manual Deployment

If you prefer manual deployment:

```bash
npm run deploy
```

This command builds the project and deploys it to GitHub Pages using the `gh-pages` package.

### Repository Setup

1. Create a new repository on GitHub named `ezcryptotips`
2. Push your code to the `main` branch
3. Go to repository Settings > Pages
4. Set source to "GitHub Actions"

The application will be available at: `https://yourusername.github.io/ezcryptotips/`

### Firebase Configuration

For full functionality, you need to set up Firebase:

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Firestore Database
3. Add your Firebase config to environment variables or replace the placeholder in `src/App.tsx`

## Project Structure

```
src/
├── App.tsx          # Main application component with QR code generation
├── main.tsx         # Application entry point
├── index.css        # Global styles
└── TipSplitter.sol  # Smart contract (reference)

public/              # Static assets
.github/
└── workflows/
    └── deploy.yml   # GitHub Actions workflow
```

## License

MIT License