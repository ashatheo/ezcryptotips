# Ez Crypto Tips

A non-custodial, multi-chain tipping platform built on Hedera Hashgraph. It bridges the gap between Web3 and the real-world service industry by allowing guests to tip waiters instantly via QR code using HBAR, USDC, or USDT (supporting Hedera, Tron, and Base networks). Beyond payments, the platform utilizes the Hedera Consensus Service (HCS) to record customer reviews on-chain, creating an immutable "Proof-of-Service" reputation system for hospitality workers.

## Features

### Payment & Tipping
- **Real Hedera wallet integration** via WalletConnect - connect HashPack, Blade, or other Hedera wallets
- **Live HBAR transfers** - real blockchain transactions on Hedera network
- **Multi-chain ready**: Base (EVM) support (simulation mode, can be activated)
- **Unique QR Code generation** for each waiter - customers scan to tip instantly
- **URL-based waiter profiles** - share your unique QR code link

### Blockchain Reviews (HCS)
- **Immutable reviews** - Customer reviews permanently recorded on Hedera blockchain
- **Hedera Consensus Service (HCS)** - Timestamped, verifiable review data
- **Proof-of-Service** - Build an on-chain reputation system for service workers
- **Transparent & censorship-resistant** - No one can delete or modify reviews

### Infrastructure
- **Firebase integration** for waiter profiles and data storage
- **Responsive design** with dark theme
- **Real-time transaction feedback**

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Lucide React Icons
- react-qr-code

### Blockchain
- **Hedera SDK** (@hashgraph/sdk) - Blockchain transactions
- **Hedera Wallet Connect** (@hashgraph/hedera-wallet-connect) - Wallet integration
- **WalletConnect** - Multi-wallet support (HashPack, Blade, etc.)
- **Hedera Consensus Service (HCS)** - On-chain review storage

### Backend
- Firebase Firestore - Waiter profiles and app data

## How It Works

### For Waiters
1. **Register**: Fill out registration form with Hedera Account ID and/or Base wallet address
2. **Get QR Code**: Receive a unique QR code linking to your payment page
3. **Display**: Show the QR code to customers (print, digital display, or share the link)
4. **Receive Tips**: Get HBAR sent directly to your wallet
5. **Build Reputation**: Collect on-chain reviews that prove your service quality

### For Customers
1. **Scan QR Code**: Use phone camera to scan waiter's QR code
2. **Connect Wallet**: Connect your Hedera wallet (HashPack, Blade, etc.) via WalletConnect
3. **Choose Amount**: Select or enter tip amount in HBAR
4. **Write Review** (Optional): Leave a comment about the service
5. **Send Tip**: Confirm the transaction in your wallet
6. **Done!**: Tip is sent instantly, review is recorded on blockchain forever

### Behind the Scenes
- **Payment**: HBAR transfer executed on Hedera network via your connected wallet
- **Review Storage**: If a review is provided, it's submitted to Hedera Consensus Service (HCS)
- **Blockchain Record**: Both payment and review are permanently recorded with consensus timestamps
- **Proof-of-Service**: Reviews create verifiable on-chain reputation for service workers

## License

MIT License