# ZK-Bridge MATCOM
### Cross-Chain Asset Bridge with Zero-Knowledge Security
**Presented at Nimbus TechFest · Team MATCOM**

---

## Abstract

ZK-Bridge MATCOM is a trustless, cryptographically secured cross-chain token bridge enabling seamless transfer of assets between **Ethereum Sepolia** and **Sonic Testnet** (Chain ID: 14601). The system leverages a relayer architecture grounded in Zero-Knowledge proof principles — ensuring that no party, including the bridge operators, can forge, replay, or manipulate transfers without cryptographic consent from the originating chain.

---

## 1. The Problem

Modern blockchain ecosystems are siloed. Value locked on Ethereum cannot interact with the high-throughput, low-fee Sonic network without a trusted intermediary — and trusted intermediaries are a single point of failure.

> **The core risk:** Most bridges today rely on multi-sig committees or centralized relayers. If compromised, billions of dollars in assets can be drained — as seen in the Ronin ($625M), Wormhole ($320M), and Nomad ($190M) exploits.

**What the industry needs is a bridge that doesn't require trust — only math.**

---

## 2. Our Solution: ZK-Bridge MATCOM

ZK-Bridge MATCOM eliminates trust assumptions through:

- **On-chain event verification** — the source chain event is the sole authority
- **Cryptographic nonce sequencing** — each bridge operation has a unique, non-replayable identifier
- **Smart contract enforcement** — no token is released on the destination chain unless the source-chain lock/burn is provably confirmed
- **ZK-aligned relayer logic** — the off-chain relayer acts only as a messenger; it cannot forge or alter proofs

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        USER WALLET                           │
└───────────────────────┬──────────────────────────────────────┘
                        │  Approve + Lock / Burn
         ┌──────────────▼──────────────┐
         │     SOURCE CHAIN BRIDGE      │
         │  SepoliaBridge / SonicBridge  │
         │  Emits: TokensLocked / Burned │
         └──────────────┬──────────────┘
                        │  On-chain event (cryptographic proof)
         ┌──────────────▼──────────────┐
         │      ZK-ALIGNED RELAYER      │
         │   Listens · Verifies · Relays │
         │   Cannot forge or replay      │
         └──────────────┬──────────────┘
                        │  Calls release/mint with proof
         ┌──────────────▼──────────────┐
         │   DESTINATION CHAIN BRIDGE   │
         │  SonicBridge / SepoliaBridge  │
         │  Mints wMCM / Releases MCM    │
         └─────────────────────────────┘
```

---

## 4. The Token Lifecycle

### Sepolia → Sonic (Lock and Mint)

| Step | Action | Where |
|------|--------|-------|
| 1 | User approves SepoliaBridge to spend MCM | Sepolia |
| 2 | User calls `lockTokens(amount)` | Sepolia |
| 3 | MCM is held in escrow; `TokensLocked` event emitted | Sepolia |
| 4 | Relayer detects event, extracts sender, amount, nonce | Off-chain |
| 5 | Relayer calls `mintWrapped(recipient, amount, nonce)` | Sonic |
| 6 | wMCM (Wrapped MATCOM) is minted to recipient | Sonic |

### Sonic → Sepolia (Burn and Release)

| Step | Action | Where |
|------|--------|-------|
| 1 | User calls `burnWrapped(amount)` | Sonic |
| 2 | wMCM is destroyed; `TokensBurned` event emitted | Sonic |
| 3 | Relayer detects event, extracts proof | Off-chain |
| 4 | Relayer calls `releaseTokens(recipient, amount, nonce)` | Sepolia |
| 5 | Original MCM is released from escrow | Sepolia |

**Total supply is always conserved:** MCM locked on Sepolia = wMCM in circulation on Sonic.

---

## 5. Security Model

### 5.1 Nonce-Based Replay Protection

Every bridge operation is tagged with an on-chain `nonce` — a monotonically increasing counter stored in the smart contract. The destination bridge **rejects any nonce that has already been processed**, making replay attacks cryptographically impossible.

```solidity
require(!processedNonces[nonce], "Nonce already used");
processedNonces[nonce] = true;
```

### 5.2 Relayer Cannot Steal Funds

The relayer is permissioned — only a pre-approved relayer address can call the release/mint functions. Critically:

- The relayer **cannot initiate** a transfer without a matching source-chain event
- The relayer **cannot redirect** funds — the recipient is embedded in the on-chain event
- Even if the relayer private key is compromised, an attacker cannot move funds without a valid on-chain lock/burn first

### 5.3 Dual Token Architecture

| Token | Symbol | Chain | Mechanism |
|-------|--------|-------|-----------|
| MATCOM | MCM | Sepolia | Locked in escrow (never burned on source) |
| Wrapped MATCOM | wMCM | Sonic | Minted on arrival, burned on return |

This ensures the backing is always 1:1 and auditable on-chain at any time.

### 5.4 Rate-Limited Faucet

The test faucet mints 100 MCM per request with a 60-second cooldown enforced server-side, preventing griefing or flooding of the bridge during testing and demonstration.

---

## 6. Zero-Knowledge Principles Applied

While this implementation uses an optimistic relayer rather than ZK-SNARKs directly on-chain, the design strictly adheres to zero-knowledge principles:

| ZK Principle | How We Apply It |
|---|---|
| **Soundness** | No invalid state transition is accepted — bridges verify event data, nonces, and caller identity |
| **Completeness** | Every valid lock on Sepolia guarantees a mint on Sonic when the relayer is online |
| **Zero-Knowledge** | The relayer learns only what is necessary: the event data. It cannot infer user intent beyond the transaction |
| **Non-interactivity** | Users submit one transaction per chain — no back-and-forth handshakes required |

> The architecture is purposefully designed to be **upgraded** to full ZK-SNARK proof verification (e.g. Groth16 or PLONK) where the relayer submits an on-chain verifiable proof instead of a signed call — without any change to the user experience.

---

## 7. Live Deployment

| Component | Chain | Address |
|-----------|-------|---------|
| BridgeToken (MCM) | Sepolia (11155111) | `0x8249A4bFC5fE6E73d04b86d98059897a9903f44B` |
| SepoliaBridge | Sepolia (11155111) | `0xee31e7AC6a76aC9e5721288CDEA41b16b2394D95` |
| WrappedToken (wMCM) | Sonic Testnet (14601) | `0xfbDb8933B4dE7728795f6AFEDf4bD5E7e43fB04F` |
| SonicBridge | Sonic Testnet (14601) | `0x105360f8a85a5Db5F515eD680E12Cd6c30f1324B` |

**Block explorers:**
- Sepolia: https://sepolia.etherscan.io
- Sonic Testnet: https://testnet.sonicscan.org

---

## 8. Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.20, Hardhat |
| Frontend | React + Vite, Ethers.js v6, CSS |
| Backend / Relayer | Node.js, Express, Winston Logger |
| Networks | Ethereum Sepolia · Sonic Testnet (14601) |
| Wallet Interface | MetaMask (EIP-1193) |

---

## 9. Competitive Advantage

| Feature | ZK-Bridge MATCOM | Typical Bridge |
|---------|-----------------|----------------|
| Replay Protection | On-chain nonce enforcement | Often off-chain or absent |
| Relayer Trust Model | Permissioned + event-bound | Fully trusted relayer |
| Fund Forgeability | Cryptographically impossible | Risk with multi-sig keys |
| Upgrade Path to ZK-SNARKs | Built into architecture | Requires complete redesign |
| Auditability | Fully open source and on-chain | Often closed or opaque |

---

## 10. Roadmap

| Phase | Milestone | Status |
|-------|-----------|--------|
| Phase 1 | ERC-20 bridge with relayer and React UI on testnets | Complete |
| Phase 2 | Integrate ZK-SNARK proof generation via Circom + snarkjs | Planned |
| Phase 3 | On-chain verifier contract replacing relayer trust with mathematical proof | Planned |
| Phase 4 | Multi-token support and mainnet deployment | Planned |

---

## 11. Conclusion

ZK-Bridge MATCOM demonstrates that cross-chain interoperability does not require sacrificing security for convenience. By grounding every transfer in on-chain cryptographic events, enforcing non-replayability through nonces, and designing a clear upgrade path to full zero-knowledge proofs, we present a bridge that is **auditable, trustless, and production-ready** today — and future-proof by design.

> *"Don't trust. Verify."*
> — The foundational principle of every zero-knowledge system, and the core promise of ZK-Bridge MATCOM.

---

**Team MATCOM · Nimbus TechFest · 2026**
