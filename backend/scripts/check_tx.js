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
    const txHash = process.argv[2];
    if (!txHash) {
      console.error('Usage: node scripts/check_tx.js <txHash>');
      process.exit(1);
    }

    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const env = parseEnv(envContent);

    const providerUrl = env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
    console.log('Using provider:', providerUrl);
    console.log('Tx hash:', txHash);

    const provider = new ethers.JsonRpcProvider(providerUrl);

    try {
      const tx = await provider.getTransaction(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!tx) {
        console.log('Transaction not found (provider returned null).');
      } else {
        console.log('Transaction:');
        console.log('  from:', tx.from);
        console.log('  to:', tx.to);
        try { console.log('  value:', ethers.formatEther(tx.value)); } catch(e) {}
        console.log('  nonce:', tx.nonce);
        if (tx.maxFeePerGas) console.log('  maxFeePerGas:', tx.maxFeePerGas.toString());
        if (tx.maxPriorityFeePerGas) console.log('  maxPriorityFeePerGas:', tx.maxPriorityFeePerGas.toString());
        if (tx.gasPrice) console.log('  gasPrice:', tx.gasPrice.toString());
      }

      if (!receipt) {
        console.log('\nReceipt: pending (not yet included in a block)');
      } else {
        console.log('\nReceipt:');
        console.log('  blockNumber:', receipt.blockNumber);
        console.log('  status:', receipt.status === 1 ? 'success' : receipt.status === 0 ? 'failed' : receipt.status);
        console.log('  cumulativeGasUsed:', receipt.cumulativeGasUsed.toString());
        console.log('  effectiveGasPrice:', receipt.effectiveGasPrice ? receipt.effectiveGasPrice.toString() : 'N/A');
        console.log('  logs:', receipt.logs ? receipt.logs.length : 0);

        try {
          const current = await provider.getBlockNumber();
          console.log('  confirmations:', current - receipt.blockNumber + 1);
        } catch (e) {}
      }

      console.log('\nEtherscan link: https://sepolia.etherscan.io/tx/' + txHash);
    } catch (err) {
      console.error('Provider error:', err.code || err.message || err);
    }
  } catch (e) {
    console.error('Fatal error:', e.message || e);
  }
  process.exit(0);
})();
