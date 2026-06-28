import React, { useState, useEffect } from 'react';
import { Columns, Hash, FileText, BarChart3, Sparkles, TrendingUp, Database } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import confetti from 'canvas-confetti';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function Dashboard({ activeDataset, token, fetchDatasets, setActiveDataset, user }) {
  const [loading, setLoading] = useState(false);
  const [corrData, setCorrData] = useState(null);
  const [distData, setDistData] = useState(null);
  const [distLoading, setDistLoading] = useState(false);
  const [error, setError] = useState('');
  const [ingestingSamples, setIngestingSamples] = useState(false);
  
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
      fetchDistribution();
    }
  }, [activeDataset]);

  const calculateSummary = () => {
    const schema = activeDataset.schema || {};
    const cols = Object.keys(schema);
    let numeric = 0;
    let categorical = 0;

    cols.forEach(col => {
      const type = schema[col] ? schema[col].type : 'TEXT';
      if (type === 'INTEGER' || type === 'REAL') {
        numeric++;
      } else {
        categorical++;
      }
    });

    setSummaryData({
      rows: activeDataset.row_count || 0,
      cols: activeDataset.col_count || 0,
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

  const fetchDistribution = async () => {
    setDistLoading(true);
    setDistData(null);
    
    const schema = activeDataset.schema;
    const catCol = Object.keys(schema).find(col => schema[col].type === 'TEXT');
    if (!catCol) {
      setDistLoading(false);
      return;
    }

    const sanitizedCol = schema[catCol].sanitized;
    const query = `SELECT "${sanitizedCol}" as label, COUNT(*) as cnt FROM data WHERE "${sanitizedCol}" IS NOT NULL GROUP BY "${sanitizedCol}" ORDER BY cnt DESC LIMIT 6`;

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
      if (response.ok && data.rows && data.rows.length > 0) {
        const labels = data.rows.map(r => r.label === null ? 'NULL' : String(r.label));
        const values = data.rows.map(r => parseInt(r.cnt, 10));

        setDistData({
          columnName: catCol,
          labels,
          datasets: [{
            label: 'Record Frequency',
            data: values,
            backgroundColor: 'rgba(0, 242, 254, 0.45)',
            borderColor: 'rgb(0, 242, 254)',
            borderWidth: 1.5,
            borderRadius: 6
          }]
        });
      }
    } catch (err) {
      console.error('Fetch distribution error:', err);
    } finally {
      setDistLoading(false);
    }
  };

  const handleLoadSamplesDirectly = async () => {
    setIngestingSamples(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/datasets/load-samples', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load demo datasets');
      }

      confetti({
        particleCount: 150,
        spread: 80,
        colors: ['#00f2fe', '#ff007f', '#7f00ff']
      });

      await fetchDatasets();
      if (data.datasets && data.datasets.length > 0) {
        const salesSample = data.datasets.find(d => d.original_name.includes('Sales')) || data.datasets[0];
        setActiveDataset(salesSample);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIngestingSamples(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  const getCellColor = (val) => {
    if (val === 1) return 'rgba(0, 242, 254, 0.45)';
    if (val > 0) {
      return `rgba(0, 242, 254, ${val * 0.4})`;
    } else {
      return `rgba(255, 0, 127, ${Math.abs(val) * 0.45})`;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const distChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } } }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Title & Personal Greeting */}
      <div>
        <span style={{
          fontSize: '10px',
          color: 'var(--neon-cyan)',
          textTransform: 'uppercase',
          fontWeight: '800',
          letterSpacing: '0.15em',
          textShadow: '0 0 10px var(--neon-cyan-glow)'
        }}>
          SYSTEM INITIALIZED // ONLINE
        </span>
        <h1 className="gradient-text" style={{ 
          fontSize: '36px', 
          fontFamily: 'var(--font-display)', 
          marginTop: '4px', 
          fontWeight: '900',
          letterSpacing: '-0.02em'
        }}>
          {getGreeting()}, {user ? user.username : 'Analyst'}!
        </h1>
        {activeDataset && (
          <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: '5px', fontSize: '13.5px' }}>
            Overview profile, metrics, and correlation vectors for <strong>{activeDataset.original_name}</strong>
          </p>
        )}
      </div>

      {error && (
        <div style={{ color: 'var(--neon-magenta)', background: 'rgba(255,0,127,0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,0,127,0.1)' }}>
          {error}
        </div>
      )}

      {!activeDataset ? (
        /* COLD START WORKSPACE */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          gap: '24px',
          textAlign: 'center'
        }}>
          <div className="glass-panel pulse-glowing" style={{
            padding: '50px 40px',
            maxWidth: '650px',
            background: 'rgba(8, 12, 32, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(255, 0, 127, 0.08)',
              border: '2px solid rgba(255, 0, 127, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(255, 0, 127, 0.15)',
              marginBottom: '10px'
            }}>
              <Database size={32} className="text-glow-magenta" />
            </div>

            <h2 className="gradient-text-magenta-orange" style={{ 
              fontSize: '26px', 
              fontWeight: '900', 
              letterSpacing: '0.05em' 
            }}>
              NO DATA INGESTION DETECTED
            </h2>
            
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14.5px', lineHeight: '1.6', maxWidth: '480px' }}>
              The analytics core requires a target dataset to initialize visual intelligence. Inject a CSV/JSON file or immediately deploy pre-configured sample nodes.
            </p>

            <button
              onClick={handleLoadSamplesDirectly}
              disabled={ingestingSamples}
              className="btn-primary hollow-glow"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, var(--neon-cyan) 0%, var(--neon-blue) 100%)',
                boxShadow: '0 4px 15px rgba(0, 242, 254, 0.25)',
                color: '#03050c',
                marginTop: '10px'
              }}
            >
              {ingestingSamples ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: '2px solid rgba(3,5,12,0.2)',
                    borderTopColor: '#03050c',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span>Deploying Demos...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Deploy Demo Datasets</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* FULL WORKSPACE WIDGETS */
        <>
          {/* KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px'
          }}>
            <div className="glass-panel glass-panel-hover" style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(0, 242, 254, 0.06)',
                border: '1px solid rgba(0, 242, 254, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(0, 242, 254, 0.08)'
              }}>
                <Hash className="text-glow-cyan" size={20} />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>Ingested Rows</span>
                <h3 style={{ fontSize: '22px', marginTop: '2px', fontWeight: '800' }}>
                  {summaryData.rows.toLocaleString()}
                </h3>
              </div>
            </div>

            <div className="glass-panel glass-panel-hover" style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(255, 0, 127, 0.06)',
                border: '1px solid rgba(255, 0, 127, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(255, 0, 127, 0.08)'
              }}>
                <Columns className="text-glow-magenta" size={20} />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>Headers Count</span>
                <h3 style={{ fontSize: '22px', marginTop: '2px', fontWeight: '800' }}>
                  {summaryData.cols}
                </h3>
              </div>
            </div>

            <div className="glass-panel glass-panel-hover" style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(0, 245, 160, 0.06)',
                border: '1px solid rgba(0, 245, 160, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(0, 245, 160, 0.08)'
              }}>
                <TrendingUp className="text-glow-emerald" size={20} />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>Numerical Fields</span>
                <h3 style={{ fontSize: '22px', marginTop: '2px', fontWeight: '800', color: 'var(--neon-emerald)' }}>
                  {summaryData.numeric}
                </h3>
              </div>
            </div>

            <div className="glass-panel glass-panel-hover" style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(255, 215, 0, 0.06)',
                border: '1px solid rgba(255, 215, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(255, 215, 0, 0.08)'
              }}>
                <FileText className="text-glow-gold" size={20} />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>Physical Size</span>
                <h3 style={{ fontSize: '22px', marginTop: '2px', fontWeight: '800', color: 'var(--neon-gold)' }}>
                  {formatBytes(activeDataset.file_size)}
                </h3>
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: '20px',
            alignItems: 'stretch'
          }}>
            {/* Panel 1: Heatmap */}
            <div className="glass-panel" style={{ padding: '25px', background: 'rgba(10, 15, 36, 0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Sparkles size={16} className="text-glow-cyan" />
                  <span>Pearson Correlation Heatmap</span>
                </h3>

                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '3px solid rgba(0,242,254,0.1)',
                      borderTopColor: 'var(--neon-cyan)',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '10px'
                    }}></div>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>Evaluating covariance matrix...</p>
                  </div>
                ) : corrData ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', margin: '0 auto', fontSize: '11px' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '6px' }}></th>
                          {corrData.columns.map((c) => (
                            <th
                              key={c}
                              style={{
                                padding: '6px',
                                color: 'rgba(255,255,255,0.5)',
                                transform: 'rotate(-25deg)',
                                whiteSpace: 'nowrap',
                                textAlign: 'left',
                                maxWidth: '70px',
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
                              padding: '6px 8px',
                              color: 'rgba(255,255,255,0.7)',
                              fontWeight: '600',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              maxWidth: '85px',
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
                                    padding: '6px',
                                    textAlign: 'center',
                                    fontFamily: 'monospace',
                                    fontWeight: '700',
                                    background: getCellColor(val),
                                    color: Math.abs(val) > 0.4 ? '#fff' : 'rgba(255,255,255,0.7)',
                                    border: '1px solid #070913',
                                    borderRadius: '4px',
                                    width: '42px',
                                    height: '42px',
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
                  </div>
                ) : null}
              </div>

              {corrData && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '20px',
                  marginTop: '20px',
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.45)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', background: 'rgba(0, 242, 254, 0.45)', borderRadius: '2px' }}></div>
                    <span>Positive Correlation</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', background: 'rgba(255, 0, 127, 0.45)', borderRadius: '2px' }}></div>
                    <span>Negative Correlation</span>
                  </div>
                </div>
              )}
            </div>

            {/* Panel 2: Distribution Bar Chart */}
            <div className="glass-panel" style={{ padding: '25px', background: 'rgba(10, 15, 36, 0.25)', display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
              <h3 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <BarChart3 size={16} className="text-glow-cyan" />
                <span>Value Frequency: {distData ? distData.columnName : 'Dimension'}</span>
              </h3>

              {distLoading ? (
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '3px solid rgba(0,242,254,0.1)',
                    borderTopColor: 'var(--neon-cyan)',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '10px'
                  }}></div>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>Counting record weights...</p>
                </div>
              ) : distData ? (
                <div style={{ position: 'relative', flexGrow: 1, height: '90%' }}>
                  <Bar data={distData} options={distChartOptions} />
                </div>
              ) : (
                <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justify: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '12px', fontStyle: 'italic', fontSize: '13px' }}>
                  No categorical columns found to calculate distributions.
                </div>
              )}
            </div>
          </div>

          {/* Panel 3: Automated Data Insights */}
          <div className="glass-panel" style={{
            padding: '25px',
            background: 'linear-gradient(135deg, rgba(13,20,48,0.35) 0%, rgba(20,10,36,0.35) 100%)',
            borderLeft: '4px solid var(--neon-cyan)'
          }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
              <Sparkles size={16} className="text-glow-magenta" />
              <span>Automated Data Insights</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p>
                  Nova AI has audited your database schema.
                  The table contains <strong>{summaryData.numeric}</strong> numerical variables suitable for vector math, and <strong>{summaryData.categorical}</strong> categorical indices.
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                  Ingested dataset: <code>{activeDataset.table_name}</code>
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="glass-panel" style={{
                  padding: '12px 15px',
                  background: 'rgba(255,255,255,0.01)',
                  borderRadius: '10px',
                  borderLeft: '3px solid var(--neon-gold)'
                }}>
                  <h4 style={{ fontSize: '12px', color: 'var(--neon-gold)', fontWeight: '700', marginBottom: '3px' }}>
                    Recommendation 1: Linear Regression
                  </h4>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    Use **ML Sandbox** to fit a curve between numeric correlations, allowing real-time predictions.
                  </p>
                </div>

                <div className="glass-panel" style={{
                  padding: '12px 15px',
                  background: 'rgba(255,255,255,0.01)',
                  borderRadius: '10px',
                  borderLeft: '3px solid var(--neon-cyan)'
                }}>
                  <h4 style={{ fontSize: '12px', color: 'var(--neon-cyan)', fontWeight: '700', marginBottom: '3px' }}>
                    Recommendation 2: K-Means Clustering
                  </h4>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    Plot spatial vectors on scatter grid coordinates and group centroids to discover cluster centers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
