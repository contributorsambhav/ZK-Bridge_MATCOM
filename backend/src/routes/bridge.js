const express = require("express");
const router = express.Router();
const { getTransactions, getRelayerStatus } = require("../relayer");

// GET /api/status - Relayer and chain status
router.get("/status", (req, res) => {
  const status = getRelayerStatus();
  res.json({
    relayer: status,
    chains: {
      sepolia: {
        chainId: 11155111,
        name: "Sepolia",
        connected: status.sepoliaConnected,
        explorer: "https://sepolia.etherscan.io",
      },
      sonic: {
        chainId: 57054,
        name: "Sonic Blaze",
        connected: status.sonicConnected,
        explorer: "https://testnet.sonicscan.org",
      },
    },
  });
});

// GET /api/transactions - List recent bridge transactions
router.get("/transactions", (req, res) => {
  const txs = getTransactions();
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    transactions: txs.slice(0, limit),
    total: txs.length,
  });
});

// GET /api/transactions/:id - Get specific transaction
router.get("/transactions/:id", (req, res) => {
  const txs = getTransactions();
  const tx = txs.find((t) => t.id === req.params.id || t.sourceTxHash === req.params.id);
  if (!tx) {
    return res.status(404).json({ error: "Transaction not found" });
  }
  res.json(tx);
});

// GET /api/config - Get contract addresses for frontend
router.get("/config", (req, res) => {
  res.json({
    sepolia: {
      chainId: 11155111,
      rpcUrl: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      tokenAddress: process.env.SEPOLIA_TOKEN_ADDRESS || "",
      bridgeAddress: process.env.SEPOLIA_BRIDGE_ADDRESS || "",
      explorer: "https://sepolia.etherscan.io",
    },
    sonic: {
      chainId: 57054,
      rpcUrl: process.env.SONIC_RPC_URL || "https://rpc.blaze.soniclabs.com",
      tokenAddress: process.env.SONIC_TOKEN_ADDRESS || "",
      bridgeAddress: process.env.SONIC_BRIDGE_ADDRESS || "",
      explorer: "https://testnet.sonicscan.org",
    },
  });
});

module.exports = router;
