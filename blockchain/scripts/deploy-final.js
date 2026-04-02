const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const logFile = "deploy_final_log.txt";
  const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + "\n");
  };

  log("--- STARTING DEPLOYMENT ---");
  log("Account: " + deployer.address);
  
  const network = hre.network.name;
  log("Network: " + network);

  if (network === "sepolia") {
    const tokenAddress = "0xa1CB05dCaD3342B29264eCaB3169F69E7C3992C4";
    log("Using existing BridgeToken: " + tokenAddress);
    
    const SepoliaBridge = await hre.ethers.getContractFactory("SepoliaBridge");
    const sepoliaBridge = await SepoliaBridge.deploy(tokenAddress);
    await sepoliaBridge.waitForDeployment();
    const bridgeAddress = await sepoliaBridge.getAddress();
    log("SepoliaBridge: " + bridgeAddress);

    await (await sepoliaBridge.setRelayer(deployer.address)).wait();
    log("Relayer set");

    const BridgeToken = await hre.ethers.getContractAt("BridgeToken", tokenAddress);
    await (await BridgeToken.approve(bridgeAddress, hre.ethers.parseEther("1000000"))).wait();
    log("Approval done");
  } else if (network === "sonicTestnet") {
    const WrappedToken = await hre.ethers.getContractFactory("WrappedToken");
    const wrappedToken = await WrappedToken.deploy();
    await wrappedToken.waitForDeployment();
    const tokenAddress = await wrappedToken.getAddress();
    log("WrappedToken: " + tokenAddress);

    const SonicBridge = await hre.ethers.getContractFactory("SonicBridge");
    const sonicBridge = await SonicBridge.deploy(tokenAddress);
    await sonicBridge.waitForDeployment();
    const bridgeAddress = await sonicBridge.getAddress();
    log("SonicBridge: " + bridgeAddress);

    await (await wrappedToken.setBridge(bridgeAddress)).wait();
    log("Bridge set on Token");

    await (await sonicBridge.setRelayer(deployer.address)).wait();
    log("Relayer set");
  }
}

main().catch((error) => {
  fs.appendFileSync("deploy_final_log.txt", "ERROR: " + error.message + "\n");
  process.exit(1);
});
