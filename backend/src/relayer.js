const { ethers } = require("ethers");

// ABI fragments for the contracts we interact with
const SEPOLIA_BRIDGE_ABI = [
  "event TokensLocked(address indexed sender, uint256 amount, uint256 nonce, uint256 timestamp)",
  "event TokensReleased(address indexed recipient, uint256 amount, uint256 nonce, uint256 timestamp)",
  "function releaseTokens(address to, uint256 amount, uint256 nonce) external",
  "function getLockedBalance() external view returns (uint256)",
  "function processedNonces(uint256) external view returns (bool)",
];

const SONIC_BRIDGE_ABI = [
  "event TokensMinted(address indexed recipient, uint256 amount, uint256 nonce, uint256 timestamp)",
  "event TokensBurned(address indexed sender, uint256 amount, uint256 nonce, uint256 timestamp)",
  "function mintWrapped(address to, uint256 amount, uint256 nonce) external",
  "function getTotalMinted() external view returns (uint256)",
  "function processedNonces(uint256) external view returns (bool)",
];

// In-memory transaction store
const transactions = new Map();
let relayerStatus = {
  running: false,
  sepoliaConnected: false,
  sonicConnected: false,
  sepoliaBlock: 0,
  sonicBlock: 0,
  processedCount: 0,
};

function getTransactions() {
  return Array.from(transactions.values()).sort((a, b) => b.timestamp - a.timestamp);
}

function getRelayerStatus() {
  return relayerStatus;
}

async function startRelayer(logger) {
  const {
    PRIVATE_KEY,
    SEPOLIA_RPC_URL,
    SONIC_RPC_URL,
    SEPOLIA_BRIDGE_ADDRESS,
    SONIC_BRIDGE_ADDRESS,
  } = process.env;

  // Validate config
  if (!PRIVATE_KEY) {
    logger.error("PRIVATE_KEY not set in .env");
    return;
  }

  if (!SEPOLIA_BRIDGE_ADDRESS || !SONIC_BRIDGE_ADDRESS) {
    logger.warn("Bridge addresses not set. Deploy contracts first and update .env");
    logger.warn("Relayer running in standby mode — will not process events");
    relayerStatus.running = true;
    return;
  }

  // Setup providers and signers (prefer WebSocket if configured)
  const SEPOLIA_WS_URL = process.env.SEPOLIA_WS_URL || null;
  const SONIC_WS_URL = process.env.SONIC_WS_URL || null;

  const sepoliaProvider = SEPOLIA_WS_URL && SEPOLIA_WS_URL.startsWith('ws')
    ? new ethers.WebSocketProvider(SEPOLIA_WS_URL)
    : new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);

  const sonicProvider = SONIC_WS_URL && SONIC_WS_URL.startsWith('ws')
    ? new ethers.WebSocketProvider(SONIC_WS_URL)
    : new ethers.JsonRpcProvider(SONIC_RPC_URL);

  const sepoliaWallet = new ethers.Wallet(PRIVATE_KEY, sepoliaProvider);
  const sonicWallet = new ethers.Wallet(PRIVATE_KEY, sonicProvider);

  logger.info(`Relayer wallet: ${sepoliaWallet.address}`);

  // Setup contracts
  const sepoliaBridge = new ethers.Contract(SEPOLIA_BRIDGE_ADDRESS, SEPOLIA_BRIDGE_ABI, sepoliaWallet);
  const sonicBridge = new ethers.Contract(SONIC_BRIDGE_ADDRESS, SONIC_BRIDGE_ABI, sonicWallet);

  // Verify connections
  try {
    const sepoliaBlock = await sepoliaProvider.getBlockNumber();
    relayerStatus.sepoliaConnected = true;
    relayerStatus.sepoliaBlock = sepoliaBlock;
    logger.info(`Connected to Sepolia at block ${sepoliaBlock}`);
  } catch (err) {
    logger.error(`Failed to connect to Sepolia: ${err.message}`);
  }

  try {
    const sonicBlock = await sonicProvider.getBlockNumber();
    relayerStatus.sonicConnected = true;
    relayerStatus.sonicBlock = sonicBlock;
    logger.info(`Connected to Sonic Blaze at block ${sonicBlock}`);
  } catch (err) {
    logger.error(`Failed to connect to Sonic Blaze: ${err.message}`);
  }

  relayerStatus.running = true;

  // Use Interfaces to parse logs when polling
  const sepoliaIface = new ethers.Interface(SEPOLIA_BRIDGE_ABI);
  const sonicIface = new ethers.Interface(SONIC_BRIDGE_ABI);

  // Helper to safely call `processedNonces` on a contract
  async function isNonceProcessed(contract, nonce) {
    try {
      return await contract.processedNonces(nonce);
    } catch (_) {
      return false;
    }
  }

  const sepoliaIsWS = SEPOLIA_WS_URL && SEPOLIA_WS_URL.startsWith('ws');
  const sonicIsWS = SONIC_WS_URL && SONIC_WS_URL.startsWith('ws');

  // If Sepolia provider is WebSocket, listen to events; otherwise poll via getLogs
  if (sepoliaIsWS) {
    sepoliaBridge.on("TokensLocked", async (sender, amount, nonce, timestamp, event) => {
      const txId = `sepolia-to-sonic-${nonce.toString()}`;
      logger.info(`[SEPOLIA] TokensLocked: sender=${sender}, amount=${ethers.formatEther(amount)}, nonce=${nonce}`);

      transactions.set(txId, {
        id: txId,
        type: "sepolia-to-sonic",
        sender,
        amount: ethers.formatEther(amount),
        nonce: nonce.toString(),
        sourceTxHash: event.log.transactionHash,
        status: "confirming",
        timestamp: Date.now(),
        destinationTxHash: null,
      });

      try {
        const processed = await isNonceProcessed(sonicBridge, nonce);
        if (processed) {
          logger.warn(`[SONIC] Nonce ${nonce} already processed, skipping`);
          transactions.get(txId).status = "already-processed";
          return;
        }

        logger.info(`[SONIC] Minting ${ethers.formatEther(amount)} wMCM to ${sender}`);
        const tx = await sonicBridge.mintWrapped(sender, amount, nonce);
        const receipt = await tx.wait();

        transactions.get(txId).status = "completed";
        transactions.get(txId).destinationTxHash = receipt.hash;
        relayerStatus.processedCount++;

        logger.info(`[SONIC] Minted successfully. Tx: ${receipt.hash}`);
      } catch (err) {
        logger.error(`[SONIC] Failed to mint: ${err.message}`);
        if (transactions.has(txId)) {
          transactions.get(txId).status = "failed";
          transactions.get(txId).error = err.message;
        }
      }
    });
  } else {
    (async () => {
      let lastBlock = 0;
      try {
        lastBlock = await sepoliaProvider.getBlockNumber();
      } catch (err) {
        logger.warn(`Could not get Sepolia block number at startup: ${err.message}`);
        lastBlock = 0;
      }

      const topic = ethers.id("TokensLocked(address,uint256,uint256,uint256)");

      setInterval(async () => {
        try {
          const latest = await sepoliaProvider.getBlockNumber();
          if (latest <= lastBlock) return;

          const logs = await sepoliaProvider.getLogs({
            address: SEPOLIA_BRIDGE_ADDRESS,
            fromBlock: lastBlock + 1,
            toBlock: latest,
            topics: [topic],
          });

          logs.sort((a, b) => (a.blockNumber - b.blockNumber) || (a.transactionIndex - b.transactionIndex));
          for (const log of logs) {
            try {
              const parsed = sepoliaIface.parseLog(log);
              const sender = parsed.args[0];
              const amount = parsed.args[1];
              const nonce = parsed.args[2];

              const txId = `sepolia-to-sonic-${nonce.toString()}`;
              logger.info(`[SEPOLIA-POLL] TokensLocked: sender=${sender}, amount=${ethers.formatEther(amount)}, nonce=${nonce}`);

              transactions.set(txId, {
                id: txId,
                type: "sepolia-to-sonic",
                sender,
                amount: ethers.formatEther(amount),
                nonce: nonce.toString(),
                sourceTxHash: log.transactionHash,
                status: "confirming",
                timestamp: Date.now(),
                destinationTxHash: null,
              });

              const processed = await isNonceProcessed(sonicBridge, nonce);
              if (processed) {
                logger.warn(`[SONIC] Nonce ${nonce} already processed, skipping`);
                transactions.get(txId).status = "already-processed";
                continue;
              }

              logger.info(`[SONIC] Minting ${ethers.formatEther(amount)} wMCM to ${sender}`);
              const tx = await sonicBridge.mintWrapped(sender, amount, nonce);
              const receipt = await tx.wait();

              transactions.get(txId).status = "completed";
              transactions.get(txId).destinationTxHash = receipt.hash;
              relayerStatus.processedCount++;

              logger.info(`[SONIC] Minted successfully. Tx: ${receipt.hash}`);
            } catch (err) {
              logger.error(`[SEPOLIA-POLL] Failed to process log: ${err.message}`);
            }
          }

          lastBlock = latest;
        } catch (err) {
          logger.error(`[SEPOLIA-POLL] Poll error: ${err.message}`);
        }
      }, 5000);
    })();
  }

  if (sonicIsWS) {
    sonicBridge.on("TokensBurned", async (sender, amount, nonce, timestamp, event) => {
      const txId = `sonic-to-sepolia-${nonce.toString()}`;
      logger.info(`[SONIC] TokensBurned: sender=${sender}, amount=${ethers.formatEther(amount)}, nonce=${nonce}`);

      transactions.set(txId, {
        id: txId,
        type: "sonic-to-sepolia",
        sender,
        amount: ethers.formatEther(amount),
        nonce: nonce.toString(),
        sourceTxHash: event.log.transactionHash,
        status: "confirming",
        timestamp: Date.now(),
        destinationTxHash: null,
      });

      try {
        const processed = await isNonceProcessed(sepoliaBridge, nonce);
        if (processed) {
          logger.warn(`[SEPOLIA] Nonce ${nonce} already processed, skipping`);
          transactions.get(txId).status = "already-processed";
          return;
        }

        logger.info(`[SEPOLIA] Releasing ${ethers.formatEther(amount)} MCM to ${sender}`);
        const tx = await sepoliaBridge.releaseTokens(sender, amount, nonce);
        const receipt = await tx.wait();

        transactions.get(txId).status = "completed";
        transactions.get(txId).destinationTxHash = receipt.hash;
        relayerStatus.processedCount++;

        logger.info(`[SEPOLIA] Released successfully. Tx: ${receipt.hash}`);
      } catch (err) {
        logger.error(`[SEPOLIA] Failed to release: ${err.message}`);
        if (transactions.has(txId)) {
          transactions.get(txId).status = "failed";
          transactions.get(txId).error = err.message;
        }
      }
    });
  } else {
    (async () => {
      let lastBlock = 0;
      try {
        lastBlock = await sonicProvider.getBlockNumber();
      } catch (err) {
        logger.warn(`Could not get Sonic block number at startup: ${err.message}`);
        lastBlock = 0;
      }

      const topic = ethers.id("TokensBurned(address,uint256,uint256,uint256)");

      setInterval(async () => {
        try {
          const latest = await sonicProvider.getBlockNumber();
          if (latest <= lastBlock) return;

          const logs = await sonicProvider.getLogs({
            address: SONIC_BRIDGE_ADDRESS,
            fromBlock: lastBlock + 1,
            toBlock: latest,
            topics: [topic],
          });

          logs.sort((a, b) => (a.blockNumber - b.blockNumber) || (a.transactionIndex - b.transactionIndex));
          for (const log of logs) {
            try {
              const parsed = sonicIface.parseLog(log);
              const sender = parsed.args[0];
              const amount = parsed.args[1];
              const nonce = parsed.args[2];

              const txId = `sonic-to-sepolia-${nonce.toString()}`;
              logger.info(`[SONIC-POLL] TokensBurned: sender=${sender}, amount=${ethers.formatEther(amount)}, nonce=${nonce}`);

              transactions.set(txId, {
                id: txId,
                type: "sonic-to-sepolia",
                sender,
                amount: ethers.formatEther(amount),
                nonce: nonce.toString(),
                sourceTxHash: log.transactionHash,
                status: "confirming",
                timestamp: Date.now(),
                destinationTxHash: null,
              });

              const processed = await isNonceProcessed(sepoliaBridge, nonce);
              if (processed) {
                logger.warn(`[SEPOLIA] Nonce ${nonce} already processed, skipping`);
                transactions.get(txId).status = "already-processed";
                continue;
              }

              logger.info(`[SEPOLIA] Releasing ${ethers.formatEther(amount)} MCM to ${sender}`);
              const tx = await sepoliaBridge.releaseTokens(sender, amount, nonce);
              const receipt = await tx.wait();

              transactions.get(txId).status = "completed";
              transactions.get(txId).destinationTxHash = receipt.hash;
              relayerStatus.processedCount++;

              logger.info(`[SEPOLIA] Released successfully. Tx: ${receipt.hash}`);
            } catch (err) {
              logger.error(`[SONIC-POLL] Failed to process log: ${err.message}`);
            }
          }

          lastBlock = latest;
        } catch (err) {
          logger.error(`[SONIC-POLL] Poll error: ${err.message}`);
        }
      }, 5000);
    })();
  }

  logger.info("Relayer listeners active — watching for bridge events on both chains");
}

module.exports = { startRelayer, getTransactions, getRelayerStatus };
