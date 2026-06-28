import React, { useState } from 'react';
import { Upload, Trash2, FileSpreadsheet, Eye, Plus, Database, Sparkles, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Datasets({ datasets, fetchDatasets, activeDataset, setActiveDataset, token }) {
  const [uploading, setUploading] = useState(false);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [error, setError] = useState('');
  const [selectedSchema, setSelectedSchema] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('dataset', file);

    setUploading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/datasets/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload dataset');
      }

      // Celebrate upload success
      confetti({
        particleCount: 80,
        spread: 50,
        colors: ['#00f2fe', '#00f5a0']
      });

      await fetchDatasets();
      // Set uploaded as active if none is active
      if (!activeDataset) {
        setActiveDataset(data.dataset);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLoadSamples = async () => {
    setLoadingSamples(true);
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
        origin: { y: 0.5 },
        colors: ['#00f2fe', '#ff007f', '#7f00ff']
      });

      await fetchDatasets();
      if (data.datasets && data.datasets.length > 0) {
        // Auto-select first sample (Sales Performance Data) as active
        const salesSample = data.datasets.find(d => d.original_name.includes('Sales')) || data.datasets[0];
        setActiveDataset(salesSample);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSamples(false);
    }
  };

  const handleDeleteDataset = async (id, tableName) => {
    if (!window.confirm('Are you sure you want to delete this dataset? This will drop the database table.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/datasets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete dataset');
      }

      if (activeDataset && activeDataset.id === id) {
        setActiveDataset(null);
      }
      if (selectedSchema && selectedSchema.id === id) {
        setSelectedSchema(null);
      }

      await fetchDatasets();
    } catch (err) {
      setError(err.message);
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
          DATASET MANAGER
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '5px' }}>
          Upload files or initialize neural demo sets to analyze
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

      {/* Grid of upload actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {/* Upload card */}
        <div className="glass-panel" style={{
          padding: '30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: '220px',
          background: 'rgba(13, 20, 48, 0.3)',
          borderStyle: 'dashed',
          borderWidth: '2px',
          borderColor: 'rgba(0, 242, 254, 0.3)',
          position: 'relative'
        }}>
          <input
            type="file"
            accept=".csv,.json"
            onChange={handleFileUpload}
            disabled={uploading}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: uploading ? 'not-allowed' : 'pointer'
            }}
          />
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(0, 242, 254, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '15px',
            boxShadow: '0 0 15px rgba(0, 242, 254, 0.1)'
          }}>
            <Upload className="text-glow-cyan" size={24} />
          </div>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>
            {uploading ? 'Processing File...' : 'Upload CSV or JSON'}
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', maxWidth: '240px' }}>
            Drag and drop your dataset here or click to browse. Max size 20MB.
          </p>
        </div>

        {/* Load Demo Datasets card */}
        <div className="glass-panel" style={{
          padding: '30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: '220px',
          background: 'rgba(255, 0, 127, 0.02)'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(255, 0, 127, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '15px',
            boxShadow: '0 0 15px rgba(255, 0, 127, 0.1)'
          }}>
            <Sparkles className="text-glow-magenta" size={24} />
          </div>
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>
            No Data? Load Core Demos
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '15px', maxWidth: '260px' }}>
            Initialize three pre-configured industry sales, clustering, and telemetry datasets.
          </p>
          <button
            onClick={handleLoadSamples}
            disabled={loadingSamples}
            className="btn-primary hollow-glow"
            style={{
              padding: '10px 24px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, var(--neon-magenta) 0%, var(--neon-violet) 100%)',
              border: 'none',
              boxShadow: '0 4px 15px rgba(255, 0, 127, 0.2)'
            }}
          >
            {loadingSamples ? 'Injecting Nodes...' : 'Instantiate Demo Sets'}
          </button>
        </div>
      </div>

      {/* Datasets List */}
      <div className="glass-panel" style={{ padding: '30px', background: 'rgba(10, 15, 36, 0.25)' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Database size={20} className="text-glow-cyan" />
          <span>Active Ingestions ({datasets.length})</span>
        </h2>

        {datasets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>
            No active datasets loaded. Use the uploader above or trigger demo sets.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                  <th style={{ padding: '15px 10px' }}>Name</th>
                  <th style={{ padding: '15px 10px' }}>Size</th>
                  <th style={{ padding: '15px 10px' }}>Rows</th>
                  <th style={{ padding: '15px 10px' }}>Columns</th>
                  <th style={{ padding: '15px 10px' }}>Loaded At</th>
                  <th style={{ padding: '15px 10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((d) => {
                  const isActive = activeDataset && activeDataset.id === d.id;
                  return (
                    <tr
                      key={d.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        fontSize: '14px',
                        background: isActive ? 'rgba(0, 242, 254, 0.02)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ padding: '15px 10px', fontWeight: '500' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileSpreadsheet size={16} style={{ color: isActive ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.4)' }} />
                          <span style={{ color: isActive ? 'var(--neon-cyan)' : '#fff' }}>
                            {d.original_name}
                          </span>
                          {isActive && (
                            <span style={{
                              fontSize: '10px',
                              background: 'var(--neon-cyan)',
                              color: '#070913',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '700'
                            }}>
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '15px 10px', color: 'rgba(255,255,255,0.6)' }}>
                        {formatBytes(d.file_size)}
                      </td>
                      <td style={{ padding: '15px 10px', fontWeight: '600', color: 'rgba(255,255,255,0.85)' }}>
                        {d.row_count.toLocaleString()}
                      </td>
                      <td style={{ padding: '15px 10px', color: 'rgba(255,255,255,0.6)' }}>
                        {d.col_count}
                      </td>
                      <td style={{ padding: '15px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                        {new Date(d.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '15px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {!isActive && (
                            <button
                              onClick={() => setActiveDataset(d)}
                              className="btn-glass"
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>Select</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedSchema(d)}
                            className="btn-glass"
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              borderColor: 'rgba(255,255,255,0.1)'
                            }}
                          >
                            <Eye size={12} />
                            <span>Schema</span>
                          </button>
                          <button
                            onClick={() => handleDeleteDataset(d.id, d.table_name)}
                            style={{
                              background: 'rgba(255,0,127,0.05)',
                              border: '1px solid rgba(255,0,127,0.15)',
                              color: 'var(--neon-magenta)',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schema Modal/Detail View */}
      {selectedSchema && (
        <div className="glass-panel" style={{
          padding: '30px',
          background: 'rgba(13, 20, 48, 0.45)',
          borderLeft: '4px solid var(--neon-cyan)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                SQLite Relational Schema Mapping
              </span>
              <h3 style={{ fontSize: '20px', marginTop: '2px' }}>
                {selectedSchema.original_name}
              </h3>
            </div>
            <button
              onClick={() => setSelectedSchema(null)}
              className="btn-glass"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Close Schema
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '12px'
          }}>
            {Object.keys(selectedSchema.schema).map((original) => {
              const info = selectedSchema.schema[original];
              
              // Pick colors for types
              let badgeColor = 'rgba(255, 255, 255, 0.1)';
              let textColor = '#fff';
              if (info.type === 'INTEGER') {
                badgeColor = 'rgba(0, 245, 160, 0.1)';
                textColor = 'var(--neon-emerald)';
              } else if (info.type === 'REAL') {
                badgeColor = 'rgba(0, 242, 254, 0.1)';
                textColor = 'var(--neon-cyan)';
              } else if (info.type === 'TEXT') {
                badgeColor = 'rgba(255, 215, 0, 0.1)';
                textColor = 'var(--neon-gold)';
              }

              return (
                <div
                  key={original}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '12px 16px',
                    borderRadius: '10px'
                  }}
                >
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    CSV: {original}
                  </p>
                  <h4 style={{ fontSize: '14px', margin: '4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    SQL: {info.sanitized}
                  </h4>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: '700',
                    background: badgeColor,
                    color: textColor,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    display: 'inline-block',
                    marginTop: '4px'
                  }}>
                    {info.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
