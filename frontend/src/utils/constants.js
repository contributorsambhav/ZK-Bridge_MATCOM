// Chain configurations
export const CHAINS = {
  sepolia: {
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    name: 'Sepolia',
    shortName: 'SEP',
    currency: 'SepoliaETH',
    symbol: 'ETH',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorer: 'https://sepolia.etherscan.io',
    color: '#627eea',
    icon: '⟠',
  },
  sonic: {
    chainId: 14601,
    chainIdHex: '0x3909',
    name: 'Sonic Testnet',
    shortName: 'SONIC',
    currency: 'S',
    symbol: 'S',
    rpcUrl: 'https://rpc.testnet.soniclabs.com',
    explorer: 'https://testnet.sonicscan.org',
    color: '#00d4ff',
    icon: '◎',
  },
};

// Token info
export const TOKENS = {
  MCM: {
    name: 'MATCOM',
    symbol: 'MCM',
    decimals: 18,
    chain: 'sepolia',
  },
  wMCM: {
    name: 'Wrapped MATCOM',
    symbol: 'wMCM',
    decimals: 18,
    chain: 'sonic',
  },
};

// Contract ABIs (minimal for frontend)
export const BRIDGE_TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

export const SEPOLIA_BRIDGE_ABI = [
  'function lockTokens(uint256 amount) external',
  'function getLockedBalance() view returns (uint256)',
  'function nonce() view returns (uint256)',
  'event TokensLocked(address indexed sender, uint256 amount, uint256 nonce, uint256 timestamp)',
  'event TokensReleased(address indexed recipient, uint256 amount, uint256 nonce, uint256 timestamp)',
];

export const WRAPPED_TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export const SONIC_BRIDGE_ABI = [
  'function burnWrapped(uint256 amount) external',
  'function getTotalMinted() view returns (uint256)',
  'function nonce() view returns (uint256)',
  'event TokensBurned(address indexed sender, uint256 amount, uint256 nonce, uint256 timestamp)',
  'event TokensMinted(address indexed recipient, uint256 amount, uint256 nonce, uint256 timestamp)',
];

// Backend API URL
export const API_URL = 'http://localhost:3001/api';

// Contract addresses — update after deployment
export const CONTRACT_ADDRESSES = {
  sepolia: {
    token: '0x8249A4bFC5fE6E73d04b86d98059897a9903f44B',
    bridge: '0xee31e7AC6a76aC9e5721288CDEA41b16b2394D95',
  },
  sonic: {
    token: '0xfbDb8933B4dE7728795f6AFEDf4bD5E7e43fB04F',
    bridge: '0x105360f8a85a5Db5F515eD680E12Cd6c30f1324B',
  },
};
