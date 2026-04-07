# ZeroTrace Bridge

Cross-chain token bridge between **Ethereum Sepolia** and **Sonic Blaze** testnet using a Lock/Mint + Burn/Release architecture.

## Architecture

```
blockchain/   — Solidity smart contracts (Hardhat)
backend/      — Express.js relayer server
frontend/     — React + Vite UI
```

## Quick Start

### 1. Deploy Contracts

```bash
cd blockchain
npm install
# Deploy to Sepolia
npm run deploy:sepolia
# Deploy to Sonic Blaze
npm run deploy:sonic
```

Copy the output addresses into `backend/.env`.

### 2. Start Relayer Backend

```bash
cd backend
npm install
# Fill in contract addresses in .env first!
npm start
```

Runs on `https://zerotrace-bridge.onrender.com`

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Network Details

| | Sepolia | Sonic Blaze |
|---|---|---|
| Chain ID | 11155111 | 57054 |
| RPC | https://rpc.sepolia.org | https://rpc.blaze.soniclabs.com |
| Explorer | sepolia.etherscan.io | testnet.sonicscan.org |
| Faucet | sepoliafaucet.com | faucet.soniclabs.com |

## Token Flow

- **Sepolia → Sonic Blaze**: Lock ZT → Relayer mints wZT  
- **Sonic Blaze → Sepolia**: Burn wZT → Relayer releases ZT  

## Backend `.env` (after deployment)

```env
PRIVATE_KEY=...
SEPOLIA_RPC_URL=https://rpc.sepolia.org
SONIC_RPC_URL=https://rpc.blaze.soniclabs.com
SEPOLIA_TOKEN_ADDRESS=0x...
SEPOLIA_BRIDGE_ADDRESS=0x...
SONIC_TOKEN_ADDRESS=0x...
SONIC_BRIDGE_ADDRESS=0x...
PORT=3001
```
