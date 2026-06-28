import React, { useState, useEffect } from 'react';
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

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('nova_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('nova_user') || 'null'));
  const [activePage, setActivePage] = useState('dashboard');
  const [datasets, setDatasets] = useState([]);
  const [activeDataset, setActiveDataset] = useState(null);
  const [fetching, setFetching] = useState(false);

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
    </div>
  );
}
