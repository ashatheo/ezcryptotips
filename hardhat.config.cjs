require("dotenv").config();
require("@nomicfoundation/hardhat-verify");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: "hedera-testnet",
  networks: {
    "hedera-testnet": {
      url: "https://testnet.hashio.io/api",
      accounts: process.env.HEDERA_TESTNET_OPERATOR_PRIVATE_KEY
        ? [process.env.HEDERA_TESTNET_OPERATOR_PRIVATE_KEY]
        : [],
      chainId: 296, // Hedera testnet chain ID
      timeout: 60000
    },
    "hedera-mainnet": {
      url: "https://mainnet.hashio.io/api",
      accounts: process.env.HEDERA_MAINNET_OPERATOR_PRIVATE_KEY
        ? [process.env.HEDERA_MAINNET_OPERATOR_PRIVATE_KEY]
        : [],
      chainId: 295, // Hedera mainnet chain ID
      timeout: 60000
    },
    // Local development network
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  etherscan: {
    apiKey: {
      'hedera-testnet': 'UNUSED', // Hedera doesn't require API key
      'hedera-mainnet': 'UNUSED'
    },
    customChains: [
      {
        network: "hedera-testnet",
        chainId: 296,
        urls: {
          apiURL: "https://server-verify.hashscan.io",
          browserURL: "https://hashscan.io/testnet"
        }
      },
      {
        network: "hedera-mainnet",
        chainId: 295,
        urls: {
          apiURL: "https://server-verify.hashscan.io",
          browserURL: "https://hashscan.io/mainnet"
        }
      }
    ]
  },
  sourcify: {
    enabled: true,
    apiUrl: "https://server-verify.hashscan.io",
    browserUrl: "https://hashscan.io"
  }
};
