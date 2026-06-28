import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Columns, Hash, FileText, BarChart3, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';
import { Scatter } from 'react-chartjs-2';

export default function Dashboard({ activeDataset, token }) {
  const [loading, setLoading] = useState(false);
  const [corrData, setCorrData] = useState(null);
  const [error, setError] = useState('');
  const [summaryData, setSummaryData] = useState({
    rows: 0,
    cols: 0,
    numeric: 0,
    categorical: 0
  });

  useEffect(() => {
    if (activeDataset) {
      calculateSummary();
      fetchCorrelation();
    }
  }, [activeDataset]);

  const calculateSummary = () => {
    const schema = activeDataset.schema;
    const cols = Object.keys(schema);
    let numeric = 0;
    let categorical = 0;

    cols.forEach(col => {
      const type = schema[col].type;
      if (type === 'INTEGER' || type === 'REAL') {
        numeric++;
      } else {
        categorical++;
      }
    });

    setSummaryData({
      rows: activeDataset.row_count,
      cols: activeDataset.col_count,
      numeric,
      categorical
    });
  };

  const fetchCorrelation = async () => {
    setLoading(true);
    setError('');
    setCorrData(null);
    try {
      const response = await fetch('http://localhost:5000/api/analytics/correlation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dataset_id: activeDataset.id })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch correlation matrix');
      }
      setCorrData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!activeDataset) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0', color: 'rgba(255,255,255,0.4)' }}>
        Please select or upload a dataset first.
      </div>
    );
  }

  // Helper to determine background color for correlation cells
  const getCellColor = (val) => {
    if (val === 1) return 'rgba(0, 242, 254, 0.45)'; // Self correlation
    if (val > 0) {
      return `rgba(0, 242, 254, ${val * 0.4})`; // Cyan positive
    } else {
      return `rgba(255, 0, 127, ${Math.abs(val) * 0.45})`; // Magenta negative
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Title */}
      <div>
        <h1 className="gradient-text" style={{ fontSize: '32px', fontFamily: 'var(--font-display)' }}>
          INTELLIGENCE DASHBOARD
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '5px' }}>
          Overview profile, metrics, and correlation vectors for <strong>{activeDataset.original_name}</strong>
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        {/* Total Rows */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(0, 242, 254, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(0, 242, 254, 0.1)'
          }}>
            <Hash className="text-glow-cyan" size={20} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Ingested Rows</span>
            <h3 style={{ fontSize: '20px', marginTop: '2px', fontWeight: '800' }}>
              {summaryData.rows.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Total Columns */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(255, 0, 127, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(255, 0, 127, 0.1)'
          }}>
            <Columns className="text-glow-magenta" size={20} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Headers Count</span>
            <h3 style={{ fontSize: '20px', marginTop: '2px', fontWeight: '800' }}>
              {summaryData.cols}
            </h3>
          </div>
        </div>

        {/* Numerical Columns */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(0, 245, 160, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(0, 245, 160, 0.1)'
          }}>
            <TrendingUp className="text-glow-emerald" size={20} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Numerical fields</span>
            <h3 style={{ fontSize: '20px', marginTop: '2px', fontWeight: '800', color: 'var(--neon-emerald)' }}>
              {summaryData.numeric}
            </h3>
          </div>
        </div>

        {/* File Size */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(255, 215, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(255, 215, 0, 0.1)'
          }}>
            <FileText className="text-glow-gold" size={20} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Physical Size</span>
            <h3 style={{ fontSize: '20px', marginTop: '2px', fontWeight: '800', color: 'var(--neon-gold)' }}>
              {formatBytes(activeDataset.file_size)}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Content Dashboard Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* Correlation Heatmap */}
        <div className="glass-panel" style={{ padding: '25px', background: 'rgba(10, 15, 36, 0.25)', minHeight: '380px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} className="text-glow-cyan" />
              <span>Pearson Correlation Heatmap</span>
            </h3>

            {corrData && (
              <span style={{ fontSize: '10px', color: 'var(--neon-cyan)', background: 'rgba(0, 242, 254, 0.05)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
                Matrix Fit ok
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                border: '3px solid rgba(0,242,254,0.1)',
                borderTopColor: 'var(--neon-cyan)',
                animation: 'spin 1s linear infinite',
                marginBottom: '10px'
              }}></div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Evaluating covariance matrix...</p>
            </div>
          ) : error ? (
            <div style={{ color: 'var(--neon-magenta)', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
              {error}
            </div>
          ) : corrData ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', margin: '0 auto', fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px' }}></th>
                    {corrData.columns.map((c) => (
                      <th
                        key={c}
                        style={{
                          padding: '8px',
                          color: 'rgba(255,255,255,0.5)',
                          transform: 'rotate(-25deg)',
                          whiteSpace: 'nowrap',
                          fontFamily: 'var(--font-sans)',
                          textAlign: 'left',
                          maxWidth: '75px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {corrData.columns.map((colNameX, idxX) => (
                    <tr key={colNameX}>
                      <td style={{
                        padding: '8px',
                        color: 'rgba(255,255,255,0.7)',
                        fontWeight: '600',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        fontFamily: 'var(--font-sans)',
                        maxWidth: '90px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {colNameX}
                      </td>
                      {corrData.columns.map((colNameY, idxY) => {
                        const val = corrData.matrix[idxX][idxY];
                        return (
                          <td
                            key={colNameY}
                            style={{
                              padding: '8px',
                              textAlign: 'center',
                              fontFamily: 'monospace',
                              fontWeight: '700',
                              background: getCellColor(val),
                              color: Math.abs(val) > 0.4 ? '#fff' : 'rgba(255,255,255,0.7)',
                              border: '1.5px solid #070913',
                              borderRadius: '4px',
                              width: '46px',
                              height: '46px',
                              fontSize: '11px'
                            }}
                            title={`Correlation [${colNameX}] & [${colNameY}]: ${val}`}
                          >
                            {val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Legends explanation */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '20px',
                marginTop: '25px',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.45)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', background: 'rgba(0, 242, 254, 0.4)', borderRadius: '2px' }}></div>
                  <span>Positive Correlation (+1.0)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', background: 'rgba(255, 0, 127, 0.4)', borderRadius: '2px' }}></div>
                  <span>Negative Correlation (-1.0)</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* ML Guidance summary card */}
        <div className="glass-panel" style={{
          padding: '25px',
          background: 'linear-gradient(135deg, rgba(13,20,48,0.4) 0%, rgba(20,10,36,0.4) 100%)',
          minHeight: '380px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
              <BarChart3 size={16} className="text-glow-magenta" />
              <span>Automated Data Insights</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.6' }}>
              <p>
                Nova AI has audited your dataset schema.
                The table contains <strong>{summaryData.numeric}</strong> numerical variables suitable for vector math, and <strong>{summaryData.categorical}</strong> categorical indices.
              </p>
              
              <div className="glass-panel" style={{
                padding: '12px 15px',
                background: 'rgba(255,255,255,0.01)',
                borderRadius: '8px',
                borderLeft: '3px solid var(--neon-gold)'
              }}>
                <h4 style={{ fontSize: '12px', color: 'var(--neon-gold)', fontWeight: '700', marginBottom: '4px' }}>
                  Recommendation 1: Linear Regression
                </h4>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                  Use <strong>ML Sandbox</strong> to fit a curve between numeric correlations, allowing real-time predictions.
                </p>
              </div>

              <div className="glass-panel" style={{
                padding: '12px 15px',
                background: 'rgba(255,255,255,0.01)',
                borderRadius: '8px',
                borderLeft: '3px solid var(--neon-cyan)'
              }}>
                <h4 style={{ fontSize: '12px', color: 'var(--neon-cyan)', fontWeight: '700', marginBottom: '4px' }}>
                  Recommendation 2: K-Means Clustering
                </h4>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                  Plot spatial vectors on scatter grid coordinates and group centroids to discover cluster centers.
                </p>
              </div>
            </div>
          </div>

          <div style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.3)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: '15px',
            marginTop: '15px',
            textAlign: 'center'
          }}>
            Powered by SQLite Relational Query Compiler
          </div>
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
