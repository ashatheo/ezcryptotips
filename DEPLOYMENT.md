# Smart Contract Deployment Guide

This guide will help you deploy the HederaTipSplitter contract to Hedera Testnet and Mainnet.

## Prerequisites

1. **Hedera Account**: Create an account at [Hedera Portal](https://portal.hedera.com)
2. **Testnet HBAR**: Get free testnet HBAR from [Hedera Faucet](https://portal.hedera.com/faucet)
3. **Node.js**: Version 16+ installed

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.sample` to `.env` and fill in your values:

```bash
cp .env.sample .env
```

Required variables for deployment:

```env
# Your Hedera private key (from Hedera Portal)
HEDERA_TESTNET_OPERATOR_PRIVATE_KEY=302e020100300506032b6570042204...

# Platform wallet address that will receive 5% fees
PLATFORM_WALLET_ADDRESS=0.0.123456
```

⚠️ **SECURITY WARNING**: Never commit your `.env` file or share your private key!

## Deployment Steps

### Test Compilation

First, verify the contract compiles correctly:

```bash
npx hardhat compile
```

Expected output:
```
Compiled 1 Solidity file successfully
```

### Deploy to Testnet

```bash
npx hardhat run scripts/deploy.js --network hedera-testnet
```

Expected output:
```
🚀 Deploying HederaTipSplitter contract to Hedera...

📋 Platform Wallet: 0.0.123456
🌐 Network: hedera-testnet
⛽ Chain ID: 296

📦 Deploying contract...

✅ Contract deployed successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Contract Address: 0x1234567890123456789012345678901234567890
🔗 HashScan URL: https://hashscan.io/testnet/contract/0x1234...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Verifying contract settings...
✓ Platform Wallet: 0.0.123456
✓ Platform Fee: 5% (500 basis points)

🧮 Test Split Calculation (100 HBAR):
  → Waiter receives: 95.0 HBAR
  → Platform fee: 5.0 HBAR

📝 Next Steps:
1. Add contract address to your .env file:
   VITE_TIP_SPLITTER_CONTRACT_ADDRESS=0x1234...
2. Update your frontend to use the contract
3. Test on testnet before mainnet deployment

🎉 Deployment complete!
```

### Deploy to Mainnet

⚠️ **WARNING**: Only deploy to mainnet after thorough testing on testnet!

```bash
npx hardhat run scripts/deploy.js --network hedera-mainnet
```

## Post-Deployment

### 1. Update Frontend Configuration

Add the deployed contract address to your `.env` file:

```env
VITE_TIP_SPLITTER_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
```

### 2. Verify on HashScan

Visit HashScan to verify your contract:

- **Testnet**: `https://hashscan.io/testnet/contract/YOUR_CONTRACT_ADDRESS`
- **Mainnet**: `https://hashscan.io/mainnet/contract/YOUR_CONTRACT_ADDRESS`

### 3. Test Contract Functions

Use the HashScan interface or create a test script to verify:

- `sendTip()` - Send a tip with automatic fee split
- `calculateSplit()` - Calculate split amounts
- `getPlatformFeeBPS()` - Verify 5% fee (500 basis points)
- `platformWallet()` - Verify platform wallet address

## Contract Details

### HederaTipSplitter

- **Purpose**: Automatically split tips with 5% platform fee
- **Fee**: 5% (500 basis points)
- **Split Logic**: 95% to waiter, 5% to platform
- **Review Storage**: IPFS CID stored on-chain via event

### Key Functions

```solidity
// Send a tip with automatic split
function sendTip(address payable waiter, string memory reviewCID) external payable

// Calculate split amounts
function calculateSplit(uint256 tipAmount) external pure returns (uint256 waiterAmount, uint256 platformFee)

// Update platform wallet (admin only)
function updatePlatformWallet(address newPlatformWallet) external onlyPlatform
```

## Troubleshooting

### "Invalid platform wallet" Error

- Make sure `PLATFORM_WALLET_ADDRESS` is set in `.env`
- Verify it's a valid Hedera account ID (format: 0.0.XXXXX)

### "Insufficient funds" Error

- Check your account balance on Hedera Portal
- For testnet: Get free HBAR from faucet
- For mainnet: Ensure you have enough HBAR for deployment (~$5-10 USD)

### Compilation Errors

```bash
# Clear cache and recompile
npx hardhat clean
npx hardhat compile
```

## Security Best Practices

1. ✅ **Never commit private keys** - Use `.gitignore` for `.env`
2. ✅ **Test on testnet first** - Always deploy to testnet before mainnet
3. ✅ **Verify contract code** - Check on HashScan after deployment
4. ✅ **Use hardware wallet for mainnet** - For production deployments
5. ✅ **Monitor contract activity** - Set up alerts on HashScan

## Cost Estimates

### Testnet (Free)

- Deployment: ~$0 (free testnet HBAR)
- Each tip transaction: ~$0.001 USD

### Mainnet

- Deployment: ~$5-10 USD (one-time)
- Each tip transaction: ~$0.001 USD

## Support

- **Hedera Documentation**: https://docs.hedera.com
- **HashScan Explorer**: https://hashscan.io
- **Hedera Discord**: https://discord.hedera.com
- **Ez Crypto Tips**: https://github.com/ashatheo/ezcryptotips

## License

MIT
