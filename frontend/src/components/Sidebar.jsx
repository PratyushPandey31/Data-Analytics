import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  Terminal, 
  Brain, 
  TableProperties, 
  LogOut, 
  Activity 
} from 'lucide-react';

export default function Sidebar({ activePage, setActivePage, user, onLogout, activeDataset }) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'datasets', name: 'Datasets', icon: Database },
    { id: 'explorer', name: 'Data Explorer', icon: TableProperties, requiresDataset: true },
    { id: 'sql', name: 'SQL Terminal', icon: Terminal, requiresDataset: true },
    { id: 'ml', name: 'ML Sandbox', icon: Brain, requiresDataset: true },
  ];

  return (
    <div className="glass-panel" style={{
      height: 'calc(100vh - 40px)',
      margin: '20px 0 20px 20px',
      width: '260px',
      display: 'flex',
      flexDirection: 'column',
      padding: '25px 15px',
      background: 'rgba(10, 15, 36, 0.45)',
      borderRadius: '20px',
      justifyContent: 'space-between',
      position: 'sticky',
      top: '20px',
      zIndex: 10
    }}>
      {/* Top Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '8px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #0e163b 20%, #05081c 100%)',
            border: '1.5px solid rgba(0, 242, 254, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(0, 242, 254, 0.15)'
          }}>
            <Activity size={18} className="text-glow-cyan" />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
              NOVA <span style={{ color: 'var(--neon-cyan)' }}>ANALYTICS</span>
            </h3>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginTop: '-2px' }}>
              v1.0.0 // AI Engine
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activePage === item.id;
            const isDisabled = item.requiresDataset && !activeDataset;

            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && setActivePage(item.id)}
                disabled={isDisabled}
                className={isSelected ? 'hollow-glow' : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: isSelected ? '1px solid var(--neon-cyan)' : '1px solid transparent',
                  background: isSelected 
                    ? 'rgba(0, 242, 254, 0.05)' 
                    : 'transparent',
                  color: isDisabled 
                    ? 'rgba(255,255,255,0.2)' 
                    : isSelected 
                      ? 'var(--neon-cyan)' 
                      : 'rgba(255,255,255,0.75)',
                  textAlign: 'left',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '14px',
                  fontWeight: isSelected ? '600' : '500',
                  boxShadow: isSelected ? '0 0 10px var(--neon-cyan-glow)' : 'none'
                }}
              >
                <Icon size={18} />
                <span style={{ flexGrow: 1 }}>{item.name}</span>
                {isDisabled && (
                  <span style={{ 
                    fontSize: '9px', 
                    background: 'rgba(255,255,255,0.06)', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    color: 'rgba(255,255,255,0.3)'
                  }}>
                    lock
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Profile Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {activeDataset && (
          <div className="glass-panel" style={{
            padding: '12px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)'
          }}>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Node:
            </span>
            <p style={{
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--neon-cyan)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: '2px'
            }}>
              {activeDataset.original_name}
            </p>
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '15px',
          gap: '10px'
        }}>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Logged in as</p>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {user?.username || 'Guest'}
            </h4>
          </div>

          <button
            onClick={onLogout}
            style={{
              background: 'rgba(255, 0, 127, 0.08)',
              border: '1px solid rgba(255, 0, 127, 0.2)',
              color: 'var(--neon-magenta)',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title="Log Out Node"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--neon-magenta)';
              e.currentTarget.style.color = '#070913';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 0, 127, 0.08)';
              e.currentTarget.style.color = 'var(--neon-magenta)';
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
