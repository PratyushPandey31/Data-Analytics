import React, { useState, useEffect } from 'react';
import { Brain, LineChart, Target, AlertTriangle, Play, HelpCircle } from 'lucide-react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function MLSandbox({ activeDataset, token }) {
  const [activeTab, setActiveTab] = useState('regression');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Column options
  const numericColumns = activeDataset
    ? Object.keys(activeDataset.schema).filter(
        (col) => activeDataset.schema[col].type === 'INTEGER' || activeDataset.schema[col].type === 'REAL'
      )
    : [];

  // --- Regression State ---
  const [regX, setRegX] = useState('');
  const [regY, setRegY] = useState('');
  const [regResults, setRegResults] = useState(null);
  const [predictInput, setPredictInput] = useState('');
  const [predictedValue, setPredictedValue] = useState(null);

  // --- KMeans State ---
  const [kmCols, setKmCols] = useState(['', '']);
  const [kmK, setKmK] = useState(3);
  const [kmResults, setKmResults] = useState(null);

  // --- Anomaly State ---
  const [anomCol, setAnomCol] = useState('');
  const [anomThresh, setAnomThresh] = useState(2.0);
  const [anomResults, setAnomResults] = useState(null);

  // Reset tab states when dataset changes
  useEffect(() => {
    setRegResults(null);
    setKmResults(null);
    setAnomResults(null);
    setError('');
    setPredictedValue(null);
    
    if (numericColumns.length >= 2) {
      setRegX(numericColumns[0]);
      setRegY(numericColumns[1]);
      setKmCols([numericColumns[0], numericColumns[1]]);
      setAnomCol(numericColumns[0]);
    } else if (numericColumns.length === 1) {
      setAnomCol(numericColumns[0]);
    }
  }, [activeDataset]);

  const handleRunRegression = async () => {
    if (!regX || !regY) return;
    setLoading(true);
    setError('');
    setRegResults(null);
    setPredictedValue(null);
    setPredictInput('');

    try {
      const response = await fetch('http://localhost:5000/api/analytics/regression', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dataset_id: activeDataset.id,
          col_x: regX,
          col_y: regY
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Regression run failed');
      setRegResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = () => {
    if (!regResults || predictInput === '') return;
    const x = parseFloat(predictInput);
    if (isNaN(x)) return;
    const y = regResults.slope * x + regResults.intercept;
    setPredictedValue(y.toFixed(4));
  };

  const handleRunKMeans = async () => {
    if (!kmCols[0] || !kmCols[1]) return;
    setLoading(true);
    setError('');
    setKmResults(null);

    try {
      const response = await fetch('http://localhost:5000/api/analytics/kmeans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dataset_id: activeDataset.id,
          columns: [kmCols[0], kmCols[1]],
          k: kmK
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'K-Means clustering failed');
      setKmResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnomalies = async () => {
    if (!anomCol) return;
    setLoading(true);
    setError('');
    setAnomResults(null);

    try {
      const response = await fetch('http://localhost:5000/api/analytics/anomalies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dataset_id: activeDataset.id,
          column: anomCol,
          threshold: anomThresh
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Anomaly detection failed');
      setAnomResults(data);
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

  // Visual Palette for clusters
  const clusterColors = [
    { border: 'rgb(0, 242, 254)', bg: 'rgba(0, 242, 254, 0.6)' }, // Cyan
    { border: 'rgb(255, 0, 127)', bg: 'rgba(255, 0, 127, 0.6)' }, // Magenta
    { border: 'rgb(0, 245, 160)', bg: 'rgba(0, 245, 160, 0.6)' }, // Emerald
    { border: 'rgb(255, 215, 0)', bg: 'rgba(255, 215, 0, 0.6)' },   // Gold
    { border: 'rgb(127, 0, 255)', bg: 'rgba(127, 0, 255, 0.6)' }, // Violet
    { border: 'rgb(0, 112, 243)', bg: 'rgba(0, 112, 243, 0.6)' }, // Blue
    { border: 'rgb(255, 138, 0)', bg: 'rgba(255, 138, 0, 0.6)' }, // Orange
    { border: 'rgb(255, 255, 255)', bg: 'rgba(255, 255, 255, 0.6)' } // White
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Title */}
      <div>
        <h1 className="gradient-text" style={{ fontSize: '32px', fontFamily: 'var(--font-display)' }}>
          MACHINE LEARNING SANDBOX
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '5px' }}>
          Interrogate numerical features using regression curves, spatial clustering, and variance outlier filters.
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="glass-panel" style={{
        display: 'flex',
        padding: '6px',
        background: 'rgba(10, 15, 36, 0.4)',
        borderRadius: '12px',
        gap: '6px',
        alignSelf: 'flex-start'
      }}>
        <button
          onClick={() => { setActiveTab('regression'); setError(''); }}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: '600',
            background: activeTab === 'regression' ? 'rgba(0, 242, 254, 0.1)' : 'transparent',
            color: activeTab === 'regression' ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <LineChart size={14} />
          <span>Linear Regression</span>
        </button>

        <button
          onClick={() => { setActiveTab('kmeans'); setError(''); }}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: '600',
            background: activeTab === 'kmeans' ? 'rgba(255, 0, 127, 0.1)' : 'transparent',
            color: activeTab === 'kmeans' ? 'var(--neon-magenta)' : 'rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Target size={14} />
          <span>K-Means Clustering</span>
        </button>

        <button
          onClick={() => { setActiveTab('anomalies'); setError(''); }}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: '600',
            background: activeTab === 'anomalies' ? 'rgba(0, 245, 160, 0.1)' : 'transparent',
            color: activeTab === 'anomalies' ? 'var(--neon-emerald)' : 'rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertTriangle size={14} />
          <span>Anomaly Detector</span>
        </button>
      </div>

      {error && (
        <div style={{ color: 'var(--neon-magenta)', background: 'rgba(255,0,127,0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,0,127,0.1)' }}>
          {error}
        </div>
      )}

      {/* TAB CONTENT: 1. LINEAR REGRESSION */}
      {activeTab === 'regression' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'start' }}>
          {/* Settings Left */}
          <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '18px' }}>Regression Config</h3>

            {numericColumns.length < 2 ? (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                Dataset requires at least 2 numerical columns for regression.
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Predictor variable (X)</label>
                  <select value={regX} onChange={(e) => setRegX(e.target.value)}>
                    {numericColumns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Target variable (Y)</label>
                  <select value={regY} onChange={(e) => setRegY(e.target.value)}>
                    {numericColumns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>

                <button
                  onClick={handleRunRegression}
                  disabled={loading}
                  className="btn-primary hollow-glow"
                  style={{
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Play size={14} fill="#070913" />
                  <span>Run Fit Curve</span>
                </button>
              </>
            )}

            {/* Regression Results Summary */}
            {regResults && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', marginTop: '10px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Formula</span>
                  <p style={{ fontSize: '15px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--neon-cyan)', marginTop: '2px' }}>
                    y = {regResults.slope.toFixed(4)}x + {regResults.intercept.toFixed(4)}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>R² Fit Score</span>
                    <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--neon-emerald)', marginTop: '2px' }}>
                      {regResults.r2.toFixed(4)}
                    </p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Sample Count</span>
                    <p style={{ fontSize: '16px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                      {regResults.count}
                    </p>
                  </div>
                </div>

                {/* Prediction block */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px', marginTop: '5px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Real-Time Inference Simulator</span>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <input
                      type="number"
                      placeholder={`Enter ${regX}...`}
                      value={predictInput}
                      onChange={(e) => setPredictInput(e.target.value)}
                      style={{ flexGrow: 1, padding: '8px 12px' }}
                    />
                    <button
                      onClick={handlePredict}
                      className="btn-glass"
                      style={{ padding: '0 16px', fontSize: '12px' }}
                    >
                      Calc Y
                    </button>
                  </div>
                  {predictedValue !== null && (
                    <div style={{ marginTop: '10px', background: 'rgba(0, 242, 254, 0.05)', border: '1px solid rgba(0, 242, 254, 0.15)', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Predicted {regY} (y)</span>
                      <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--neon-cyan)' }}>{predictedValue}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Visual Chart Right */}
          <div className="glass-panel" style={{ padding: '25px', background: 'rgba(10, 15, 36, 0.25)', height: '480px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Inference Plot</h3>
            
            {loading ? (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: '35px',
                  height: '35px',
                  borderRadius: '50%',
                  border: '3px solid rgba(0,242,254,0.1)',
                  borderTopColor: 'var(--neon-cyan)',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '10px'
                }}></div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Fitting linear coefficients...</p>
              </div>
            ) : regResults ? (
              <div style={{ position: 'relative', flexGrow: 1, height: '90%' }}>
                <Scatter
                  data={{
                    datasets: [
                      {
                        label: 'Scatter Population',
                        data: regResults.scatterPoints,
                        backgroundColor: 'rgba(0, 242, 254, 0.5)',
                        borderColor: 'rgb(0, 242, 254)',
                        borderWidth: 1.5,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        showLine: false
                      },
                      {
                        label: 'Fit Curve Line',
                        data: regResults.trendPoints,
                        type: 'line',
                        borderColor: 'rgb(255, 0, 127)',
                        borderWidth: 3,
                        pointRadius: 0,
                        fill: false,
                        showLine: true
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: {
                        type: 'linear',
                        position: 'bottom',
                        title: { display: true, text: regX, color: 'rgba(255,255,255,0.5)', font: { family: 'var(--font-sans)', size: 12 } },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: 'rgba(255,255,255,0.45)' }
                      },
                      y: {
                        title: { display: true, text: regY, color: 'rgba(255,255,255,0.5)', font: { family: 'var(--font-sans)', size: 12 } },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: 'rgba(255,255,255,0.45)' }
                      }
                    },
                    plugins: {
                      legend: { labels: { color: '#fff', font: { family: 'var(--font-sans)' } } }
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justify: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                Select parameters and run fit curve to render.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. K-MEANS CLUSTERING */}
      {activeTab === 'kmeans' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'start' }}>
          {/* Settings Left */}
          <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '18px' }}>K-Means Config</h3>

            {numericColumns.length < 2 ? (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                Dataset requires at least 2 numerical columns for clustering.
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Spatial Feature X</label>
                  <select value={kmCols[0]} onChange={(e) => setKmCols([e.target.value, kmCols[1]])}>
                    {numericColumns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Spatial Feature Y</label>
                  <select value={kmCols[1]} onChange={(e) => setKmCols([kmCols[0], e.target.value])}>
                    {numericColumns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Clusters Count (k): {kmK}</label>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    value={kmK}
                    onChange={(e) => setKmK(parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '0', cursor: 'pointer' }}
                  />
                </div>

                <button
                  onClick={handleRunKMeans}
                  disabled={loading}
                  className="btn-primary hollow-glow"
                  style={{
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, var(--neon-magenta) 0%, var(--neon-violet) 100%)',
                    boxShadow: '0 4px 15px rgba(255, 0, 127, 0.2)'
                  }}
                >
                  <Play size={14} fill="#070913" />
                  <span>Iterate Centroids</span>
                </button>
              </>
            )}

            {/* KMeans Iteration stats */}
            {kmResults && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', marginTop: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Iterations Run</span>
                    <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--neon-magenta)', marginTop: '2px' }}>
                      {kmResults.iterations}
                    </p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Clusters Fit</span>
                    <p style={{ fontSize: '16px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                      {kmResults.k}
                    </p>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Centroid Coordinates</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '6px' }}>
                    {kmResults.centroids.map((centroid, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        background: 'rgba(255,255,255,0.01)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        borderLeft: `3px solid ${clusterColors[idx % clusterColors.length].border}`
                      }}>
                        <span style={{ fontWeight: '600' }}>Node Centroid {idx + 1}</span>
                        <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)' }}>
                          x: {centroid.x.toFixed(2)}, y: {centroid.y.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Visual Chart Right */}
          <div className="glass-panel" style={{ padding: '25px', background: 'rgba(10, 15, 36, 0.25)', height: '480px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Centroid Clustering Plot</h3>

            {loading ? (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: '35px',
                  height: '35px',
                  borderRadius: '50%',
                  border: '3px solid rgba(255,0,127,0.1)',
                  borderTopColor: 'var(--neon-magenta)',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '10px'
                }}></div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Executing K-Means assignment iterations...</p>
              </div>
            ) : kmResults ? (
              <div style={{ position: 'relative', flexGrow: 1, height: '90%' }}>
                <Scatter
                  data={{
                    datasets: [
                      // Render points of different clusters
                      ...Array.from({ length: kmK }).map((_, cIdx) => ({
                        label: `Cluster ${cIdx + 1}`,
                        data: kmResults.points.filter(p => p.cluster === cIdx),
                        backgroundColor: clusterColors[cIdx % clusterColors.length].bg,
                        borderColor: clusterColors[cIdx % clusterColors.length].border,
                        borderWidth: 1.5,
                        pointRadius: 4,
                        pointHoverRadius: 6
                      })),
                      // Render centroids
                      {
                        label: 'Centroids',
                        data: kmResults.centroids,
                        backgroundColor: '#ffffff',
                        borderColor: '#ffffff',
                        borderWidth: 3,
                        pointRadius: 8,
                        pointStyle: 'crossRot',
                        pointHoverRadius: 10
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: {
                        type: 'linear',
                        position: 'bottom',
                        title: { display: true, text: kmCols[0], color: 'rgba(255,255,255,0.5)', font: { family: 'var(--font-sans)', size: 12 } },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: 'rgba(255,255,255,0.45)' }
                      },
                      y: {
                        title: { display: true, text: kmCols[1], color: 'rgba(255,255,255,0.5)', font: { family: 'var(--font-sans)', size: 12 } },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: 'rgba(255,255,255,0.45)' }
                      }
                    },
                    plugins: {
                      legend: { labels: { color: '#fff', font: { family: 'var(--font-sans)' } } }
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justify: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                Select spatial features and execute cluster groups.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. ANOMALY DETECTOR */}
      {activeTab === 'anomalies' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'start' }}>
          {/* Settings Left */}
          <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '18px' }}>Variance Config</h3>

            {numericColumns.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                Dataset requires at least 1 numerical column for anomaly detection.
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Feature to evaluate</label>
                  <select value={anomCol} onChange={(e) => setAnomCol(e.target.value)}>
                    {numericColumns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Z-Score Outlier Margin: {anomThresh}</label>
                  <input
                    type="range"
                    min="1.0"
                    max="4.0"
                    step="0.1"
                    value={anomThresh}
                    onChange={(e) => setAnomThresh(parseFloat(e.target.value))}
                    style={{ width: '100%', padding: '0', cursor: 'pointer' }}
                  />
                </div>

                <button
                  onClick={handleRunAnomalies}
                  disabled={loading}
                  className="btn-primary hollow-glow"
                  style={{
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, var(--neon-emerald) 0%, var(--neon-cyan) 100%)',
                    boxShadow: '0 4px 15px rgba(0, 245, 160, 0.2)',
                    color: '#070913'
                  }}
                >
                  <Play size={14} fill="#070913" />
                  <span>Scan Variances</span>
                </button>
              </>
            )}

            {/* Outlier results summary */}
            {anomResults && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', marginTop: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Population Mean</span>
                    <p style={{ fontSize: '15px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                      {anomResults.mean}
                    </p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Std Deviation</span>
                    <p style={{ fontSize: '15px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                      {anomResults.stdDev}
                    </p>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(255, 0, 127, 0.04)',
                  border: '1px solid rgba(255, 0, 127, 0.2)',
                  padding: '12px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Anomalous Entries Found</span>
                    <p style={{ fontSize: '18px', fontWeight: '800', color: 'var(--neon-magenta)', marginTop: '2px' }}>
                      {anomResults.totalAnomalies}
                    </p>
                  </div>
                  <AlertTriangle size={24} style={{ color: 'var(--neon-magenta)' }} />
                </div>
              </div>
            )}
          </div>

          {/* Anomaly Visuals Right */}
          <div className="glass-panel" style={{ padding: '25px', background: 'rgba(10, 15, 36, 0.25)', height: '480px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Signal Outlier Plot</h3>

            {loading ? (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: '35px',
                  height: '35px',
                  borderRadius: '50%',
                  border: '3px solid rgba(0,245,160,0.1)',
                  borderTopColor: 'var(--neon-emerald)',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '10px'
                }}></div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Scanning signal vectors...</p>
              </div>
            ) : anomResults ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {/* Visual Plot using Scatter */}
                <div style={{ position: 'relative', height: '180px', width: '100%', marginBottom: '15px' }}>
                  <Scatter
                    data={{
                      datasets: [
                        {
                          label: 'Normal Inliers',
                          data: anomResults.values.map((v, idx) => ({ x: idx, y: v })),
                          backgroundColor: 'rgba(0, 245, 160, 0.4)',
                          borderColor: 'rgb(0, 245, 160)',
                          borderWidth: 1,
                          pointRadius: 3
                        },
                        {
                          label: 'Anomalous Outliers',
                          data: anomResults.outlierRows.map((row, idx) => {
                            const val = row[activeDataset.schema[anomCol].sanitized];
                            return { x: idx * Math.max(1, Math.floor(anomResults.values.length / Math.max(1, anomResults.outlierRows.length))), y: val };
                          }),
                          backgroundColor: 'rgba(255, 0, 127, 0.7)',
                          borderColor: 'rgb(255, 0, 127)',
                          borderWidth: 1.5,
                          pointRadius: 5
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: { display: false },
                        y: {
                          grid: { color: 'rgba(255,255,255,0.05)' },
                          ticks: { color: 'rgba(255,255,255,0.45)' }
                        }
                      },
                      plugins: {
                        legend: { display: false }
                      }
                    }}
                  />
                </div>

                {/* List Table of Outliers */}
                <h4 style={{ fontSize: '13px', marginBottom: '8px', color: 'rgba(255,255,255,0.5)' }}>First 10 Outlier Records</h4>
                <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                  {anomResults.outlierRows.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '15px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', fontSize: '13px' }}>
                      No outliers detected under this Z-score filter margin.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                          <th style={{ padding: '8px 5px' }}>SQL ID</th>
                          <th style={{ padding: '8px 5px' }}>Anomaly Value</th>
                          <th style={{ padding: '8px 5px' }}>Z-Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anomResults.outlierRows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '8px 5px', color: 'rgba(255,255,255,0.45)' }}>#{row.id}</td>
                            <td style={{ padding: '8px 5px', color: 'var(--neon-magenta)', fontWeight: '600' }}>
                              {row[activeDataset.schema[anomCol].sanitized]}
                            </td>
                            <td style={{ padding: '8px 5px', color: 'var(--neon-magenta)' }}>
                              {row._zScore > 0 ? `+${row._zScore}` : row._zScore}σ
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justify: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                Select variance column and evaluate signal arrays.
              </div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
