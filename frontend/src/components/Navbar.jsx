import React from 'react';
import { Upload, Database, DatabaseBackup, Radio } from 'lucide-react';

export default function Navbar({ 
  datasets = [], 
  activeDataset, 
  setActiveDataset, 
  setActivePage 
}) {
  return (
    <div className="glass-panel" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '15px 30px',
      margin: '20px 20px 0 20px',
      background: 'rgba(10, 15, 36, 0.45)',
      borderRadius: '16px',
      zIndex: 5
    }}>
      {/* Active dataset selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: activeDataset ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.4)',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {activeDataset ? <Database size={16} /> : <DatabaseBackup size={16} />}
          <span>Target Dataset:</span>
        </div>

        {datasets.length > 0 ? (
          <select
            value={activeDataset ? activeDataset.id : ''}
            onChange={(e) => {
              const selected = datasets.find(d => d.id === parseInt(e.target.value, 10));
              setActiveDataset(selected || null);
            }}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff',
              cursor: 'pointer',
              minWidth: '220px'
            }}
          >
            <option value="" disabled>-- Select Active Dataset --</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.original_name} ({d.row_count} rows)
              </option>
            ))}
          </select>
        ) : (
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', italic: 'true' }}>
            No datasets uploaded.
          </span>
        )}
      </div>

      {/* Quick shortcuts / System metrics */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Node status light */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255,255,255,0.03)',
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.05)',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.6)'
        }}>
          <Radio size={14} className="text-glow-emerald" style={{
            animation: 'pulse 1.5s infinite',
            color: 'var(--neon-emerald)'
          }} />
          <span>Core Online</span>
        </div>

        <button
          onClick={() => setActivePage('datasets')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0, 242, 254, 0.08)',
            border: '1px solid rgba(0, 242, 254, 0.25)',
            color: 'var(--neon-cyan)',
            padding: '6px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--neon-cyan)';
            e.currentTarget.style.color = '#070913';
            e.currentTarget.style.boxShadow = '0 0 10px var(--neon-cyan-glow)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 242, 254, 0.08)';
            e.currentTarget.style.color = 'var(--neon-cyan)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Upload size={14} />
          <span>Upload Dataset</span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}} />
    </div>
  );
}
