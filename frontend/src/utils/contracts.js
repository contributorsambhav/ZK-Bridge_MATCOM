import { ethers } from 'ethers';
import {
  CHAINS,
  BRIDGE_TOKEN_ABI,
  SEPOLIA_BRIDGE_ABI,
  WRAPPED_TOKEN_ABI,
  SONIC_BRIDGE_ABI,
  CONTRACT_ADDRESSES,
  API_URL,
} from './constants';

/**
 * Fetch contract addresses from the backend (populated after deployment)
 */
export async function fetchConfig() {
  try {
    const res = await fetch(`${API_URL}/config`);
    if (res.ok) {
      const data = await res.json();
      CONTRACT_ADDRESSES.sepolia.token = data.sepolia.tokenAddress;
      CONTRACT_ADDRESSES.sepolia.bridge = data.sepolia.bridgeAddress;
      CONTRACT_ADDRESSES.sonic.token = data.sonic.tokenAddress;
      CONTRACT_ADDRESSES.sonic.bridge = data.sonic.bridgeAddress;
      return data;
    }
  } catch (err) {
    console.warn('Backend not available, using hardcoded addresses');
  }
  return null;
}

/**
 * Get an ethers provider for a given chain
 */
export function getProvider(chain) {
  const config = CHAINS[chain];
  if (!config) throw new Error(`Unknown chain: ${chain}`);
  return new ethers.JsonRpcProvider(config.rpcUrl);
}

/**
 * Request wallet connection and return signer
 */
export async function connectWallet() {
  if (!window.ethereum) {
    window.open('https://metamask.io/download/', '_blank');
    throw new Error('MetaMask or compatible wallet not found. Please install MetaMask.');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  
  // Force add both networks
  const networksToAdd = ['sepolia', 'sonic'];
  for (const chain of networksToAdd) {
    const config = CHAINS[chain];
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: config.chainIdHex,
            chainName: config.name,
            rpcUrls: [config.rpcUrl],
            nativeCurrency: {
              name: config.currency,
              symbol: config.symbol,
              decimals: 18,
            },
            blockExplorerUrls: [config.explorer],
          },
        ],
      });
    } catch (err) {
      console.warn(`Could not add network ${config.name}:`, err);
    }
  }

  const signer = await provider.getSigner();
  // Get network again in case it was changed by the add requests
  const network = await provider.getNetwork();

  return {
    provider,
    signer,
    address: accounts[0],
    chainId: Number(network.chainId),
  };
}

/**
 * Switch wallet to a specific network
 */
export async function switchNetwork(chain) {
  const config = CHAINS[chain];
  if (!config) throw new Error(`Unknown chain: ${chain}`);

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: config.chainIdHex }],
    });
  } catch (err) {
    // Chain not added, try to add it
    if (err.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: config.chainIdHex,
            chainName: config.name,
            rpcUrls: [config.rpcUrl],
            nativeCurrency: {
              name: config.currency,
              symbol: config.symbol,
              decimals: 18,
            },
            blockExplorerUrls: [config.explorer],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

/**
 * Get token balance for an address
 */
export async function getTokenBalance(chain, address) {
  const provider = getProvider(chain);
  const tokenAddr = CONTRACT_ADDRESSES[chain]?.token;
  if (!tokenAddr) return '0';

  const token = new ethers.Contract(tokenAddr, BRIDGE_TOKEN_ABI, provider);
  const balance = await token.balanceOf(address);
  return ethers.formatEther(balance);
}

/**
 * Get native balance (ETH or S)
 */
export async function getNativeBalance(chain, address) {
  const provider = getProvider(chain);
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

/**
 * Approve bridge to spend tokens
 */
export async function approveTokens(chain, amount) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const tokenAddr = CONTRACT_ADDRESSES[chain]?.token;
  const bridgeAddr = CONTRACT_ADDRESSES[chain]?.bridge;
  if (!tokenAddr || !bridgeAddr) throw new Error('Contract addresses not configured');

  const abi = chain === 'sepolia' ? BRIDGE_TOKEN_ABI : WRAPPED_TOKEN_ABI;
  const token = new ethers.Contract(tokenAddr, abi, signer);

  const amountWei = ethers.parseEther(amount);
  const tx = await token.approve(bridgeAddr, amountWei);
  return tx;
}

/**
 * Check token allowance
 */
export async function checkAllowance(chain, ownerAddress) {
  const provider = getProvider(chain);
  const tokenAddr = CONTRACT_ADDRESSES[chain]?.token;
  const bridgeAddr = CONTRACT_ADDRESSES[chain]?.bridge;
  if (!tokenAddr || !bridgeAddr) return '0';

  const abi = chain === 'sepolia' ? BRIDGE_TOKEN_ABI : WRAPPED_TOKEN_ABI;
  const token = new ethers.Contract(tokenAddr, abi, provider);
  const allowance = await token.allowance(ownerAddress, bridgeAddr);
  return ethers.formatEther(allowance);
}

/**
 * Lock tokens on Sepolia (bridge to Sonic)
 */
export async function lockTokens(amount) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const bridgeAddr = CONTRACT_ADDRESSES.sepolia.bridge;
  if (!bridgeAddr) throw new Error('Sepolia bridge address not configured');

  const bridge = new ethers.Contract(bridgeAddr, SEPOLIA_BRIDGE_ABI, signer);
  const amountWei = ethers.parseEther(amount);
  const tx = await bridge.lockTokens(amountWei);
  return tx;
}

/**
 * Burn wrapped tokens on Sonic (bridge back to Sepolia)
 */
export async function burnWrappedTokens(amount) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const bridgeAddr = CONTRACT_ADDRESSES.sonic.bridge;
  if (!bridgeAddr) throw new Error('Sonic bridge address not configured');

  const bridge = new ethers.Contract(bridgeAddr, SONIC_BRIDGE_ABI, signer);
  const amountWei = ethers.parseEther(amount);
  const tx = await bridge.burnWrapped(amountWei);
  return tx;
}

/**
 * Truncate address for display
 */
export function truncateAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get chain name from chainId
 */
export function getChainFromId(chainId) {
  if (chainId === CHAINS.sepolia.chainId) return 'sepolia';
  if (chainId === CHAINS.sonic.chainId) return 'sonic';
  return null;
}

/**
 * Fetch relayer status
 */
export async function fetchRelayerStatus() {
  try {
    const res = await fetch(`${API_URL}/status`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed to fetch relayer status');
  }
  return null;
}

/**
 * Fetch recent transactions
 */
export async function fetchTransactions() {
  try {
    const res = await fetch(`${API_URL}/transactions`);
    if (res.ok) {
      const data = await res.json();
      return data.transactions || [];
    }
  } catch (err) {
    console.warn('Failed to fetch transactions');
  }
  return [];
}

/**
 * Request test tokens from the faucet
 */
export async function requestFaucet(address) {
  try {
    const res = await fetch(`${API_URL}/faucet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to request faucet');
    }
    return data;
  } catch (err) {
    console.error('Faucet request error:', err);
    throw err;
  }
}
