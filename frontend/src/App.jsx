import { useState, useEffect, useCallback } from 'react';
import './App.css';
import Header from './components/Header';
import BridgeCard from './components/BridgeCard';
import TransactionHistory from './components/TransactionHistory';
import { connectWallet, getChainFromId, fetchConfig, fetchRelayerStatus } from './utils/contracts';

function App() {
  const [wallet, setWallet] = useState({
    connected: false,
    address: null,
    chainId: null,
    signer: null,
    provider: null,
  });

  const [relayerOnline, setRelayerOnline] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch backend config on mount
  useEffect(() => {
    fetchConfig();

    // Check relayer health
    const checkRelayer = async () => {
      const status = await fetchRelayerStatus();
      setRelayerOnline(!!status);
    };
    checkRelayer();
    const interval = setInterval(checkRelayer, 15000);
    return () => clearInterval(interval);
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setWallet({ connected: false, address: null, chainId: null, signer: null, provider: null });
      } else {
        setWallet((prev) => ({ ...prev, address: accounts[0] }));
      }
    };

    const handleChainChanged = (chainIdHex) => {
      const chainId = parseInt(chainIdHex, 16);
      setWallet((prev) => ({ ...prev, chainId }));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  const handleConnect = useCallback(async () => {
    try {
      const { provider, signer, address, chainId } = await connectWallet();
      setWallet({
        connected: true,
        address,
        chainId,
        signer,
        provider,
      });
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      alert(err.message || 'Failed to connect wallet');
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setWallet({ connected: false, address: null, chainId: null, signer: null, provider: null });
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const currentChain = getChainFromId(wallet.chainId);

  return (
    <div className="app">
      <Header
        wallet={wallet}
        currentChain={currentChain}
        relayerOnline={relayerOnline}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <main className="page-content">
        {/* Hero section */}
        <div className="hero animate-fade-in-up">
          <h1 className="hero-title">
            <span className="hero-gradient">ZeroTrace</span> Bridge
          </h1>
          <p className="hero-subtitle">
            Transfer tokens seamlessly between Ethereum Sepolia and Sonic Blaze
          </p>
        </div>

        {/* Bridge Card */}
        <div className="bridge-wrapper animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <BridgeCard
            wallet={wallet}
            currentChain={currentChain}
            onConnect={handleConnect}
            onBridgeComplete={triggerRefresh}
          />
        </div>

        {/* Transaction History */}
        <div className="history-wrapper animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <TransactionHistory refreshTrigger={refreshTrigger} />
        </div>

        {/* Chain info cards */}
        <div className="chain-info-grid animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="chain-info-card glass-card">
            <div className="chain-info-icon" style={{ color: '#627eea' }}>⟠</div>
            <div className="chain-info-details">
              <h3>Sepolia Testnet</h3>
              <p>Chain ID: 11155111</p>
              <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer">
                Explorer ↗
              </a>
            </div>
          </div>
          <div className="chain-info-card glass-card">
            <div className="chain-info-icon" style={{ color: '#00d4ff' }}>◎</div>
            <div className="chain-info-details">
              <h3>Sonic Blaze</h3>
              <p>Chain ID: 57054</p>
              <a href="https://testnet.sonicscan.org" target="_blank" rel="noopener noreferrer">
                Explorer ↗
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>ZeroTrace Bridge — Built for cross-chain interoperability</p>
          <div className="footer-status">
            <span className={`dot-pulse ${relayerOnline ? 'online' : 'offline'}`}></span>
            <span>Relayer {relayerOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
