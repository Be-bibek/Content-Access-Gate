import { create } from 'zustand';
import { Keypair, TransactionBuilder, Networks as SdkNetworks } from '@stellar/stellar-sdk';
import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { 
  initStellarKit, 
  fetchXlmBalance, 
  fundWithFriendbot, 
  buildPaywallTransaction, 
  getHorizonServer, 
  PLATFORM_RECEIVER_ADDRESS, 
  UNLOCK_FEE_XLM 
} from './stellar';

interface WalletState {
  publicKey: string | null;
  walletType: 'freighter' | 'sandbox' | null;
  sandboxSecret: string | null;
  balance: string;
  isUnlocked: boolean;
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  activeArticleId: string;
  
  // Actions
  setPublicKey: (key: string | null) => void;
  setBalance: (balance: string) => void;
  setError: (error: string | null) => void;
  setActiveArticleId: (id: string) => void;
  connectFreighter: () => Promise<void>;
  connectSandbox: () => Promise<void>;
  fundSandbox: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  submitUnlockPayment: () => Promise<boolean>;
  resetUnlocked: () => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  publicKey: null,
  walletType: null,
  sandboxSecret: null,
  balance: '0.0000',
  isUnlocked: false,
  isLoading: false,
  error: null,
  txHash: null,
  activeArticleId: 'getting-started-stellar',

  setPublicKey: (publicKey) => set({ publicKey }),
  setBalance: (balance) => set({ balance }),
  setError: (error) => set({ error }),
  setActiveArticleId: (activeArticleId) => set({ activeArticleId }),

  connectFreighter: async () => {
    set({ isLoading: true, error: null });
    try {
      initStellarKit();
      
      // Use the static class method to request wallet connection modal
      // This displays the options configured.
      const response = await StellarWalletsKit.authModal();
      
      if (response && response.address) {
        const address = response.address;
        set({ 
          publicKey: address, 
          walletType: 'freighter',
          sandboxSecret: null,
          isLoading: false 
        });
        // Fetch balance
        const bal = await fetchXlmBalance(address);
        set({ balance: bal });
      } else {
        throw new Error('No address returned from Freighter wallet.');
      }
    } catch (err: any) {
      console.error('Freighter connection error:', err);
      set({ 
        isLoading: false, 
        error: err.message || 'Could not connect to Freighter. Make sure the extension is installed and unlocked.' 
      });
    }
  },

  connectSandbox: async () => {
    set({ isLoading: true, error: null });
    try {
      // Check if we already have a sandbox keypair in local storage or state
      let secret = null;
      let pubKey = null;

      if (typeof window !== 'undefined') {
        secret = localStorage.getItem('stellar_sandbox_secret');
        pubKey = localStorage.getItem('stellar_sandbox_public');
      }

      let keypair: Keypair;
      if (secret) {
        keypair = Keypair.fromSecret(secret);
      } else {
        keypair = Keypair.random();
        secret = keypair.secret();
        pubKey = keypair.publicKey();
        if (typeof window !== 'undefined') {
          localStorage.setItem('stellar_sandbox_secret', secret);
          localStorage.setItem('stellar_sandbox_public', pubKey);
        }
      }

      const address = keypair.publicKey();
      set({ 
        publicKey: address, 
        walletType: 'sandbox', 
        sandboxSecret: secret,
      });

      // Fetch balance. If inactive (0), attempt to fund once via Friendbot.
      let bal = await fetchXlmBalance(address);
      if (bal.includes('0.0000') || bal.includes('Inactive')) {
        // Fund using Friendbot
        const funded = await fundWithFriendbot(address);
        if (funded) {
          // Re-fetch balance
          bal = await fetchXlmBalance(address);
        }
      }

      set({ balance: bal, isLoading: false });
    } catch (err: any) {
      console.error('Sandbox creation error:', err);
      set({ isLoading: false, error: 'Failed to create Stellar sandbox wallet.' });
    }
  },

  fundSandbox: async () => {
    const { publicKey, walletType } = get();
    if (!publicKey || walletType !== 'sandbox') return;
    set({ isLoading: true, error: null });
    try {
      const funded = await fundWithFriendbot(publicKey);
      if (funded) {
        const bal = await fetchXlmBalance(publicKey);
        set({ balance: bal, isLoading: false });
      } else {
        throw new Error('Friendbot could not fund this address at this time.');
      }
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Friendbot funding failed.' });
    }
  },

  refreshBalance: async () => {
    const { publicKey } = get();
    if (!publicKey) return;
    try {
      const bal = await fetchXlmBalance(publicKey);
      set({ balance: bal });
    } catch (err) {
      console.error('Balance refresh error:', err);
    }
  },

  submitUnlockPayment: async () => {
    const { publicKey, walletType, sandboxSecret } = get();
    if (!publicKey) {
      set({ error: 'Please connect a wallet first.' });
      return false;
    }

    set({ isLoading: true, error: null, txHash: null });

    try {
      // 1. Build payment transaction
      const xdr = await buildPaywallTransaction(publicKey);

      let signedTx;

      // 2. Sign transaction depending on wallet type
      if (walletType === 'sandbox') {
        if (!sandboxSecret) throw new Error('Sandbox secret key is missing.');
        const keypair = Keypair.fromSecret(sandboxSecret);
        
        // Load the transaction from XDR
        const tx = TransactionBuilder.fromXDR(xdr, SdkNetworks.TESTNET);
        tx.sign(keypair);
        signedTx = tx;
      } else {
        // Freighter Module / Stellar Wallets Kit v2
        initStellarKit();
        const signedResponse = await StellarWalletsKit.signTransaction(xdr, {
          address: publicKey,
        });

        if (!signedResponse || !signedResponse.signedTxXdr) {
          throw new Error('Transaction signing declined or failed.');
        }
        signedTx = TransactionBuilder.fromXDR(signedResponse.signedTxXdr, SdkNetworks.TESTNET);
      }

      // 3. Submit to Horizon Testnet
      const server = getHorizonServer();
      const result = await server.submitTransaction(signedTx);

      if (result && result.hash) {
        set({ 
          txHash: result.hash, 
          isUnlocked: true, 
          isLoading: false 
        });
        // Refresh balance after payment
        const bal = await fetchXlmBalance(publicKey);
        set({ balance: bal });
        return true;
      } else {
        throw new Error('Transaction submission failed with empty response.');
      }
    } catch (err: any) {
      console.error('Payment submission failed:', err);
      let errorMsg = 'Failed to submit transaction to the Stellar Testnet.';
      
      if (err.response && err.response.data && err.response.data.extras && err.response.data.extras.result_codes) {
        const codes = err.response.data.extras.result_codes;
        if (codes.operations && codes.operations.includes('op_underfunded')) {
          errorMsg = 'Transaction failed: Your Stellar wallet balance is too low to cover the payment + transaction fee.';
        } else {
          errorMsg = `Stellar Error: ${codes.transaction || 'unknown'} - ${codes.operations ? codes.operations.join(', ') : ''}`;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }

      set({ isLoading: false, error: errorMsg });
      return false;
    }
  },

  resetUnlocked: () => {
    set({ isUnlocked: false, txHash: null });
  },

  disconnect: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('stellar_sandbox_secret');
      localStorage.removeItem('stellar_sandbox_public');
      try {
        StellarWalletsKit.disconnect();
      } catch (e) {
        console.warn('StellarWalletsKit static disconnect warning:', e);
      }
    }
    set({ 
      publicKey: null, 
      walletType: null, 
      sandboxSecret: null,
      balance: '0.0000', 
      isUnlocked: false, 
      isLoading: false, 
      error: null, 
      txHash: null 
    });
  }
}));
