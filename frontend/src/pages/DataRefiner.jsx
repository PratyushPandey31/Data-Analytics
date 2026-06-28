import React, { useState } from 'react';
import { ShieldAlert, Trash2, Edit3, Filter, AlertCircle, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function DataRefiner({ activeDataset, token, onDatasetModified }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const columns = activeDataset ? Object.keys(activeDataset.schema) : [];
  const numericColumns = activeDataset
    ? Object.keys(activeDataset.schema).filter(
        (col) => activeDataset.schema[col].type === 'INTEGER' || activeDataset.schema[col].type === 'REAL'
      )
    : [];

  // Operation States
  const [dropCol, setDropCol] = useState(columns[0] || '');
  const [fillCol, setFillCol] = useState(numericColumns[0] || '');
  const [fillStrategy, setFillStrategy] = useState('mean');
  const [fillCustomValue, setFillCustomValue] = useState('');
  
  const [outlierCol, setOutlierCol] = useState(numericColumns[0] || '');
  const [outlierThresh, setOutlierThresh] = useState(2.0);

  // Sync columns on load
  React.useEffect(() => {
    if (columns.length > 0) {
      setDropCol(columns[0]);
    }
    if (numericColumns.length > 0) {
      setFillCol(numericColumns[0]);
      setOutlierCol(numericColumns[0]);
    }
  }, [activeDataset]);

  const handleCleanOperation = async (operationType, payload) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:5000/api/datasets/clean', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dataset_id: activeDataset.id,
          operation: operationType,
          ...payload
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Cleansing operation failed');
      }

      setSuccess(data.message);
      
      confetti({
        particleCount: 60,
        spread: 40,
        colors: ['#00f5a0', '#00f2fe']
      });

      // Notify parent to refresh datasets list
      if (onDatasetModified) {
        await onDatasetModified();
      }

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Title */}
      <div>
        <h1 className="gradient-text" style={{ fontSize: '32px', fontFamily: 'var(--font-display)' }}>
          DATA REFINER
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '5px' }}>
          Visual ETL pipeline to prune columns, impute empty values, and purge variance anomalies in SQLite tables.
        </p>
      </div>

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
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="glass-panel" style={{
          padding: '15px 20px',
          background: 'rgba(0, 245, 160, 0.08)',
          border: '1px solid rgba(0, 245, 160, 0.2)',
          color: '#80ffc0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderRadius: '12px'
        }}>
          <CheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}

      {/* Grid of ETL Cleaning Tools */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        
        {/* Card 1: Drop Column */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px' }}>
          <div>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Trash2 size={16} style={{ color: 'var(--neon-magenta)' }} />
              <span>Prune Column</span>
            </h3>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', marginBottom: '15px' }}>
              Deletes the specified column from the SQLite schema. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Select Target Column</label>
              <select value={dropCol} onChange={(e) => setDropCol(e.target.value)} style={{ width: '100%' }}>
                {columns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={() => handleCleanOperation('drop_column', { column: dropCol })}
            disabled={loading || !dropCol}
            className="btn-primary"
            style={{
              width: '100%',
              marginTop: '20px',
              background: 'rgba(255, 0, 127, 0.08)',
              border: '1px solid rgba(255, 0, 127, 0.25)',
              color: 'var(--neon-magenta)',
              boxShadow: 'none'
            }}
          >
            Drop Column
          </button>
        </div>

        {/* Card 2: Fill Null Values */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px' }}>
          <div>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Edit3 size={16} style={{ color: 'var(--neon-cyan)' }} />
              <span>Impute NULL Values</span>
            </h3>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', marginBottom: '15px' }}>
              Fills empty (NULL) values in numeric columns using a statistical mean/median or custom fallback.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Numeric Column</label>
                <select value={fillCol} onChange={(e) => setFillCol(e.target.value)} style={{ width: '100%' }}>
                  {numericColumns.length === 0 ? (
                    <option value="">No Numeric Fields</option>
                  ) : (
                    numericColumns.map(col => <option key={col} value={col}>{col}</option>)
                  )}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
                  <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Strategy</label>
                  <select value={fillStrategy} onChange={(e) => setFillStrategy(e.target.value)} style={{ width: '100%', padding: '8px 12px' }}>
                    <option value="mean">Mean (Average)</option>
                    <option value="median">Median</option>
                    <option value="custom">Custom value</option>
                  </select>
                </div>

                {fillStrategy === 'custom' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100px' }}>
                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Value</label>
                    <input
                      type="text"
                      placeholder="0"
                      value={fillCustomValue}
                      onChange={(e) => setFillCustomValue(e.target.value)}
                      style={{ padding: '8px 12px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => handleCleanOperation('fill_nulls', {
              column: fillCol,
              strategy: fillStrategy,
              custom_value: fillCustomValue
            })}
            disabled={loading || !fillCol}
            className="btn-primary"
            style={{
              width: '100%',
              marginTop: '20px',
              background: 'rgba(0, 242, 254, 0.08)',
              border: '1px solid rgba(0, 242, 254, 0.25)',
              color: 'var(--neon-cyan)',
              boxShadow: 'none'
            }}
          >
            Impute Missing
          </button>
        </div>

        {/* Card 3: Outlier Purger */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px' }}>
          <div>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Filter size={16} style={{ color: 'var(--neon-emerald)' }} />
              <span>Outlier Purger</span>
            </h3>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', marginBottom: '15px' }}>
              Deletes records that deviate excessively from the mean, cleaning the source data table.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Target Field</label>
                <select value={outlierCol} onChange={(e) => setOutlierCol(e.target.value)} style={{ width: '100%' }}>
                  {numericColumns.length === 0 ? (
                    <option value="">No Numeric Fields</option>
                  ) : (
                    numericColumns.map(col => <option key={col} value={col}>{col}</option>)
                  )}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Z-Score Bound: {outlierThresh}σ</label>
                <input
                  type="range"
                  min="1.5"
                  max="4.0"
                  step="0.1"
                  value={outlierThresh}
                  onChange={(e) => setOutlierThresh(parseFloat(e.target.value))}
                  style={{ width: '100%', padding: '0', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => handleCleanOperation('remove_outliers', {
              column: outlierCol,
              threshold: outlierThresh
            })}
            disabled={loading || !outlierCol}
            className="btn-primary"
            style={{
              width: '100%',
              marginTop: '20px',
              background: 'rgba(0, 245, 160, 0.08)',
              border: '1px solid rgba(0, 245, 160, 0.25)',
              color: 'var(--neon-emerald)',
              boxShadow: 'none'
            }}
          >
            Purge Outliers
          </button>
        </div>

      </div>

    </div>
  );
}
