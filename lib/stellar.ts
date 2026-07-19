import { Horizon, TransactionBuilder, BASE_FEE, Asset, Networks as SdkNetworks, Operation } from '@stellar/stellar-sdk';
import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';

// Platform destination address to receive paywall payments (Stellar Testnet public key)
export const PLATFORM_RECEIVER_ADDRESS = 'GAJ5E3R3B6F4J3CZH3KRE3W4T5D6E7R8Y9U0I1O2P3A4S5D6F7G8H9J0'; // Demo publisher address
export const UNLOCK_FEE_XLM = '5.0';

/**
 * Initialize the static Stellar Wallets Kit (v2 API)
 */
export function initStellarKit(): void {
  if (typeof window === 'undefined') return;
  
  StellarWalletsKit.init({
    network: Networks.TESTNET,
    modules: [new FreighterModule()],
  });
}

/**
 * Get the Horizon Testnet Server instance
 */
export function getHorizonServer(): Horizon.Server {
  return new Horizon.Server('https://horizon-testnet.stellar.org');
}

/**
 * Fetch native XLM balance for a public key
 */
export async function fetchXlmBalance(publicKey: string): Promise<string> {
  try {
    const server = getHorizonServer();
    const account = await server.loadAccount(publicKey);
    const nativeBalance = account.balances.find((b) => b.asset_type === 'native');
    return nativeBalance ? nativeBalance.balance : '0.0000';
  } catch (err: any) {
    if (err.response && err.response.status === 404) {
      // Account not activated yet
      return '0.0000 (Inactive)';
    }
    console.error('Error fetching balance:', err);
    return '0.0000';
  }
}

/**
 * Fund an inactive testnet account using Stellar's Friendbot
 */
export async function fundWithFriendbot(publicKey: string): Promise<boolean> {
  try {
    const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
    return response.ok;
  } catch (err) {
    console.error('Friendbot funding error:', err);
    return false;
  }
}

/**
 * Build a transaction to pay the lock fee (5 XLM) to unlock the premium article
 */
export async function buildPaywallTransaction(sourcePublicKey: string): Promise<string> {
  const server = getHorizonServer();
  const sourceAccount = await server.loadAccount(sourcePublicKey);

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: SdkNetworks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: PLATFORM_RECEIVER_ADDRESS,
        asset: Asset.native(),
        amount: UNLOCK_FEE_XLM,
      })
    )
    .setTimeout(180) // 3 minutes timeout
    .build();

  // Return transaction as XDR string
  return transaction.toXDR();
}
