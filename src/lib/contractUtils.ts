import { ethers } from 'ethers';
import TipSplitterABI from '../contracts/HederaTipSplitter.json';

// Contract address from environment
const CONTRACT_ADDRESS = import.meta.env.VITE_TIP_SPLITTER_CONTRACT_ADDRESS;

/**
 * Convert Hedera Account ID (0.0.xxxxx) to EVM address
 * Note: This is a simplified conversion. For production, you should use proper conversion logic
 * or ensure waiters provide both Hedera ID and EVM address
 */
export function hederaIdToEvmAddress(hederaId: string): string {
  // For now, we'll just validate the format
  // In production, you'd need to convert properly or store both IDs
  if (!hederaId.startsWith('0.0.')) {
    // It might already be an EVM address
    return hederaId;
  }

  throw new Error('Please provide EVM address format (0x...) for contract interactions');
}

/**
 * Create contract call data for sendTip function
 * @param waiterAddress - EVM address of waiter
 * @param reviewCID - IPFS CID or review text
 * @returns Encoded function call data
 */
export function encodeSendTipData(waiterAddress: string, reviewCID: string = ''): string {
  const iface = new ethers.Interface(TipSplitterABI.abi);
  return iface.encodeFunctionData('sendTip', [waiterAddress, reviewCID]);
}

/**
 * Calculate tip split amounts
 * @param tipAmount - Total tip amount
 * @returns Object with waiter amount and platform fee
 */
export function calculateTipSplit(tipAmount: number): { waiterAmount: number; platformFee: number } {
  const PLATFORM_FEE_BPS = 500; // 5%
  const BASIS_POINTS = 10000;

  const platformFee = (tipAmount * PLATFORM_FEE_BPS) / BASIS_POINTS;
  const waiterAmount = tipAmount - platformFee;

  return {
    waiterAmount,
    platformFee
  };
}

/**
 * Get contract address
 */
export function getContractAddress(): string {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured. Please set VITE_TIP_SPLITTER_CONTRACT_ADDRESS in .env');
  }
  return CONTRACT_ADDRESS;
}

/**
 * Validate EVM address format
 */
export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Convert HBAR amount to tinybar (wei equivalent for Hedera)
 * 1 HBAR = 100,000,000 tinybar
 */
export function hbarToTinybar(hbar: number): bigint {
  return BigInt(Math.floor(hbar * 100_000_000));
}

/**
 * Convert tinybar to HBAR
 */
export function tinybarToHbar(tinybar: bigint): number {
  return Number(tinybar) / 100_000_000;
}
