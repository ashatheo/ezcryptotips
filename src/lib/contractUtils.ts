import { ethers } from 'ethers';
import TipSplitterABI from '../contracts/HederaTipSplitter.json';

// Contract address from environment
const CONTRACT_ADDRESS = import.meta.env.VITE_TIP_SPLITTER_CONTRACT_ADDRESS;

/**
 * Convert Hedera Account ID (0.0.xxxxx) to EVM address
 * Uses Hedera Mirror Node API to get the actual EVM address or alias
 * Supports 3 formats:
 * 1. No checksum: 0.0.7370967
 * 2. With checksum: 0.0.7370967-qqwnm
 * 3. EVM address: 0xe030c8f3763ca9d6743f2c7a2cf250fb377bf682
 * @param hederaId - Hedera account ID or EVM address
 * @returns Promise<string> - EVM address (0x...)
 */
export async function hederaIdToEvmAddress(hederaId: string): Promise<string> {
  // If it's already an EVM address, return it
  if (hederaId.startsWith('0x') && hederaId.length === 42) {
    console.log(`[CONTRACT] Address already in EVM format: ${hederaId}`);
    return hederaId;
  }

  // Check if it's a Hedera ID format (0.0.xxxxx or 0.0.xxxxx-checksum)
  if (!hederaId.startsWith('0.0.')) {
    throw new Error('Invalid Hedera ID or EVM address format');
  }

  // Remove checksum if present (format: 0.0.xxxxx-qqwnm)
  // Mirror Node API doesn't accept checksums
  const cleanHederaId = hederaId.split('-')[0];

  console.log(`[CONTRACT] Original input: ${hederaId}`);
  if (hederaId !== cleanHederaId) {
    console.log(`[CONTRACT] Removed checksum: ${cleanHederaId}`);
  }

  console.log(`[CONTRACT] Looking up EVM address for Hedera ID: ${cleanHederaId}`);

  try {
    // Query mirror node for account info
    const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${cleanHederaId}`);

    if (!response.ok) {
      throw new Error(`Mirror node returned ${response.status}: ${response.statusText}`);
    }

    const accountData = await response.json();

    // Get EVM address from mirror node response
    if (accountData.evm_address) {
      const evmAddress = accountData.evm_address;
      console.log(`[CONTRACT] ✅ Found EVM address for ${cleanHederaId}: ${evmAddress}`);
      return evmAddress;
    }

    // Fallback: If no EVM address exists, throw error
    // On Hedera, accounts without EVM alias cannot receive contract transfers
    throw new Error(`Account ${cleanHederaId} does not have an EVM address. Please use an account with EVM alias.`);

  } catch (error: any) {
    console.error(`[CONTRACT] Failed to get EVM address for ${cleanHederaId}:`, error);
    throw new Error(`Cannot convert Hedera ID to EVM address: ${error.message}`);
  }
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
