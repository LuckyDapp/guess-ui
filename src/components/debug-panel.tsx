import React, { useState, useRef, useEffect } from 'react';
import { useTransactionHistory } from '../contexts/transaction-history-context';
import type { TransactionHistory } from '../types';

export function DebugPanel() {
  const { transactions, clearHistory } = useTransactionHistory();
  const [eventServiceStatus, setEventServiceStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'guess' | 'start_new_game'>('all');
  const [panelHeight, setPanelHeight] = useState(300); // Hauteur par défaut
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Logique de redimensionnement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newHeight = window.innerHeight - e.clientY;
      const minHeight = 100;
      const maxHeight = window.innerHeight * 0.8;
      
      setPanelHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Ajuster dynamiquement le padding du contenu principal
  useEffect(() => {
    const mainContent = document.querySelector('.main-content') as HTMLElement;
    if (mainContent) {
      if (isExpanded) {
        // Panel ouvert : hauteur du panel + espace pour le footer
        const footerHeight = 100; // Hauteur estimée du footer
        const requiredPadding = panelHeight + footerHeight + 20; // Panel + footer + marge
        mainContent.style.paddingBottom = `${requiredPadding}px`;
      } else {
        // Panel fermé : padding minimal pour permettre le scroll
        mainContent.style.paddingBottom = '50px';
      }
    }
  }, [panelHeight, isExpanded]);

  // Surveiller le statut du service d'événements
  useEffect(() => {
    const checkEventServiceStatus = () => {
      // Simuler le statut pour l'instant
      // Dans une vraie implémentation, on écouterait les événements du service
      setEventServiceStatus('connected');
    };

    checkEventServiceStatus();
    const interval = setInterval(checkEventServiceStatus, 5000);

    return () => clearInterval(interval);
  }, []);


  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Debug: vérifier le localStorage
  const checkLocalStorage = () => {
    try {
      const stored = localStorage.getItem('guess-the-number-transaction-history');
      console.log('localStorage content:', stored);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('Parsed localStorage:', parsed);
        console.log('Number of transactions in localStorage:', parsed.length);
      }
    } catch (error) {
      console.error('Error reading localStorage:', error);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.call === filter;
  });

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getStatusColor = (status: TransactionHistory['status']): string => {
    switch (status) {
      case 'pending': return '#ff9800';
      case 'submitted': return '#2196f3';
      case 'finalized': return '#4caf50';
      case 'error': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getEventTypeColor = (eventType: string): string => {
    switch (eventType) {
      case 'guess_submitted': return '#2196f3';
      case 'guess_result': return '#4caf50';
      case 'game_started': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  const getEventTypeLabel = (eventType: string): string => {
    switch (eventType) {
      case 'guess_submitted': return '🎯 Guess Soumis';
      case 'guess_result': return '📊 Résultat';
      case 'game_started': return '🎮 Nouveau Jeu';
      default: return '❓ Événement';
    }
  };

  const getStatusIcon = (status: TransactionHistory['status']): string => {
    switch (status) {
      case 'pending': return '⏳';
      case 'submitted': return '📤';
      case 'finalized': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const safeStringify = (value: any) => {
    try {
      return JSON.stringify(value, (_key, val) => (typeof val === 'bigint' ? val.toString() : val), 2);
    } catch (e) {
      try {
        // Fallback: shallow clone replacing bigints
        const replacer = (v: any): any => {
          if (typeof v === 'bigint') return v.toString();
          if (Array.isArray(v)) return v.map(replacer);
          if (v && typeof v === 'object') {
            const out: any = {};
            for (const k of Object.keys(v)) out[k] = replacer(v[k]);
            return out;
          }
          return v;
        };
        return JSON.stringify(replacer(value), null, 2);
      } catch {
        return String(value);
      }
    }
  };


  return (
    <div 
      className="debug-panel"
      style={{
        position: 'fixed !important' as any,
        bottom: '0px !important' as any,
        left: '0px !important' as any,
        right: '0px !important' as any,
        width: '100vw !important' as any,
        height: 'auto !important' as any,
        zIndex: 2147483647, // Z-index maximum
        pointerEvents: 'auto !important' as any,
        display: 'flex',
        flexDirection: 'column',
        transform: 'translateZ(0)', // Force hardware acceleration
        willChange: 'transform', // Optimisation performance
        isolation: 'isolate', // Nouveau contexte de rendu
        margin: '0 !important' as any,
        padding: '0 !important' as any,
        boxSizing: 'border-box !important' as any,
        contain: 'none !important' as any,
        overflow: 'visible !important' as any
      }}
    >
      {/* Content - toujours visible quand déplié */}
      {isExpanded && (
        <div 
          ref={panelRef}
          className="debug-panel-content"
          style={{
            height: `${panelHeight}px`,
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid #333',
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Poignée de redimensionnement */}
          <div
            onMouseDown={handleResizeStart}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #333, #666, #333)',
              cursor: 'ns-resize',
              zIndex: 1001,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div style={{
              width: '40px',
              height: '2px',
              background: '#888',
              borderRadius: '1px'
            }} />
          </div>
          {/* Controls */}
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            marginBottom: '20px',
            marginTop: '10px', // Espace pour la poignée
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              style={{
                background: '#333',
                color: 'white',
                border: '1px solid #555',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '12px'
              }}
            >
              <option value="all">Toutes les transactions</option>
              <option value="guess">Deviner un nombre</option>
              <option value="start_new_game">Nouveau jeu</option>
            </select>
            
            <button
              onClick={clearHistory}
              style={{
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🗑️ Effacer l'historique
            </button>
            
            <button
              onClick={checkLocalStorage}
              style={{
                background: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🔍 Debug localStorage
            </button>
            
            <button
              onClick={() => {
                console.log('=== DEBUG TRANSACTIONS ===');
                transactions.forEach((tx, index) => {
                  console.log(`Transaction ${index + 1}:`, {
                    id: tx.id,
                    txHash: tx.txHash,
                    txHashLength: tx.txHash?.length,
                    txHashStartsWith: tx.txHash?.startsWith('0x5102'),
                    call: tx.call,
                    status: tx.status,
                    blockNumber: tx.blockNumber
                  });
                });
                console.log('=== END DEBUG ===');
              }}
              style={{
                background: '#9c27b0',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🔍 Debug Transactions
            </button>
          </div>

          {/* Transactions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {filteredTransactions.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#888', 
                padding: '20px',
                fontSize: '14px'
              }}>
                Aucune transaction trouvée
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '15px',
                    fontSize: '12px',
                    color: 'white'
                  }}
                >
                  {/* Header */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>
                        {getStatusIcon(tx.status)}
                      </span>
                      <span style={{ 
                        fontWeight: 'bold',
                        color: getStatusColor(tx.status)
                      }}>
                        {tx.call}
                      </span>
                      <span style={{ 
                        background: '#333',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px'
                      }}>
                        {tx.status}
                      </span>
                    </div>
                    <div style={{ color: '#888', fontSize: '11px' }}>
                      {formatTimestamp(tx.timestamp)}
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {/* Left Column */}
                    <div>
                      {tx.txHash && (
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ color: '#888', fontSize: '10px', marginBottom: '2px' }}>
                            Hash de transaction:
                            {tx.txHash.startsWith('0x5102') && (
                              <span style={{ color: '#4caf50', marginLeft: '8px' }}>
                                ✓ Format signé (0x5102...)
                              </span>
                            )}
                          </div>
                                 <div 
                                   style={{ 
                                     color: '#64b5f6', 
                                     wordBreak: 'break-all',
                                     cursor: 'pointer',
                                     fontSize: '11px',
                                     display: 'flex',
                                     alignItems: 'center',
                                     gap: '8px',
                                     background: 'rgba(0, 0, 0, 0.2)',
                                     padding: '4px',
                                     borderRadius: '4px',
                                     fontFamily: 'monospace'
                                   }}
                                 >
                                   <span
                                     onClick={() => copyToClipboard(tx.txHash!)}
                                     title="Cliquer pour copier"
                                   >
                                     {tx.txHash}
                                   </span>
                                 </div>
                        </div>
                      )}

                      {tx.blockNumber && (
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ color: '#888', fontSize: '10px', marginBottom: '2px' }}>
                            Numéro de bloc:
                          </div>
                          <div style={{ 
                            color: 'white', 
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span>{tx.blockNumber.toLocaleString()}</span>
                            <a
                              href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Ftestnet-passet-hub.polkadot.io#/explorer/query/${tx.blockNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#ff9800',
                                textDecoration: 'none',
                                fontSize: '10px',
                                background: 'rgba(255, 152, 0, 0.1)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid rgba(255, 152, 0, 0.3)'
                              }}
                              title="Voir le bloc dans Polkadot.js (Passet-Hub)"
                            >
                              🔗 Block
                            </a>
                          </div>
                        </div>
                      )}

                      {(tx.gasUsed || tx.fee) && (
                        <div style={{ marginBottom: '8px' }}>
                          {tx.gasUsed && (
                            <div style={{ marginBottom: '4px' }}>
                              <div style={{ color: '#888', fontSize: '10px', marginBottom: '2px' }}>
                                Gas utilisé:
                              </div>
                              <div style={{ color: 'white', fontSize: '11px' }}>
                                {tx.gasUsed}
                              </div>
                            </div>
                          )}
                          {tx.fee && (
                            <div>
                              <div style={{ color: '#888', fontSize: '10px', marginBottom: '2px' }}>
                                Frais:
                              </div>
                              <div style={{ color: 'white', fontSize: '11px' }}>
                                {tx.fee}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ color: '#888', fontSize: '10px', marginBottom: '2px' }}>
                          Paramètres:
                        </div>
                        <div style={{ 
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          maxHeight: '100px',
                          overflowY: 'auto'
                        }}>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                            {safeStringify(tx.parameters)}
                          </pre>
                        </div>
                      </div>

                      {tx.error && (
                        <div>
                          <div style={{ color: '#f44336', fontSize: '10px', marginBottom: '2px' }}>
                            Erreur:
                          </div>
                          <div style={{ 
                            color: '#f44336', 
                            fontSize: '11px',
                            background: 'rgba(244, 67, 54, 0.1)',
                            padding: '4px',
                            borderRadius: '4px'
                          }}>
                            {tx.error}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Events Section */}
                  {tx.events && tx.events.length > 0 && (
                    <div style={{ 
                      marginTop: '15px',
                      borderTop: '1px solid #333',
                      paddingTop: '10px'
                    }}>
                      <div style={{ 
                        color: '#888', 
                        fontSize: '10px', 
                        marginBottom: '8px',
                        fontWeight: 'bold'
                      }}>
                        Événements du jeu ({tx.events.length}):
                      </div>
                      {tx.events.map((event, index) => (
                        <div
                          key={event.id}
                          style={{
                            background: 'rgba(0, 0, 0, 0.2)',
                            border: '1px solid #444',
                            borderRadius: '6px',
                            padding: '8px',
                            marginBottom: '6px',
                            fontSize: '11px'
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '4px'
                          }}>
                            <span style={{ 
                              color: getEventTypeColor(event.eventType),
                              fontWeight: 'bold',
                              fontSize: '10px'
                            }}>
                              {getEventTypeLabel(event.eventType)}
                            </span>
                            <span style={{ color: '#888', fontSize: '10px' }}>
                              {formatTimestamp(event.timestamp)}
                            </span>
                          </div>
                          
                          <div style={{ 
                            background: 'rgba(0, 0, 0, 0.3)',
                            padding: '6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontFamily: 'monospace'
                          }}>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                              {safeStringify(event.data)}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Header - toujours visible */}
      <div 
        className="debug-panel-header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(10px)',
          borderTop: '2px solid #333',
          padding: '10px 20px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🐛 Debug Panel</span>
          <span style={{ 
            background: '#333', 
            padding: '2px 8px', 
            borderRadius: '12px',
            fontSize: '12px'
          }}>
            {transactions.length} transactions
          </span>
          <span style={{ 
            background: eventServiceStatus === 'connected' ? '#4caf50' : eventServiceStatus === 'connecting' ? '#ff9800' : '#f44336',
            padding: '2px 8px', 
            borderRadius: '12px',
            fontSize: '12px',
            color: 'white'
          }}>
            {eventServiceStatus === 'connected' ? '🔗 Events' : eventServiceStatus === 'connecting' ? '⏳ Connecting' : '❌ Disconnected'}
          </span>
          <span style={{ 
            background: '#4caf50', 
            padding: '2px 8px', 
            borderRadius: '12px',
            fontSize: '12px',
            marginLeft: '10px'
          }}>
            💾 Sauvegardé
          </span>
          <span style={{ 
            background: '#2196f3', 
            padding: '2px 8px', 
            borderRadius: '12px',
            fontSize: '12px',
            marginLeft: '10px'
          }}>
            🔄 Initialisé
          </span>
          {isExpanded && (
            <span style={{ 
              background: '#ff9800', 
              padding: '2px 8px', 
              borderRadius: '12px',
              fontSize: '12px',
              marginLeft: '10px'
            }}>
              📏 {panelHeight}px
            </span>
          )}
        </div>
        <div style={{ fontSize: '18px' }}>
          {isExpanded ? '▼' : '▲'}
        </div>
      </div>
    </div>
  );
}
