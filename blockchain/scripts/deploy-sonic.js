const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying Sonic Blaze contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy WrappedToken (Wrapped MATCOM - wMCM)
  console.log("\n--- Deploying WrappedToken (Wrapped MATCOM) ---");
  const WrappedToken = await hre.ethers.getContractFactory("WrappedToken");
  const wrappedToken = await WrappedToken.deploy();
  await wrappedToken.waitForDeployment();
  const wrappedTokenAddress = await wrappedToken.getAddress();
  console.log("WrappedToken deployed to:", wrappedTokenAddress);

  // 2. Deploy SonicBridge
  console.log("\n--- Deploying SonicBridge ---");
  const SonicBridge = await hre.ethers.getContractFactory("SonicBridge");
  const sonicBridge = await SonicBridge.deploy(wrappedTokenAddress);
  await sonicBridge.waitForDeployment();
  const bridgeAddress = await sonicBridge.getAddress();
  console.log("SonicBridge deployed to:", bridgeAddress);

  // 3. Set bridge address on WrappedToken (so bridge can mint/burn)
  console.log("\n--- Setting bridge on WrappedToken ---");
  const setBridgeTx = await wrappedToken.setBridge(bridgeAddress);
  await setBridgeTx.wait();
  console.log("Bridge set on WrappedToken to:", bridgeAddress);

  // 4. Set relayer (deployer acts as relayer for now)
  console.log("\n--- Setting relayer ---");
  const setRelayerTx = await sonicBridge.setRelayer(deployer.address);
  await setRelayerTx.wait();
  console.log("Relayer set to:", deployer.address);

  // Summary
  console.log("\n========================================");
  console.log("SONIC BLAZE DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log("WrappedToken (wMCM):", wrappedTokenAddress);
  console.log("SonicBridge:", bridgeAddress);
  console.log("Relayer:", deployer.address);
  console.log("========================================");
  console.log("\nAdd these to your backend .env:");
  console.log(`SONIC_TOKEN_ADDRESS=${wrappedTokenAddress}`);
  console.log(`SONIC_BRIDGE_ADDRESS=${bridgeAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
