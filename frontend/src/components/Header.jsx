import { CHAINS } from '../utils/constants';
import { truncateAddress, switchNetwork } from '../utils/contracts';
import './Header.css';

function Header({ wallet, currentChain, relayerOnline, onConnect, onDisconnect }) {
  const chainConfig = currentChain ? CHAINS[currentChain] : null;

  const handleSwitchNetwork = async (chain) => {
    try {
      await switchNetwork(chain);
    } catch (err) {
      console.error('Failed to switch network:', err);
    }
  };

  return (
    <header className="header">
      <div className="container header-inner">
        {/* Logo */}
        <div className="header-logo">
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="24" height="24" rx="6" stroke="url(#logo-grad)" strokeWidth="2"/>
              <path d="M8 14h12M14 8v12" stroke="url(#logo-grad)" strokeWidth="2" strokeLinecap="round"/>
              <defs>
                <linearGradient id="logo-grad" x1="2" y1="2" x2="26" y2="26">
                  <stop stopColor="#6366f1"/>
                  <stop offset="1" stopColor="#a855f7"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="logo-text">MATCOM</span>
          <span className="logo-badge">Bridge</span>
        </div>

        {/* Right section */}
        <div className="header-actions">
          {/* Relayer status */}
          <div className="header-status">
            <span className={`dot-pulse ${relayerOnline ? 'online' : 'offline'}`}></span>
            <span className="status-label">{relayerOnline ? 'Live' : 'Offline'}</span>
          </div>

          {/* Network indicator */}
          {wallet.connected && chainConfig && (
            <div className="network-indicator" style={{ borderColor: `${chainConfig.color}40` }}>
              <span className="network-dot" style={{ backgroundColor: chainConfig.color }}></span>
              <span className="network-name">{chainConfig.name}</span>
            </div>
          )}

          {/* Network switcher */}
          {wallet.connected && (
            <div className="network-switcher">
              <button
                className={`network-btn ${currentChain === 'sepolia' ? 'active' : ''}`}
                onClick={() => handleSwitchNetwork('sepolia')}
                style={{ '--chain-color': CHAINS.sepolia.color }}
              >
                ⟠
              </button>
              <button
                className={`network-btn ${currentChain === 'sonic' ? 'active' : ''}`}
                onClick={() => handleSwitchNetwork('sonic')}
                style={{ '--chain-color': CHAINS.sonic.color }}
              >
                ◎
              </button>
            </div>
          )}

          {/* Wallet button */}
          {wallet.connected ? (
            <button className="btn btn-secondary wallet-btn" onClick={onDisconnect} id="wallet-disconnect-btn">
              <span className="wallet-address">{truncateAddress(wallet.address)}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </button>
          ) : (
            <button className="btn btn-primary wallet-btn" onClick={onConnect} id="wallet-connect-btn">
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
