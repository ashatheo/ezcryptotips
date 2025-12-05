import { ethers } from 'ethers';
import TipSplitterABI from '../contracts/HederaTipSplitter.json';

// Contract address from environment
const CONTRACT_ADDRESS = import.meta.env.VITE_TIP_SPLITTER_CONTRACT_ADDRESS;

/**
 * Convert Hedera Account ID (0.0.xxxxx) to EVM address
 * Hedera accounts can be represented as EVM addresses by converting the account number
 * to a 20-byte (40 hex characters) address
 */
export function hederaIdToEvmAddress(hederaId: string): string {
  // If it's already an EVM address, return it
  if (hederaId.startsWith('0x') && hederaId.length === 42) {
    return hederaId;
  }

  // Check if it's a Hedera ID format (0.0.xxxxx)
  if (!hederaId.startsWith('0.0.')) {
    throw new Error('Invalid Hedera ID or EVM address format');
  }

  // Extract the account number from Hedera ID
  const parts = hederaId.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid Hedera ID format. Expected: 0.0.xxxxx');
  }

  const accountNum = parseInt(parts[2], 10);
  if (isNaN(accountNum)) {
    throw new Error('Invalid account number in Hedera ID');
  }

  // Convert account number to EVM address (20 bytes = 40 hex chars)
  // Pad the account number to 40 hex characters
  const evmAddress = '0x' + accountNum.toString(16).padStart(40, '0');

  console.log(`[CONTRACT] Converted Hedera ID ${hederaId} to EVM address ${evmAddress}`);

  return evmAddress;
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
 * Convert EVM address to Hedera Contract ID
 * For use with Hedera SDK ContractExecuteTransaction
 */
export function evmAddressToHederaId(evmAddress: string): string {
  // If it's already a Hedera ID, return it
  if (evmAddress.startsWith('0.0.')) {
    return evmAddress;
  }

  // Remove 0x prefix
  const hex = evmAddress.startsWith('0x') ? evmAddress.slice(2) : evmAddress;

  // Convert hex to decimal
  const accountNum = parseInt(hex, 16);

  // Return in Hedera ID format
  const hederaId = `0.0.${accountNum}`;
  console.log(`[CONTRACT] Converted EVM address ${evmAddress} to Hedera ID ${hederaId}`);

  return hederaId;
}

/**
 * Get contract address
 * Should be in Hedera ID format (0.0.xxxxx) for use with ContractExecuteTransaction
 */
export function getContractAddress(): string {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured. Please set VITE_TIP_SPLITTER_CONTRACT_ADDRESS in .env');
  }

  // If it's an EVM address, convert to Hedera ID (fallback for legacy configs)
  if (CONTRACT_ADDRESS.startsWith('0x')) {
    console.warn('[CONTRACT] Contract address is in EVM format. Please update .env to use Hedera Contract ID (0.0.xxxxx)');
    return evmAddressToHederaId(CONTRACT_ADDRESS);
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
