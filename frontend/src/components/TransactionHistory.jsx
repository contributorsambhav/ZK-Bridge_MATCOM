import { useState, useEffect } from 'react';
import { CHAINS } from '../utils/constants';
import { fetchTransactions, truncateAddress } from '../utils/contracts';
import './TransactionHistory.css';

function TransactionHistory({ refreshTrigger }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const txs = await fetchTransactions();
      setTransactions(txs);
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success">✓ Completed</span>;
      case 'confirming':
        return <span className="badge badge-pending"><span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }}></span> Confirming</span>;
      case 'failed':
        return <span className="badge badge-failed">✗ Failed</span>;
      case 'already-processed':
        return <span className="badge badge-info">Duplicate</span>;
      default:
        return <span className="badge badge-pending">Pending</span>;
    }
  };

  const getDirectionLabel = (type) => {
    if (type === 'sepolia-to-sonic') {
      return (
        <span className="direction-label">
          <span style={{ color: CHAINS.sepolia.color }}>⟠ SEP</span>
          <span className="direction-arrow">→</span>
          <span style={{ color: CHAINS.sonic.color }}>◎ SONIC</span>
        </span>
      );
    }
    return (
      <span className="direction-label">
        <span style={{ color: CHAINS.sonic.color }}>◎ SONIC</span>
        <span className="direction-arrow">→</span>
        <span style={{ color: CHAINS.sepolia.color }}>⟠ SEP</span>
      </span>
    );
  };

  const getExplorerLink = (tx) => {
    const chain = tx.type === 'sepolia-to-sonic' ? 'sepolia' : 'sonic';
    const config = CHAINS[chain];
    return `${config.explorer}/tx/${tx.sourceTxHash}`;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (transactions.length === 0 && !loading) {
    return null; // Don't show section if no transactions
  }

  return (
    <div className="tx-history">
      <div className="tx-history-header">
        <h2>Recent Transactions</h2>
        {loading && <span className="spinner"></span>}
      </div>

      {transactions.length === 0 && loading ? (
        <div className="tx-empty">
          <span className="spinner spinner-lg"></span>
          <p>Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="tx-empty">
          <p>No bridge transactions yet</p>
        </div>
      ) : (
        <div className="tx-list stagger">
          {transactions.map((tx) => (
            <div key={tx.id} className="tx-item glass-card animate-fade-in">
              <div className="tx-item-top">
                {getDirectionLabel(tx.type)}
                {getStatusBadge(tx.status)}
              </div>
              <div className="tx-item-details">
                <div className="tx-amount">
                  <strong>{parseFloat(tx.amount).toFixed(4)}</strong>
                  <span className="tx-token">
                    {tx.type === 'sepolia-to-sonic' ? 'MCM' : 'wMCM'}
                  </span>
                </div>
                <div className="tx-meta">
                  <span className="tx-sender" title={tx.sender}>
                    {truncateAddress(tx.sender)}
                  </span>
                  <span className="tx-time">{formatTime(tx.timestamp)}</span>
                </div>
              </div>
              {tx.sourceTxHash && (
                <a
                  href={getExplorerLink(tx)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tx-explorer-link"
                >
                  View ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TransactionHistory;
