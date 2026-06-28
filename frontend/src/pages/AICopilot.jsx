import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Terminal, BarChart3, Database, MessageSquare } from 'lucide-react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
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
  Title,
  Tooltip,
  Legend
);

export default function AICopilot({ activeDataset, token }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Set default initial messages
  useEffect(() => {
    if (activeDataset) {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: `Hello! I am your Nova AI Copilot. Ask me questions about **${activeDataset.original_name}** in plain English, and I will translate them to SQL, query the SQLite database, and plot the results!`,
          suggestions: [
            `show average sales of each segment`,
            `total profit by product`,
            `show top 5 records`,
            `count of rows per region`
          ]
        }
      ]);
    }
  }, [activeDataset]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const promptText = textToSend || question;
    if (!promptText.trim()) return;

    // Add user message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: promptText
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setQuestion('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/query/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dataset_id: activeDataset.id,
          question: promptText
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Copilot failed to compile query');
      }

      // Format response chart data if available
      let chartConfig = null;
      if (data.suggested_chart !== 'none' && data.rows.length > 0) {
        const labels = data.rows.map(r => String(Object.values(r)[0]));
        const vals = data.rows.map(r => Number(Object.values(r)[1] || 0));

        chartConfig = {
          type: data.suggested_chart,
          data: {
            labels,
            datasets: [{
              label: Object.keys(data.rows[0])[1] || 'Value',
              data: vals,
              backgroundColor: data.suggested_chart === 'pie' 
                ? ['rgba(0, 242, 254, 0.6)', 'rgba(255, 0, 127, 0.6)', 'rgba(0, 245, 160, 0.6)', 'rgba(255, 215, 0, 0.6)', 'rgba(127, 0, 255, 0.6)', 'rgba(0, 112, 243, 0.6)']
                : 'rgba(0, 242, 254, 0.5)',
              borderColor: data.suggested_chart === 'pie'
                ? ['rgb(0, 242, 254)', 'rgb(255, 0, 127)', 'rgb(0, 245, 160)', 'rgb(255, 215, 0)', 'rgb(127, 0, 255)', 'rgb(0, 112, 243)']
                : 'rgb(0, 242, 254)',
              borderWidth: 1.5
            }]
          }
        };
      }

      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `Here is what I compiled from your request:`,
        sql: data.sql,
        headers: data.headers,
        rows: data.rows,
        chart: chartConfig,
        stats: `${data.rows.length} rows returned in ${data.execution_time_ms}ms`
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errMsg = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: `I had trouble translating that to SQL:`,
        error: err.message
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = (chart) => {
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: 'rgba(255,255,255,0.7)', font: { family: 'var(--font-sans)', size: 10 } } }
      },
      scales: chart.type !== 'pie' ? {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } }
      } : undefined
    };

    return (
      <div style={{ height: '220px', width: '100%', marginTop: '15px', background: 'rgba(5,7,20,0.4)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
        {chart.type === 'bar' && <Bar data={chart.data} options={options} />}
        {chart.type === 'line' && <Line data={chart.data} options={options} />}
        {chart.type === 'pie' && <Pie data={chart.data} options={options} />}
      </div>
    );
  };

  if (!activeDataset) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0', color: 'rgba(255,255,255,0.4)' }}>
        Please select or upload a dataset first.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', gap: '20px' }}>
      
      {/* Main Chat Area (Left) */}
      <div className="glass-panel" style={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(10, 15, 36, 0.35)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '16px 24px',
          background: 'rgba(7,9,19,0.2)'
        }}>
          <Sparkles className="text-glow-cyan" size={18} />
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700' }}>AI Copilot Node</h3>
            <span style={{ fontSize: '10px', color: 'var(--neon-cyan)' }}>Natural Language SQL Compiler</span>
          </div>
        </div>

        {/* Message Feed */}
        <div style={{
          flexGrow: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {messages.map((msg) => {
            const isAI = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isAI ? 'flex-start' : 'flex-end',
                  alignItems: 'start',
                  gap: '12px'
                }}
              >
                {isAI && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #0e163b 20%, #05081c 100%)',
                    border: '1px solid rgba(0, 242, 254, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Sparkles size={14} className="text-glow-cyan" />
                  </div>
                )}

                <div style={{
                  maxWidth: '75%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{
                    background: isAI ? 'rgba(255,255,255,0.03)' : 'rgba(0, 242, 254, 0.08)',
                    border: isAI ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0, 242, 254, 0.25)',
                    padding: '12px 16px',
                    borderRadius: isAI ? '0 16px 16px 16px' : '16px 0 16px 16px',
                    fontSize: '13.5px',
                    color: '#fff',
                    lineHeight: '1.5'
                  }}>
                    <p>{msg.text}</p>

                    {msg.error && (
                      <p style={{ color: 'var(--neon-magenta)', fontFamily: 'monospace', fontSize: '12px', marginTop: '8px' }}>
                        {msg.error}
                      </p>
                    )}

                    {msg.sql && (
                      <div style={{ marginTop: '12px' }}>
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Terminal size={10} />
                          <span>Generated SQL</span>
                        </span>
                        <pre style={{
                          background: 'rgba(0,0,0,0.4)',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          color: 'var(--neon-cyan)',
                          marginTop: '4px',
                          whiteSpace: 'pre-wrap'
                        }}>{msg.sql}</pre>
                      </div>
                    )}

                    {msg.chart && renderChart(msg.chart)}

                    {/* Table results summary preview */}
                    {msg.rows && msg.rows.length > 0 && (
                      <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Database size={10} />
                          <span>Table Preview ({msg.stats})</span>
                        </span>
                        <div style={{ overflowX: 'auto', maxH: '120px', marginTop: '4px' }}>
                          <table style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }}>
                                {msg.headers.map(h => <th key={h} style={{ padding: '4px' }}>{h}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {msg.rows.slice(0, 3).map((r, rIdx) => (
                                <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  {msg.headers.map(h => <td key={h} style={{ padding: '4px', color: 'rgba(255,255,255,0.8)' }}>{String(r[h])}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suggestions list */}
                  {msg.suggestions && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
                      {msg.suggestions.map((s, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSend(s)}
                          className="btn-glass hollow-glow"
                          style={{
                            padding: '6px 12px',
                            fontSize: '11.5px',
                            borderRadius: '20px',
                            borderColor: 'rgba(0, 242, 254, 0.25)',
                            color: 'rgba(255,255,255,0.85)'
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(0,242,254,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={14} className="text-glow-cyan" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 16px', borderRadius: '0 12px 12px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--neon-cyan)', animation: 'bounce 1.4s infinite ease-in-out both' }}></div>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--neon-cyan)', animation: 'bounce 1.4s infinite ease-in-out both 0.2s' }}></div>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--neon-cyan)', animation: 'bounce 1.4s infinite ease-in-out both 0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '20px 24px',
            display: 'flex',
            gap: '12px',
            background: 'rgba(7,9,19,0.2)'
          }}
        >
          <input
            type="text"
            placeholder={`Ask about ${activeDataset.original_name}... (e.g. show average sales of each segment)`}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
            style={{
              flexGrow: 1,
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(5,7,20,0.6)'
            }}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="btn-primary"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'none'
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}} />
    </div>
  );
}
