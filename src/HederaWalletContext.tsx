import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  DAppConnector,
  HederaSessionEvent,
  HederaJsonRpcMethod,
  HederaChainId,
} from '@hashgraph/hedera-wallet-connect';
import {
  LedgerId,
  AccountId,
  TransferTransaction,
  Hbar,
  TopicMessageSubmitTransaction,
  TopicId,
} from '@hashgraph/sdk';

// --- TYPES ---
export interface ReviewData {
  waiterName: string;
  waiterId: string;
  restaurant: string;
  rating?: number;
  comment: string;
  tipAmount: number;
  timestamp: number;
}

interface HederaWalletContextType {
  accountId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  sendHbarTransfer: (toAccountId: string, amount: number) => Promise<string>;
  submitReview: (reviewData: ReviewData) => Promise<string>;
  error: string | null;
}

const HederaWalletContext = createContext<HederaWalletContextType | undefined>(undefined);

// --- WALLET CONNECT PROJECT ID ---
const WALLETCONNECT_PROJECT_ID = 'aac7ba2b84124b57344a78c0e1122d59';

// --- HCS TOPIC ID FOR REVIEWS ---
// You need to create a topic using Hedera SDK or HashScan
// For testnet, you can create one with: new TopicCreateTransaction()
// For now, using a placeholder - you should create your own topic
const REVIEWS_TOPIC_ID = '0.0.5158297'; // Replace with your actual topic ID

// --- PROVIDER ---
export const HederaWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dAppConnector, setDAppConnector] = useState<DAppConnector | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize DAppConnector
  useEffect(() => {
    const initConnector = async () => {
      try {
        const metadata = {
          name: 'Ez Crypto Tips',
          description: 'Multi-chain tipping platform for service workers',
          url: window.location.origin,
          icons: ['https://avatars.githubusercontent.com/u/31002956'],
        };

        const connector = new DAppConnector(
          metadata,
          LedgerId.TESTNET, // Use TESTNET for development, change to MAINNET for production
          WALLETCONNECT_PROJECT_ID,
          Object.values(HederaJsonRpcMethod),
          [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
          [HederaChainId.Testnet]
        );

        // Initialize with error logging
        await connector.init({ logger: 'error' });

        setDAppConnector(connector);

        // Check if already connected from previous session
        const sessions = connector.walletConnectClient?.session.getAll();
        if (sessions && sessions.length > 0) {
          const session = sessions[0];
          const hederaAccount = session.namespaces?.hedera?.accounts?.[0];
          if (hederaAccount) {
            const parts = hederaAccount.split(':');
            const accountIdStr = parts[parts.length - 1];
            setAccountId(accountIdStr);
            setIsConnected(true);
          }
        }

        // Listen for session events
        connector.onSessionIframeCreated = (session) => {
          console.log('Session created:', session);
          const hederaAccount = session.namespaces?.hedera?.accounts?.[0];
          if (hederaAccount) {
            const parts = hederaAccount.split(':');
            const accountIdStr = parts[parts.length - 1];
            setAccountId(accountIdStr);
            setIsConnected(true);
          }
        };

      } catch (err) {
        console.error('Failed to initialize DAppConnector:', err);
        setError('Failed to initialize wallet connector');
      }
    };

    initConnector();
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (!dAppConnector) {
      setError('Wallet connector not initialized');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Open WalletConnect modal
      await dAppConnector.openModal();

      // After modal closes, check connection
      const sessions = dAppConnector.walletConnectClient?.session.getAll();
      if (sessions && sessions.length > 0) {
        const session = sessions[0];
        const hederaAccount = session.namespaces?.hedera?.accounts?.[0];
        if (hederaAccount) {
          const parts = hederaAccount.split(':');
          const accountIdStr = parts[parts.length - 1];
          setAccountId(accountIdStr);
          setIsConnected(true);
        }
      }
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, [dAppConnector]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    if (dAppConnector) {
      try {
        dAppConnector.disconnectAll();
        setAccountId(null);
        setIsConnected(false);
      } catch (err) {
        console.error('Failed to disconnect:', err);
      }
    }
  }, [dAppConnector]);

  // Send HBAR transfer
  const sendHbarTransfer = useCallback(
    async (toAccountId: string, amount: number): Promise<string> => {
      if (!dAppConnector || !accountId) {
        throw new Error('Wallet not connected');
      }

      try {
        setError(null);

        // Create transfer transaction
        const transaction = new TransferTransaction()
          .addHbarTransfer(AccountId.fromString(accountId), new Hbar(-amount))
          .addHbarTransfer(AccountId.fromString(toAccountId), new Hbar(amount))
          .setTransactionMemo('Tip via Ez Crypto Tips');

        // Freeze transaction
        const frozenTransaction = await transaction.freezeWithSigner(
          dAppConnector.getSigner(AccountId.fromString(accountId))
        );

        // Convert transaction to bytes
        const transactionBytes = frozenTransaction.toBytes();
        const transactionBase64 = Buffer.from(transactionBytes).toString('base64');

        // Sign and execute transaction
        const result = await dAppConnector.signAndExecuteTransaction({
          signerAccountId: `hedera:testnet:${accountId}`,
          transactionList: transactionBase64,
        });

        console.log('Transaction result:', result);

        // Extract transaction ID from result
        if (result && result.response) {
          return result.response.transactionId || 'Transaction submitted';
        }

        return 'Transaction submitted successfully';
      } catch (err: any) {
        console.error('Transfer failed:', err);
        setError(err.message || 'Transfer failed');
        throw err;
      }
    },
    [dAppConnector, accountId]
  );

  // Submit review to HCS
  const submitReview = useCallback(
    async (reviewData: ReviewData): Promise<string> => {
      if (!dAppConnector || !accountId) {
        throw new Error('Wallet not connected');
      }

      try {
        setError(null);

        // Prepare review message as JSON
        const reviewMessage = JSON.stringify({
          type: 'tip_review',
          version: '1.0',
          data: {
            waiterName: reviewData.waiterName,
            waiterId: reviewData.waiterId,
            restaurant: reviewData.restaurant,
            rating: reviewData.rating || null,
            comment: reviewData.comment,
            tipAmount: reviewData.tipAmount,
            timestamp: reviewData.timestamp,
            reviewerAccount: accountId,
          }
        });

        console.log('[HCS] Submitting review to topic:', REVIEWS_TOPIC_ID);
        console.log('[HCS] Review data:', reviewMessage);

        // Create topic message submit transaction
        const transaction = new TopicMessageSubmitTransaction()
          .setTopicId(TopicId.fromString(REVIEWS_TOPIC_ID))
          .setMessage(reviewMessage);

        // Freeze transaction
        const frozenTransaction = await transaction.freezeWithSigner(
          dAppConnector.getSigner(AccountId.fromString(accountId))
        );

        // Convert transaction to bytes
        const transactionBytes = frozenTransaction.toBytes();
        const transactionBase64 = Buffer.from(transactionBytes).toString('base64');

        // Sign and execute transaction
        const result = await dAppConnector.signAndExecuteTransaction({
          signerAccountId: `hedera:testnet:${accountId}`,
          transactionList: transactionBase64,
        });

        console.log('[HCS] Review submitted successfully:', result);

        // Extract transaction ID from result
        if (result && result.response) {
          return result.response.transactionId || 'Review submitted to HCS';
        }

        return 'Review submitted successfully to blockchain';
      } catch (err: any) {
        console.error('[HCS] Review submission failed:', err);
        setError(err.message || 'Failed to submit review');
        throw err;
      }
    },
    [dAppConnector, accountId]
  );

  const value: HederaWalletContextType = {
    accountId,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    sendHbarTransfer,
    submitReview,
    error,
  };

  return (
    <HederaWalletContext.Provider value={value}>
      {children}
    </HederaWalletContext.Provider>
  );
};

// --- HOOK ---
export const useHederaWallet = () => {
  const context = useContext(HederaWalletContext);
  if (!context) {
    throw new Error('useHederaWallet must be used within HederaWalletProvider');
  }
  return context;
};
