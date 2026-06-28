import React, { useState, useEffect } from 'react';
import { Sparkles, Database, Terminal, BarChart3, Brain } from 'lucide-react';
import Auth from './pages/Auth';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Datasets from './pages/Datasets';
import DataExplorer from './pages/DataExplorer';
import ChartStudio from './pages/ChartStudio';
import SQLTerminal from './pages/SQLTerminal';
import AICopilot from './pages/AICopilot';
import MLSandbox from './pages/MLSandbox';
import DataRefiner from './pages/DataRefiner';

const tourSteps = [
  {
    title: "Welcome to Nova Analytics",
    description: "Welcome to your new data intelligence node. Nova Analytics compiles datasets, executes queries, and runs machine learning models over an integrated SQLite core.",
    icon: Sparkles,
    color: "var(--neon-cyan)"
  },
  {
    title: "1. Data Ingestion Node",
    description: "Get started by navigating to the Datasets tab. Here, you can drag & drop your own CSV/JSON files or instantly deploy demo sets with a single click.",
    icon: Database,
    color: "var(--neon-gold)"
  },
  {
    title: "2. Visual Chart Studio",
    description: "Design custom visual dashboards. Select axes, aggregation operators (SUM, AVG, COUNT), and plot interactive bar, line, radar, or pie charts.",
    icon: BarChart3,
    color: "var(--neon-emerald)"
  },
  {
    title: "3. Relational SQL Engine",
    description: "Run read-only SQL queries on your tables inside the interactive SQL terminal. Includes auto-formatting, history logs, and CSV/JSON exporters.",
    icon: Terminal,
    color: "var(--neon-cyan)"
  },
  {
    title: "4. Neural AI Copilot",
    description: "Skip writing code! Ask the AI Copilot questions in natural language. It translates your text to SQL, runs it, and draws the output charts automatically.",
    icon: Sparkles,
    color: "var(--neon-magenta)"
  },
  {
    title: "5. Feature Modeling Sandbox",
    description: "Train regressions to forecast values, partition records into cluster groups, and detect anomalies using standard Z-score deviations.",
    icon: Brain,
    color: "var(--neon-violet)"
  }
];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('nova_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('nova_user') || 'null'));
  const [activePage, setActivePage] = useState('dashboard');
  const [datasets, setDatasets] = useState([]);
  const [activeDataset, setActiveDataset] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [showTour, setShowTour] = useState(!localStorage.getItem('nova_tour_completed'));
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    if (token) {
      fetchDatasets();
    }
  }, [token]);

  const fetchDatasets = async () => {
    setFetching(true);
    try {
      const response = await fetch('http://localhost:5000/api/datasets', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setDatasets(data || []);
        
        // Auto-select first dataset if none is selected
        if (data.length > 0) {
          // Keep selection if it still exists in the list
          const stillExists = activeDataset && data.find(d => d.id === activeDataset.id);
          if (!stillExists) {
            setActiveDataset(data[0]);
          } else {
            // Update activeDataset with fresh counts/schemas
            setActiveDataset(stillExists);
          }
        } else {
          setActiveDataset(null);
          // Redirect to upload manager if empty
          setActivePage('datasets');
        }
      } else {
        // Token might be expired
        if (response.status === 401 || response.status === 403) {
          handleLogout();
        }
      }
    } catch (err) {
      console.error('Fetch datasets error:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleAuthSuccess = (newToken, newUser) => {
    localStorage.setItem('nova_token', newToken);
    localStorage.setItem('nova_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setActivePage('datasets'); // Land on Datasets upload first
  };

  const handleLogout = () => {
    localStorage.removeItem('nova_token');
    localStorage.removeItem('nova_user');
    setToken('');
    setUser(null);
    setDatasets([]);
    setActiveDataset(null);
    setActivePage('dashboard');
  };

  // If no auth token, render login screen
  if (!token) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div className="sidebar-container">
        <Sidebar 
          activePage={activePage} 
          setActivePage={setActivePage} 
          user={user} 
          onLogout={handleLogout}
          activeDataset={activeDataset}
        />
      </div>

      {/* Main Layout Area */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Navbar Header */}
        <Navbar 
          datasets={datasets} 
          activeDataset={activeDataset} 
          setActiveDataset={setActiveDataset} 
          setActivePage={setActivePage} 
        />

        {/* Dynamic page content wrapper */}
        <main className="main-content">
          {activePage === 'dashboard' && (
            <Dashboard 
              activeDataset={activeDataset} 
              token={token} 
              fetchDatasets={fetchDatasets}
              setActiveDataset={setActiveDataset}
            />
          )}

          {activePage === 'datasets' && (
            <Datasets 
              datasets={datasets} 
              fetchDatasets={fetchDatasets} 
              activeDataset={activeDataset} 
              setActiveDataset={setActiveDataset} 
              token={token} 
            />
          )}

          {activePage === 'explorer' && (
            <DataExplorer 
              activeDataset={activeDataset} 
              token={token} 
            />
          )}

          {activePage === 'studio' && (
            <ChartStudio 
              activeDataset={activeDataset} 
              token={token} 
            />
          )}

          {activePage === 'sql' && (
            <SQLTerminal 
              activeDataset={activeDataset} 
              token={token} 
            />
          )}

          {activePage === 'copilot' && (
            <AICopilot 
              activeDataset={activeDataset} 
              token={token} 
            />
          )}

          {activePage === 'ml' && (
            <MLSandbox 
              activeDataset={activeDataset} 
              token={token} 
            />
          )}

          {activePage === 'refiner' && (
            <DataRefiner 
              activeDataset={activeDataset} 
              token={token} 
              onDatasetModified={fetchDatasets}
            />
          )}
        </main>
      </div>
      {showTour && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(3, 5, 12, 0.75)',
          backdropFilter: 'blur(15px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.3s'
        }}>
          <div className="glass-panel pulse-glowing" style={{
            width: '90%',
            maxWidth: '520px',
            padding: '40px',
            background: 'rgba(10, 16, 36, 0.7)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '20px'
          }}>
            {/* Step Icon */}
            {React.createElement(tourSteps[tourStep].icon, {
              size: 48,
              style: {
                color: tourSteps[tourStep].color,
                filter: `drop-shadow(0 0 10px ${tourSteps[tourStep].color}50)`
              }
            })}

            <h3 style={{ fontSize: '20px', fontWeight: '800' }}>
              {tourSteps[tourStep].title}
            </h3>
            
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13.5px', lineHeight: '1.6', minHeight: '80px' }}>
              {tourSteps[tourStep].description}
            </p>

            {/* Stepper Dots */}
            <div style={{ display: 'flex', gap: '8px', margin: '10px 0' }}>
              {tourSteps.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: idx === tourStep ? tourSteps[tourStep].color : 'rgba(255,255,255,0.15)',
                    boxShadow: idx === tourStep ? `0 0 8px ${tourSteps[tourStep].color}` : 'none',
                    transition: 'all 0.3s'
                  }}
                ></div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', marginTop: '15px' }}>
              <button
                onClick={() => {
                  localStorage.setItem('nova_tour_completed', 'true');
                  setShowTour(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                Skip Tour
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {tourStep > 0 && (
                  <button
                    onClick={() => setTourStep(prev => prev - 1)}
                    className="btn-glass"
                    style={{ padding: '6px 16px', fontSize: '12px' }}
                  >
                    Back
                  </button>
                )}
                
                <button
                  onClick={() => {
                    if (tourStep < tourSteps.length - 1) {
                      setTourStep(prev => prev + 1);
                    } else {
                      localStorage.setItem('nova_tour_completed', 'true');
                      setShowTour(false);
                    }
                  }}
                  className="btn-primary"
                  style={{
                    padding: '6px 20px',
                    fontSize: '12px',
                    background: `linear-gradient(135deg, ${tourSteps[tourStep].color} 0%, var(--neon-blue) 100%)`,
                    boxShadow: `0 4px 15px ${tourSteps[tourStep].color}30`,
                    color: '#03050c'
                  }}
                >
                  {tourStep === tourSteps.length - 1 ? 'Get Started' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
