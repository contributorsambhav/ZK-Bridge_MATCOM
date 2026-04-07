const express = require("express");
const router = express.Router();
const { ethers } = require("ethers");

const BRIDGE_TOKEN_ABI = [
  "function mint(address to, uint256 amount) external"
];

let lastFaucetRequest = new Map(); // simple memory store for rate limiting in dev

// POST /api/faucet
// Request test tokens
router.post("/", async (req, res) => {
  const { address } = req.body;

  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid Ethereum address provided" });
  }

  // Simple rate limiting: 1 request per address per hour (adjust as needed for testing)
  // For demonstration, let's keep it to 1 request per minute to make testing easier
  const now = Date.now();
  const lastRequest = lastFaucetRequest.get(address.toLowerCase());
  const COOLDOWN_MS = 60 * 1000; // 1 minute

  if (lastRequest && now - lastRequest < COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((COOLDOWN_MS - (now - lastRequest)) / 1000);
    return res.status(429).json({ 
      error: `Please wait ${remainingSeconds} seconds before requesting again.` 
    });
  }

  try {
    const { PRIVATE_KEY, SEPOLIA_RPC_URL, SEPOLIA_TOKEN_ADDRESS } = process.env;

    if (!PRIVATE_KEY || !SEPOLIA_TOKEN_ADDRESS) {
      return res.status(500).json({ error: "Faucet not configured properly on the backend" });
    }

    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const tokenContract = new ethers.Contract(SEPOLIA_TOKEN_ADDRESS, BRIDGE_TOKEN_ABI, wallet);

    const amountToMint = ethers.parseEther("100"); // 100 ZT per faucet request

    const tx = await tokenContract.mint(address, amountToMint);

    // Wait for 1 confirmation so the frontend can show a confirmed tx hash
    const receipt = await tx.wait();

    const logger = req.app && req.app.get ? req.app.get('logger') : console;

    // If transaction was mined but failed (status !== 1), report an error
    if (!receipt || (receipt.status !== undefined && receipt.status !== 1)) {
      logger.error(`Faucet mint failed for ${address}`, { txHash: receipt ? receipt.transactionHash : tx.hash, receipt });
      return res.status(500).json({
        error: 'Mint transaction failed or reverted',
        txHash: receipt ? receipt.transactionHash : tx.hash,
        receipt,
      });
    }

    // Only update rate limit if successful
    lastFaucetRequest.set(address.toLowerCase(), Date.now());

    logger.info(`Faucet minted 100 ZT to ${address}`, { txHash: receipt.transactionHash });

    return res.json({
      success: true,
      message: `Successfully minted 100 ZT to ${address}`,
      txHash: receipt.transactionHash,
      receipt,
    });
  } catch (error) {
    console.error("Faucet Error:", error);
    return res.status(500).json({ error: "Failed to mint tokens", details: error.message });
  }
});

module.exports = router;
