import React, { useState, useEffect } from 'react';
import { TableProperties, Search, Eye, Filter, ArrowUpDown } from 'lucide-react';

export default function DataExplorer({ activeDataset, token }) {
  const [loading, setLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedColumnStats, setSelectedColumnStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeDataset) {
      fetchPreview();
    }
  }, [activeDataset]);

  const fetchPreview = async () => {
    setLoading(true);
    setError('');
    setSelectedColumnStats(null);
    try {
      const response = await fetch(`http://localhost:5000/api/datasets/${activeDataset.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch dataset preview');
      }
      setPreviewRows(data.preview_rows || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedRows = React.useMemo(() => {
    let sortableItems = [...previewRows];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      sortableItems = sortableItems.filter(row => {
        return Object.values(row).some(val => 
          val !== null && String(val).toLowerCase().includes(q)
        );
      });
    }

    // Apply sort
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        // Handle numbers vs strings
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        const aStr = String(aVal || '').toLowerCase();
        const bStr = String(bVal || '').toLowerCase();
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [previewRows, searchQuery, sortConfig]);

  const calculateColumnStats = (colName, originalHeader) => {
    const schema = activeDataset.schema[originalHeader];
    const values = previewRows.map(r => r[colName]).filter(v => v !== null && v !== undefined && v !== '');
    
    if (values.length === 0) {
      setSelectedColumnStats({ name: originalHeader, type: schema.type, empty: true });
      return;
    }

    if (schema.type === 'INTEGER' || schema.type === 'REAL') {
      const numVals = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      if (numVals.length === 0) {
        setSelectedColumnStats({ name: originalHeader, type: schema.type, empty: true });
        return;
      }
      
      const sum = numVals.reduce((acc, v) => acc + v, 0);
      const avg = sum / numVals.length;
      const min = Math.min(...numVals);
      const max = Math.max(...numVals);
      
      // Calculate median
      const sorted = [...numVals].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

      setSelectedColumnStats({
        name: originalHeader,
        type: schema.type,
        count: numVals.length,
        sum: sum.toFixed(2),
        avg: avg.toFixed(2),
        min,
        max,
        median: median.toFixed(2),
        isNumeric: true
      });
    } else {
      // Categorical statistics
      const frequencies = {};
      values.forEach(v => {
        frequencies[v] = (frequencies[v] || 0) + 1;
      });

      const uniqueCount = Object.keys(frequencies).length;
      const sortedFreqs = Object.entries(frequencies).sort((a, b) => b[1] - a[1]);
      const topCategories = sortedFreqs.slice(0, 5).map(([cat, freq]) => ({
        category: cat,
        count: freq,
        percentage: ((freq / values.length) * 100).toFixed(1)
      }));

      setSelectedColumnStats({
        name: originalHeader,
        type: schema.type,
        count: values.length,
        uniqueCount,
        topCategories,
        isNumeric: false
      });
    }
  };

  if (!activeDataset) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0', color: 'rgba(255,255,255,0.4)' }}>
        Please select or upload a dataset first.
      </div>
    );
  }

  const csvHeaders = Object.keys(activeDataset.schema);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Title */}
      <div>
        <span style={{
          fontSize: '11px',
          background: 'var(--neon-cyan-glow)',
          color: 'var(--neon-cyan)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Preview Mode: First 200 Rows Ingested
        </span>
        <h1 className="gradient-text" style={{ fontSize: '32px', fontFamily: 'var(--font-display)', marginTop: '8px' }}>
          DATA EXPLORER
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '5px' }}>
          Interactive relational grid inspector for <strong>{activeDataset.original_name}</strong>
        </p>
      </div>

      {error && (
        <div style={{ color: 'var(--neon-magenta)', background: 'rgba(255,0,127,0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,0,127,0.1)' }}>
          {error}
        </div>
      )}

      {/* Grid Container for Table & Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedColumnStats ? '3fr 1fr' : '1fr',
        gap: '20px',
        alignItems: 'start',
        transition: 'all 0.3s ease'
      }}>
        
        {/* Main Table Panel */}
        <div className="glass-panel" style={{ padding: '25px', background: 'rgba(10, 15, 36, 0.25)', overflow: 'hidden' }}>
          
          {/* Table Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            gap: '15px',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', flexGrow: 1, maxWidth: '400px' }}>
              <Search size={16} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.4)'
              }} />
              <input
                type="text"
                placeholder="Search rows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '38px', height: '40px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={fetchPreview}
                className="btn-glass"
                style={{ height: '40px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span>Reload Data</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '3px solid rgba(0, 242, 254, 0.1)',
                borderTopColor: 'var(--neon-cyan)',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 15px'
              }}></div>
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>Interrogating SQLite Node...</p>
            </div>
          ) : previewRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>
              No rows returned.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxH: '580px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{
                    borderBottom: '2px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '12px',
                    position: 'sticky',
                    top: 0,
                    background: '#0a0d1d',
                    zIndex: 1
                  }}>
                    <th style={{ padding: '12px 10px' }}>#</th>
                    {csvHeaders.map((header) => {
                      const colInfo = activeDataset.schema[header];
                      const isSorted = sortConfig.key === colInfo.sanitized;
                      return (
                        <th
                          key={header}
                          onClick={() => handleSort(colInfo.sanitized)}
                          style={{
                            padding: '12px 10px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{header}</span>
                            <ArrowUpDown size={12} style={{ color: isSorted ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.2)' }} />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                calculateColumnStats(colInfo.sanitized, header);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--neon-cyan)',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="View column statistics"
                            >
                              <Eye size={12} />
                            </button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, idx) => (
                    <tr
                      key={row.id || idx}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        fontSize: '13px',
                        background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'}
                    >
                      <td style={{ padding: '10px 10px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>
                        {idx + 1}
                      </td>
                      {csvHeaders.map((header) => {
                        const sanitized = activeDataset.schema[header].sanitized;
                        return (
                          <td key={header} style={{ padding: '10px 10px', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxW: '200px' }}>
                            {row[sanitized] === null ? <em style={{ color: 'rgba(255,0,127,0.4)' }}>NULL</em> : String(row[sanitized])}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer stats */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '15px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: '15px'
          }}>
            <span>Showing {sortedRows.length} of {previewRows.length} preview rows</span>
            <span>Total Table Size: {activeDataset.row_count.toLocaleString()} rows</span>
          </div>

        </div>

        {/* Statistics Panel (Right) */}
        {selectedColumnStats && (
          <div className="glass-panel" style={{
            padding: '25px',
            background: 'rgba(13, 20, 48, 0.45)',
            borderTop: '3px solid var(--neon-cyan)',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Column Profiler
                </span>
                <h3 style={{ fontSize: '18px', marginTop: '2px', wordBreak: 'break-all' }}>
                  {selectedColumnStats.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedColumnStats(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Data Schema Type</span>
                <p style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: selectedColumnStats.type === 'TEXT' ? 'var(--neon-gold)' : 'var(--neon-cyan)',
                  marginTop: '2px'
                }}>
                  {selectedColumnStats.type}
                </p>
              </div>

              {selectedColumnStats.empty ? (
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', italic: 'true' }}>
                  Column has no valid values for analysis.
                </p>
              ) : selectedColumnStats.isNumeric ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Average</span>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginTop: '2px' }}>{selectedColumnStats.avg}</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Median</span>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginTop: '2px' }}>{selectedColumnStats.median}</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Minimum</span>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--neon-emerald)', marginTop: '2px' }}>{selectedColumnStats.min}</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Maximum</span>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--neon-magenta)', marginTop: '2px' }}>{selectedColumnStats.max}</p>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Summation (Σ)</span>
                    <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--neon-cyan)', marginTop: '2px' }}>{selectedColumnStats.sum}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Unique Cardinals</span>
                    <p style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginTop: '2px' }}>{selectedColumnStats.uniqueCount}</p>
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Top Frequencies</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      {selectedColumnStats.topCategories.map((item, idx) => (
                        <div key={idx} style={{ fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.85)', marginBottom: '3px' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                              {item.category || '(Blank)'}
                            </span>
                            <span style={{ fontWeight: '600' }}>{item.count} ({item.percentage}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                            <div style={{
                              width: `${item.percentage}%`,
                              height: '100%',
                              background: 'var(--neon-cyan)',
                              borderRadius: '2px',
                              boxShadow: '0 0 5px var(--neon-cyan-glow)'
                            }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}} />
    </div>
  );
}
