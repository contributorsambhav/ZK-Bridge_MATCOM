require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createLogger, format, transports } = require("winston");
const { startRelayer, getTransactions, getRelayerStatus } = require("./relayer");
const bridgeRoutes = require("./routes/bridge");
const faucetRoutes = require("./routes/faucet");

// Logger
const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "relayer.log" }),
  ],
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Make logger and relayer data available to routes
app.set("logger", logger);

// Routes
app.use("/api", bridgeRoutes);
app.use("/api/faucet", faucetRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Start server
app.listen(PORT, () => {
  logger.info(`ZeroTrace Bridge relayer server running on port ${PORT}`);

  // Start the relayer event listeners
  startRelayer(logger).catch((err) => {
    logger.error(`Failed to start relayer: ${err.message}`);
  });
});
