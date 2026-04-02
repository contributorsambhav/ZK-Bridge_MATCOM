const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

function parseEnv(content) {
  const res = {};
  for (const line of content.split(/\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (m) {
      res[m[1]] = m[2].trim();
    }
  }
  return res;
}

(async () => {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const env = parseEnv(envContent);

    const providerUrl = env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
    const tokenAddress = env.SEPOLIA_TOKEN_ADDRESS;
    const walletAddr = process.argv[2] || '0x4E5E5586F554Ff37F7839F5d70f849D03D5B6dEB';

    if (!tokenAddress) {
      console.error('SEPOLIA_TOKEN_ADDRESS not set in backend/.env');
      process.exit(1);
    }

    console.log('Using provider:', providerUrl);
    console.log('Token address:', tokenAddress);
    console.log('Wallet address:', walletAddr);

    const provider = new ethers.JsonRpcProvider(providerUrl);
    const abi = [
      'function balanceOf(address) view returns (uint256)',
      'event Transfer(address indexed from, address indexed to, uint256 value)'
    ];

    const token = new ethers.Contract(tokenAddress, abi, provider);

    try {
      const bal = await token.balanceOf(walletAddr);
      console.log('Balance (wei):', bal.toString());
      try {
        console.log('Balance (formatted):', ethers.formatEther(bal));
      } catch (e) {
        console.log('Balance (formatted): could not format', e.message);
      }
    } catch (err) {
      console.error('Error calling balanceOf:', err.message || err);
    }

    try {
      const current = await provider.getBlockNumber();
      const fromBlock = Math.max(current - 5000, 0);
      console.log('Querying Transfer logs from', fromBlock, 'to', current);
      const transferTopic = ethers.id('Transfer(address,address,uint256)');
      const toTopic = ethers.hexZeroPad(ethers.getAddress(walletAddr), 32);

      const logs = await provider.getLogs({
        address: tokenAddress,
        fromBlock,
        toBlock: current,
        topics: [transferTopic, null, toTopic]
      });

      console.log('Found transfer logs to wallet:', logs.length);
      for (const l of logs) {
        console.log(' - tx:', l.transactionHash, 'block:', l.blockNumber);
      }
    } catch (err) {
      console.error('Error fetching logs:', err.message || err);
    }
  } catch (e) {
    console.error('Fatal error:', e.message || e);
  }
  process.exit(0);
})();
