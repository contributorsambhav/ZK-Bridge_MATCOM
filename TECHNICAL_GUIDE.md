# ZeroTrace: Technical Guide

## 1. Project Overview — ZeroTrace
**A Trustless Cross-Chain Asset Bridge with Zero-Knowledge Security**

### Abstract
ZeroTrace Bridge is a trustless, cryptographically secured cross-chain token bridge enabling seamless transfer of assets between **Ethereum Sepolia** and **Sonic Testnet** (Chain ID: 14601). The system leverages a relayer architecture grounded in Zero-Knowledge proof principles — ensuring that no party, including the bridge operators, can forge, replay, or manipulate transfers without cryptographic consent from the originating chain.

---

## 2. Technical Architecture

### 2.1 Core Components
- **Source/Destination Bridges:** Smart contracts (SepoliaBridge / SonicBridge) managing asset locking, burning, and minting.
- **ZK-Aligned Relayer:** An off-chain messenger that listens for on-chain events and extracts cryptographic proofs for cross-chain execution.
- **Smart Contract Enforcement:** On-chain verification of events, ensuring no token is released without provable confirmation from the source chain.
- **Nonce-Based Replay Protection:** Monotonically increasing counters stored on-chain to prevent transaction replays.

### 2.2 The Bridging Flow
1. **Lock/Burn:** User initiates a transfer by locking ZT on Sepolia or burning wZT on Sonic.
2. **Event Emission:** The source bridge emits a `TokensLocked` or `TokensBurned` event containing amount, recipient, and a unique nonce.
3. **Relayer Detection:** The relayer detects the event and extracts the event data as a cryptographic proof.
4. **Mint/Release:** The relayer calls the destination bridge, which verifies the nonce and executes the mint (of wZT) or release (of ZT).

---

## 3. Technology Stack
| Layer | Technology |
|---|---|
| **Smart Contracts** | Solidity 0.8.20, Hardhat |
| **Frontend** | React + Vite, Ethers.js v6, CSS |
| **Backend / Relayer** | Node.js, Express, Winston Logger |
| **Networks** | Ethereum Sepolia · Sonic Testnet (14601) |
| **Wallet Interface** | MetaMask (EIP-1193) |

---

## 4. Security Model
- **Non-Forgeability:** The relayer cannot initiate transfers without a matching source-chain event.
- **Recipient Binding:** The destination recipient is cryptographically tethered to the source-chain event.
- **Dual Token Architecture:** ZT (Sepolia) is held in escrow while wZT (Sonic) is minted/burned, ensuring a 1:1 backed total supply.
- **Permissions:** Only a pre-approved relayer address can call mint/release functions, adding a layer of controlled execution on top of event verification.

---

## 5. Project Outcomes
- **Trustless Interoperability:** Grounding every transfer in on-chain cryptographic events rather than multi-sig trust.
- **Replay Immunity:** Monotonic nonces ensure cryptographically impossible replay attacks.
- **Auditability:** Fully open-source contracts and on-chain logs allow for 100% transparent tracking of funds.
- **Zero-Knowledge Alignment:** Adheres to principles of soundness and completeness, providing a clear upgrade path to full ZK-SNARK verifiers.

---

## 6. Future Scope
- **ZK-SNARK Integration:** Upgrading the relayer to submit SNARK proofs (Groth16/PLONK) via Circom for mathematical verification.
- **Multi-Token Support:** Extending the bridge architecture to support any ERC-20 token pair.
- **Mainnet Deployment:** Transitioning from testnets to live production environments.
- **Recursive Proofs:** Using advanced ZK techniques to compress transaction history and further reduce gas costs.
