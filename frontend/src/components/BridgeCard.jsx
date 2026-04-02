import { useState, useEffect, useCallback } from 'react';
import { CHAINS, TOKENS } from '../utils/constants';
import {
  switchNetwork,
  getTokenBalance,
  getNativeBalance,
  approveTokens,
  checkAllowance,
  lockTokens,
  burnWrappedTokens,
  requestFaucet,
} from '../utils/contracts';
import './BridgeCard.css';

function BridgeCard({ wallet, currentChain, onConnect, onBridgeComplete }) {
  const [direction, setDirection] = useState('sepolia-to-sonic'); // or 'sonic-to-sepolia'
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('0');
  const [nativeBalance, setNativeBalance] = useState('0');
  const [allowance, setAllowance] = useState('0');
  const [status, setStatus] = useState('idle'); // idle, approving, approved, bridging, success, error
  const [faucetStatus, setFaucetStatus] = useState('idle'); // idle, loading, success, error
  const [faucetTxHash, setFaucetTxHash] = useState('');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const sourceChain = direction === 'sepolia-to-sonic' ? 'sepolia' : 'sonic';
  const destChain = direction === 'sepolia-to-sonic' ? 'sonic' : 'sepolia';
  const sourceConfig = CHAINS[sourceChain];
  const destConfig = CHAINS[destChain];
  const token = direction === 'sepolia-to-sonic' ? TOKENS.MCM : TOKENS.wMCM;

  // Fetch balances
  const refreshBalances = useCallback(async () => {
    if (!wallet.connected || !wallet.address) return;
    try {
      const bal = await getTokenBalance(sourceChain, wallet.address);
      setBalance(bal);
      const nBal = await getNativeBalance(sourceChain, wallet.address);
      setNativeBalance(nBal);
      const allow = await checkAllowance(sourceChain, wallet.address);
      setAllowance(allow);
    } catch (err) {
      console.warn('Failed to fetch balances:', err);
    }
  }, [wallet.connected, wallet.address, sourceChain]);

  useEffect(() => {
    refreshBalances();
    const interval = setInterval(refreshBalances, 15000);
    return () => clearInterval(interval);
  }, [refreshBalances]);

  // Swap direction
  const handleSwap = () => {
    setDirection((prev) =>
      prev === 'sepolia-to-sonic' ? 'sonic-to-sepolia' : 'sepolia-to-sonic'
    );
    setAmount('');
    setStatus('idle');
    setError('');
    setTxHash('');
  };

  // Ensure on correct chain
  const ensureCorrectChain = async () => {
    if (currentChain !== sourceChain) {
      await switchNetwork(sourceChain);
      // Wait a moment for the network switch
      return new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };

  // Handle approve
  const handleApprove = async () => {
    try {
      setStatus('approving');
      setError('');
      await ensureCorrectChain();
      const tx = await approveTokens(sourceChain, amount);
      await tx.wait();
      setStatus('approved');
      await refreshBalances();
    } catch (err) {
      setStatus('idle');
      setError(err.reason || err.message || 'Approval failed');
    }
  };

  // Handle bridge
  const handleBridge = async () => {
    try {
      setStatus('bridging');
      setError('');
      setTxHash('');
      await ensureCorrectChain();

      let tx;
      if (direction === 'sepolia-to-sonic') {
        tx = await lockTokens(amount);
      } else {
        tx = await burnWrappedTokens(amount);
      }

      setTxHash(tx.hash);
      await tx.wait();
      setStatus('success');
      setAmount('');
      await refreshBalances();
      if (onBridgeComplete) onBridgeComplete();
    } catch (err) {
      setStatus('error');
      setError(err.reason || err.message || 'Bridge transaction failed');
    }
  };

  // Handle faucet
  const handleFaucet = async () => {
    try {
      if (!wallet.connected || !wallet.address) return;
      setFaucetStatus('loading');
      setFaucetTxHash('');
      const data = await requestFaucet(wallet.address);
      if (data && data.txHash) {
        setFaucetTxHash(data.txHash);
      }
      // Wait 2s for RPC to propagate the confirmed tx before reading balance
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await refreshBalances();
      setFaucetStatus('success');
      // Auto-clear success state after 5s
      setTimeout(() => setFaucetStatus('idle'), 5000);
    } catch (err) {
      setFaucetStatus('error');
      setError(err.reason || err.message || 'Faucet request failed');
      setTimeout(() => setFaucetStatus('idle'), 5000);
    }
  };

  // Set max balance
  const handleMax = () => {
    setAmount(balance);
  };

  // Determine if we need approval
  const needsApproval =
    amount &&
    parseFloat(amount) > 0 &&
    parseFloat(allowance) < parseFloat(amount) &&
    status !== 'approved';

  const canBridge =
    wallet.connected &&
    amount &&
    parseFloat(amount) > 0 &&
    parseFloat(amount) <= parseFloat(balance) &&
    (status === 'idle' || status === 'approved' || status === 'error');

  return (
    <div className="bridge-card glass-card">
      {/* Card header */}
      <div className="bridge-card-header">
        <h2>Bridge Tokens</h2>
        <button className="btn btn-ghost btn-sm refresh-btn" onClick={refreshBalances} title="Refresh balances">
          ↻
        </button>
      </div>

      {/* Source chain */}
      <div className="bridge-chain-section">
        <div className="chain-label">
          <span className="chain-direction">From</span>
          <span className="chain-name" style={{ color: sourceConfig.color }}>
            {sourceConfig.icon} {sourceConfig.name}
          </span>
        </div>

        <div className="bridge-input-wrapper">
          <div className="bridge-input-row">
            <input
              type="number"
              className="input input-lg bridge-amount-input"
              placeholder="0.0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setStatus('idle');
                setError('');
              }}
              min="0"
              step="0.01"
              id="bridge-amount-input"
            />
            <div className="token-badge">
              <span className="token-symbol">{token.symbol}</span>
            </div>
          </div>
          <div className="balance-row">
            <span className="balance-label">
              Balance: <strong>{parseFloat(balance).toFixed(4)}</strong> {token.symbol}
            </span>
            <div className="balance-actions">
              {direction === 'sepolia-to-sonic' && wallet.connected && (
                <button
                  className={`faucet-btn${faucetStatus === 'success' ? ' faucet-btn--success' : ''}`}
                  onClick={handleFaucet}
                  disabled={faucetStatus === 'loading'}
                  title="Get 100 free MCM test tokens"
                >
                  {faucetStatus === 'loading' ? (
                    <><span className="spinner spinner-sm"></span> Minting...</>
                  ) : faucetStatus === 'success' ? (
                    '✓ Minted!'
                  ) : (
                    'Faucet'
                  )}
                </button>
              )}
              <button className="max-btn" onClick={handleMax}>MAX</button>
            </div>
          </div>
        </div>
      </div>

      {/* Swap button */}
      <div className="swap-btn-wrapper">
        <button className="swap-direction-btn" onClick={handleSwap} title="Swap direction" id="swap-direction-btn">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3v14M10 3l-4 4M10 3l4 4M10 17l-4-4M10 17l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Destination chain */}
      <div className="bridge-chain-section dest-section">
        <div className="chain-label">
          <span className="chain-direction">To</span>
          <span className="chain-name" style={{ color: destConfig.color }}>
            {destConfig.icon} {destConfig.name}
          </span>
        </div>
        <div className="receive-display">
          <span className="receive-amount">{amount || '0.0'}</span>
          <span className="receive-token">
            {direction === 'sepolia-to-sonic' ? TOKENS.wMCM.symbol : TOKENS.MCM.symbol}
          </span>
        </div>
      </div>

      {/* Info row */}
      {amount && parseFloat(amount) > 0 && (
        <div className="bridge-info">
          <div className="info-row">
            <span>Bridge Fee</span>
            <span className="info-value">Free</span>
          </div>
          <div className="info-row">
            <span>Estimated Time</span>
            <span className="info-value">~2-5 min</span>
          </div>
          <div className="info-row">
            <span>You Receive</span>
            <span className="info-value highlight">{amount} {direction === 'sepolia-to-sonic' ? 'wMCM' : 'MCM'}</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bridge-error">
          <span>⚠</span> {error}
        </div>
      )}

      {/* Faucet success message */}
      {faucetStatus === 'success' && (
        <div className="bridge-success">
          <span>✓</span> 100 MCM minted to your wallet!
          {faucetTxHash && (
            <a
              href={`${sourceConfig.explorer}/tx/${faucetTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-link"
            >
              View Transaction ↗
            </a>
          )}
        </div>
      )}

      {/* Bridge success message */}
      {status === 'success' && (
        <div className="bridge-success">
          <span>✓</span> Bridge transaction submitted! Tokens will arrive shortly.
          {txHash && (
            <a
              href={`${sourceConfig.explorer}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-link"
            >
              View Transaction ↗
            </a>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="bridge-actions">
        {!wallet.connected ? (
          <button className="btn btn-primary btn-lg btn-full" onClick={onConnect} id="bridge-connect-btn">
            Connect Wallet
          </button>
        ) : needsApproval ? (
          <button
            className="btn btn-secondary btn-lg btn-full"
            onClick={handleApprove}
            disabled={status === 'approving'}
            id="approve-btn"
          >
            {status === 'approving' ? (
              <>
                <span className="spinner"></span> Approving...
              </>
            ) : (
              `Approve ${token.symbol}`
            )}
          </button>
        ) : (
          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={handleBridge}
            disabled={!canBridge || status === 'bridging'}
            id="bridge-btn"
          >
            {status === 'bridging' ? (
              <>
                <span className="spinner"></span> Bridging...
              </>
            ) : amount && parseFloat(amount) > parseFloat(balance) ? (
              'Insufficient Balance'
            ) : (
              `Bridge to ${destConfig.name}`
            )}
          </button>
        )}
      </div>

      {/* External Native Gas Faucets */}
      <div className="network-faucets">
        <span>Need Gas?</span>
        <a href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" target="_blank" rel="noopener noreferrer" className="external-faucet-link">Sepolia ETH Faucet</a>
        <span className="separator">•</span>
        <a href="https://testnet.soniclabs.com/account" target="_blank" rel="noopener noreferrer" className="external-faucet-link">Sonic S Faucet</a>
      </div>
    </div>
  );
}

export default BridgeCard;
