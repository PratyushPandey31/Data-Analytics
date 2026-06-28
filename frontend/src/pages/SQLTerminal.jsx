import React, { useState, useEffect } from 'react';
import { Terminal, Play, Download, History, Database, AlertCircle, FileCode } from 'lucide-react';

export default function SQLTerminal({ activeDataset, token }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (activeDataset) {
      // Setup default query
      setQuery(`SELECT * FROM data LIMIT 10;`);
      fetchHistory();
    }
  }, [activeDataset]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/query/history?dataset_id=${activeDataset.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setHistory(data || []);
      }
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('http://localhost:5000/api/query/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dataset_id: activeDataset.id,
          query: query
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute query');
      }

      setResults(data);
      fetchHistory(); // Refresh history log
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    if (!results || !results.rows || results.rows.length === 0) return;

    let content = '';
    let mimeType = '';
    let filename = `query_result_${Date.now()}`;

    if (format === 'json') {
      content = JSON.stringify(results.rows, null, 2);
      mimeType = 'application/json';
      filename += '.json';
    } else if (format === 'csv') {
      const headers = results.headers;
      const csvRows = [
        headers.join(','),
        ...results.rows.map(row => 
          headers.map(h => {
            const cell = row[h] === null ? '' : String(row[h]);
            // Escape double quotes and wrap in quotes if contains commas/quotes
            const escaped = cell.replace(/"/g, '""');
            return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
              ? `"${escaped}"`
              : escaped;
          }).join(',')
        )
      ];
      content = csvRows.join('\n');
      mimeType = 'text/csv';
      filename += '.csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!activeDataset) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0', color: 'rgba(255,255,255,0.4)' }}>
        Please select or upload a dataset first.
      </div>
    );
  }

  const schema = activeDataset.schema;
  const originalHeaders = Object.keys(schema);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Title */}
      <div>
        <h1 className="gradient-text" style={{ fontSize: '32px', fontFamily: 'var(--font-display)' }}>
          SQL TERMINAL
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '5px' }}>
          Query SQLite table dynamically using SQL. Reference active table as <code>data</code>.
        </p>
      </div>

      {/* Grid Layout for SQL Panel & Column helper */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '3fr 1fr',
        gap: '20px',
        alignItems: 'start'
      }}>
        
        {/* Terminal area */}
        <div className="glass-panel" style={{ padding: '25px', background: 'rgba(10, 15, 36, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
              $ query_engine --dataset={activeDataset.table_name}
            </span>
            
            <button
              onClick={handleExecute}
              disabled={loading}
              className="btn-primary hollow-glow"
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: '36px'
              }}
            >
              {loading ? (
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  border: '2px solid rgba(7,9,19,0.2)',
                  borderTopColor: '#070913',
                  animation: 'spin 1s linear infinite'
                }}></div>
              ) : (
                <>
                  <Play size={12} fill="#070913" />
                  <span>Execute SQL</span>
                </>
              )}
            </button>
          </div>

          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SELECT * FROM data WHERE sales > 100 ORDER BY sales DESC LIMIT 10;"
            style={{
              width: '100%',
              minHeight: '160px',
              fontFamily: 'Consolas, Monaco, monospace',
              fontSize: '14px',
              lineHeight: '1.6',
              background: 'rgba(5, 7, 20, 0.8)',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '16px',
              borderRadius: '12px',
              color: 'var(--neon-cyan)',
              resize: 'vertical'
            }}
          />

          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '8px', fontStyle: 'italic' }}>
            Note: ONLY read-only <code>SELECT</code> statements are executed for node safety constraints.
          </p>
        </div>

        {/* Database Explorer helper sidebar */}
        <div className="glass-panel" style={{
          padding: '25px',
          background: 'rgba(10, 15, 36, 0.45)',
          maxHeight: '260px',
          overflowY: 'auto'
        }}>
          <h3 style={{ fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={14} className="text-glow-cyan" />
            <span>Table Schema Helper</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {originalHeaders.map(col => {
              const info = schema[col];
              return (
                <div
                  key={col}
                  onClick={() => {
                    // Append column name to query at current cursor or just end
                    setQuery(prev => prev.trim().replace(/;?$/, ` "${info.sanitized}"`));
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    border: '1px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.2)';
                    e.currentTarget.style.background = 'rgba(0, 242, 254, 0.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                  title="Click to insert column into query"
                >
                  <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.85)' }}>
                    {info.sanitized}
                  </span>
                  <span style={{
                    fontSize: '9px',
                    color: info.type === 'TEXT' ? 'var(--neon-gold)' : 'var(--neon-cyan)',
                    fontWeight: '600'
                  }}>
                    {info.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Error display */}
      {error && (
        <div className="glass-panel" style={{
          padding: '15px 20px',
          background: 'rgba(255, 0, 127, 0.08)',
          border: '1px solid rgba(255, 0, 127, 0.2)',
          color: '#ff80b0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderRadius: '12px'
        }}>
          <AlertCircle size={20} />
          <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{error}</span>
        </div>
      )}

      {/* Query Results & History */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: results ? '3fr 1fr' : '1fr',
        gap: '20px'
      }}>
        {/* Results Block */}
        {results && (
          <div className="glass-panel" style={{ padding: '25px', background: 'rgba(10, 15, 36, 0.25)', overflow: 'hidden' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              paddingBottom: '15px'
            }}>
              <div>
                <h3 style={{ fontSize: '18px' }}>Query Output</h3>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  Returned {results.rows.length} rows in {results.execution_time_ms}ms
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleExport('csv')}
                  className="btn-glass"
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={12} />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="btn-glass"
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={12} />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {results.rows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                Query executed successfully, but returned 0 rows.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', maxH: '400px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{
                      borderBottom: '2px solid rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '12px',
                      background: '#0a0d1d',
                      position: 'sticky',
                      top: 0
                    }}>
                      <th style={{ padding: '10px' }}>#</th>
                      {results.headers.map(h => (
                        <th key={h} style={{ padding: '10px', fontFamily: 'monospace' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          fontSize: '13px',
                          background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '8px 10px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>
                          {idx + 1}
                        </td>
                        {results.headers.map(h => (
                          <td key={h} style={{ padding: '8px 10px', color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>
                            {row[h] === null ? <em style={{ color: 'rgba(255,0,127,0.4)' }}>NULL</em> : String(row[h])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Query History log */}
        <div className="glass-panel" style={{ padding: '25px', background: 'rgba(10, 15, 36, 0.4)' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={14} className="text-glow-magenta" />
            <span>Terminal History</span>
          </h3>

          {historyLoading ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Loading history...</p>
          ) : history.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontStyle: 'italic' }}>
              No history recorded.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxH: '380px', overflowY: 'auto' }}>
              {history.map((hItem) => (
                <div
                  key={hItem.id}
                  onClick={() => setQuery(hItem.query_text)}
                  style={{
                    background: 'rgba(5, 7, 20, 0.5)',
                    border: `1px solid ${hItem.status === 'SUCCESS' ? 'rgba(0, 245, 160, 0.1)' : 'rgba(255, 0, 127, 0.1)'}`,
                    borderRadius: '8px',
                    padding: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = hItem.status === 'SUCCESS' ? 'rgba(0, 245, 160, 0.1)' : 'rgba(255, 0, 127, 0.1)';
                  }}
                  title="Click to load into editor"
                >
                  <p style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: hItem.status === 'SUCCESS' ? '#fff' : '#ff80b0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: '4px'
                  }}>
                    {hItem.query_text}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>
                    <span>{hItem.execution_time_ms}ms</span>
                    <span>{new Date(hItem.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
