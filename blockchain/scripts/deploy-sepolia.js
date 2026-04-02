const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying Sepolia contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy BridgeToken (MATCOM - MCM)
  let tokenAddress = process.env.EXISTING_TOKEN;
  let bridgeToken;
  if (tokenAddress) {
    console.log("\n--- Using existing BridgeToken at:", tokenAddress);
    bridgeToken = await hre.ethers.getContractAt("BridgeToken", tokenAddress);
  } else {
    console.log("\n--- Deploying BridgeToken (MATCOM) ---");
    const BridgeToken = await hre.ethers.getContractFactory("BridgeToken");
    const initialSupply = 1000000; // 1M tokens
    bridgeToken = await BridgeToken.deploy(initialSupply);
    await bridgeToken.waitForDeployment();
    tokenAddress = await bridgeToken.getAddress();
    console.log("BridgeToken deployed to:", tokenAddress);
  }

  // 2. Deploy SepoliaBridge
  console.log("\n--- Deploying SepoliaBridge ---");
  const SepoliaBridge = await hre.ethers.getContractFactory("SepoliaBridge");
  const sepoliaBridge = await SepoliaBridge.deploy(tokenAddress);
  await sepoliaBridge.waitForDeployment();
  const bridgeAddress = await sepoliaBridge.getAddress();
  console.log("SepoliaBridge deployed to:", bridgeAddress);

  // 3. Set relayer (deployer acts as relayer for now)
  console.log("\n--- Setting relayer ---");
  const setRelayerTx = await sepoliaBridge.setRelayer(deployer.address);
  await setRelayerTx.wait();
  console.log("Relayer set to:", deployer.address);

  // 4. Approve bridge to spend tokens (for testing, approve a large amount)
  console.log("\n--- Approving bridge to spend tokens ---");
  const approveAmount = hre.ethers.parseEther("1000000");
  const approveTx = await bridgeToken.approve(bridgeAddress, approveAmount);
  await approveTx.wait();
  console.log("Approved bridge to spend", hre.ethers.formatEther(approveAmount), "MCM");

  // Summary
  console.log("\n========================================");
  console.log("SEPOLIA DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log("BridgeToken (MCM):", tokenAddress);
  console.log("SepoliaBridge:", bridgeAddress);
  console.log("Relayer:", deployer.address);
  console.log("========================================");
  console.log("\nAdd these to your backend .env:");
  console.log(`SEPOLIA_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`SEPOLIA_BRIDGE_ADDRESS=${bridgeAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
