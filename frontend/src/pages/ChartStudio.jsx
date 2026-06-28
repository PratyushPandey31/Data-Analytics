import React, { useState, useEffect, useRef } from 'react';
import { Play, Sparkles } from 'lucide-react';
import { Bar, Line, Pie, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend
);

export default function ChartStudio({ activeDataset, token }) {
  const [chartType, setChartType] = useState('bar');
  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');
  const [aggType, setAggType] = useState('SUM');
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState('');

  const columns = activeDataset ? Object.keys(activeDataset.schema) : [];
  const numericColumns = activeDataset
    ? Object.keys(activeDataset.schema).filter(
        (col) => activeDataset.schema[col].type === 'INTEGER' || activeDataset.schema[col].type === 'REAL'
      )
    : [];

  useEffect(() => {
    if (columns.length > 0) {
      const catCol = columns.find(c => activeDataset.schema[c].type === 'TEXT') || columns[0];
      const numCol = numericColumns[0] || columns[0];
      setXCol(catCol);
      setYCol(numCol);
    }
  }, [activeDataset]);

  const handleBuildChart = async () => {
    if (!xCol || !yCol) return;
    setLoading(true);
    setError('');
    setChartData(null);

    const xSanitized = activeDataset.schema[xCol].sanitized;
    const ySanitized = activeDataset.schema[yCol].sanitized;

    let selectClause = `"${xSanitized}" as label`;
    let sqlQuery = '';

    if (aggType === 'SUM') {
      selectClause += `, SUM("${ySanitized}") as val`;
    } else if (aggType === 'AVG') {
      selectClause += `, AVG("${ySanitized}") as val`;
    } else if (aggType === 'MAX') {
      selectClause += `, MAX("${ySanitized}") as val`;
    } else if (aggType === 'MIN') {
      selectClause += `, MIN("${ySanitized}") as val`;
    } else if (aggType === 'COUNT') {
      selectClause += `, COUNT(*) as val`;
    }

    sqlQuery = `SELECT ${selectClause} FROM data GROUP BY "${xSanitized}" ORDER BY val DESC LIMIT 15`;

    try {
      const response = await fetch('http://localhost:5000/api/query/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dataset_id: activeDataset.id,
          query: sqlQuery
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to aggregate values');
      }

      if (data.rows.length === 0) {
        throw new Error('Aggregation returned 0 records. Check column values.');
      }

      const labels = data.rows.map(r => r.label === null ? 'NULL' : String(r.label));
      const values = data.rows.map(r => parseFloat(r.val || 0));

      setChartData({
        labels,
        datasets: [{
          label: `${aggType} of ${yCol}`,
          data: values,
          backgroundColor: chartType === 'pie'
            ? [
                'rgba(0, 242, 254, 0.6)',
                'rgba(255, 0, 127, 0.6)',
                'rgba(0, 245, 160, 0.6)',
                'rgba(255, 215, 0, 0.6)',
                'rgba(127, 0, 255, 0.6)',
                'rgba(0, 112, 243, 0.6)',
                'rgba(255, 138, 0, 0.6)'
              ]
            : 'rgba(0, 242, 254, 0.55)',
          borderColor: chartType === 'pie'
            ? [
                'rgb(0, 242, 254)',
                'rgb(255, 0, 127)',
                'rgb(0, 245, 160)',
                'rgb(255, 215, 0)',
                'rgb(127, 0, 255)',
                'rgb(0, 112, 243)',
                'rgb(255, 138, 0)'
              ]
            : 'rgb(0, 242, 254)',
          borderWidth: chartType === 'line' ? 3 : 1.5,
          fill: chartType === 'line',
          tension: 0.4
        }]
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    },
    scales: chartType !== 'pie' ? {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.03)',
          borderDash: [5, 5]
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: { family: 'var(--font-sans)', size: 10, weight: '500' }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.03)',
          borderDash: [5, 5]
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: { family: 'var(--font-sans)', size: 10, weight: '500' }
        }
      }
    } : undefined,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.85)',
          font: { family: 'var(--font-sans)', size: 11, weight: '600' }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(10, 16, 36, 0.85)',
        borderColor: 'rgba(0, 242, 254, 0.25)',
        borderWidth: 1,
        titleColor: '#fff',
        titleFont: { family: 'var(--font-sans)', weight: '700' },
        bodyColor: 'rgba(255, 255, 255, 0.95)',
        bodyFont: { family: 'var(--font-sans)' },
        padding: 10,
        cornerRadius: 6,
        displayColors: true
      }
    }
  };

  // Callback helper to inject linear canvas gradient
  const getGradientData = (canvas) => {
    if (!chartData) return {};
    const ctx = canvas.getContext('2d');
    const chartHeight = canvas.offsetHeight || 300;
    
    // Create glowing gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    
    let startColor = 'rgba(0, 242, 254, 0.45)';
    let endColor = 'rgba(0, 242, 254, 0)';
    let borderColor = 'rgb(0, 242, 254)';
    
    if (chartType === 'line') {
      startColor = 'rgba(0, 242, 254, 0.2)';
      endColor = 'rgba(0, 242, 254, 0.01)';
    } else if (chartType === 'radar') {
      startColor = 'rgba(255, 0, 127, 0.25)';
      endColor = 'rgba(255, 0, 127, 0.02)';
      borderColor = 'rgb(255, 0, 127)';
    }

    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);

    return {
      labels: chartData.labels,
      datasets: [{
        ...chartData.datasets[0],
        backgroundColor: chartType === 'pie' ? chartData.datasets[0].backgroundColor : gradient,
        borderColor: chartType === 'pie' ? chartData.datasets[0].borderColor : borderColor
      }]
    };
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
          CHART STUDIO
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '5px' }}>
          Compile metrics over the entire database and render customized bar, line, radar, or pie layouts.
        </p>
      </div>

      {error && (
        <div style={{ color: 'var(--neon-magenta)', background: 'rgba(255,0,127,0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,0,127,0.1)' }}>
          {error}
        </div>
      )}

      {/* Workspace Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* Settings Box (Left) */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '18px' }}>Chart Studio Config</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Visual Layout Type</label>
            <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
              <option value="bar">Bar Chart</option>
              <option value="line">Line / Trend Curve</option>
              <option value="pie">Doughnut / Pie Grid</option>
              <option value="radar">Radar Matrix</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Independent Axis (X)</label>
            <select value={xCol} onChange={(e) => setXCol(e.target.value)}>
              <option value="" disabled>-- Select Dimension --</option>
              {columns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Dependent Values (Y)</label>
            <select value={yCol} onChange={(e) => setYCol(e.target.value)}>
              <option value="" disabled>-- Select Metric --</option>
              {numericColumns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Aggregation Operator</label>
            <select value={aggType} onChange={(e) => setAggType(e.target.value)}>
              <option value="SUM">SUM (Totals)</option>
              <option value="AVG">AVG (Averages)</option>
              <option value="MAX">MAX (Highest Bounds)</option>
              <option value="MIN">MIN (Lowest Bounds)</option>
              <option value="COUNT">COUNT (Row Frequency)</option>
            </select>
          </div>

          <button
            onClick={handleBuildChart}
            disabled={loading || !xCol || !yCol}
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
            <span>Generate Chart</span>
          </button>
        </div>

        {/* Visual Chart Canvas Box (Right) */}
        <div className="glass-panel" style={{
          padding: '25px',
          background: 'rgba(10, 15, 36, 0.25)',
          height: '460px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px 0 rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 242, 254, 0.05), inset 0 0 20px 0 rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} className="text-glow-cyan" />
              <span>Visual Output Preview</span>
            </h3>
          </div>

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
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Compiling aggregation vectors...</p>
            </div>
          ) : chartData ? (
            <div style={{ position: 'relative', flexGrow: 1, height: '90%' }}>
              {chartType === 'bar' && <Bar data={getGradientData} options={chartOptions} />}
              {chartType === 'line' && <Line data={getGradientData} options={chartOptions} />}
              {chartType === 'pie' && <Pie data={getGradientData} options={chartOptions} />}
              {chartType === 'radar' && <Radar data={getGradientData} options={chartOptions} />}
            </div>
          ) : (
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justify: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '12px' }}>
              Configure axes and compile to visualize.
            </div>
          )}
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
