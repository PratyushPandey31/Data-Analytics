import React, { useState } from 'react';
import { Activity, Lock, User, CheckCircle, Database } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin && password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setSuccess(true);
      if (!isLogin) {
        // Celebrate registration
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00f2fe', '#ff007f', '#00f5a0']
        });
      }

      setTimeout(() => {
        onAuthSuccess(data.token, data.user);
      }, 1200);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Background glowing circles */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, var(--neon-cyan-glow) 0%, transparent 70%)',
        top: '20%',
        left: '25%',
        filter: 'blur(30px)',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, var(--neon-magenta-glow) 0%, transparent 70%)',
        bottom: '20%',
        right: '25%',
        filter: 'blur(40px)',
        zIndex: 0
      }}></div>

      <div className="glass-panel pulse-glowing" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '40px',
        zIndex: 1,
        position: 'relative',
        background: 'rgba(10, 15, 36, 0.4)'
      }}>
        {/* Logo and title */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          {/* Custom round appealing logo */}
          <div className="floating" style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #0e163b 20%, #05081c 100%)',
            border: '2px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 15px',
            boxShadow: '0 0 20px rgba(0, 242, 254, 0.2), inset 0 0 15px rgba(255, 0, 127, 0.25)',
            position: 'relative',
            cursor: 'pointer'
          }}>
            {/* Spinning orbit ring */}
            <div style={{
              position: 'absolute',
              top: '-4px',
              left: '-4px',
              right: '-4px',
              bottom: '-4px',
              borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: 'var(--neon-cyan)',
              borderBottomColor: 'var(--neon-magenta)',
              animation: 'spin 3s linear infinite'
            }}></div>
            <Database size={36} className="text-glow-cyan" />
          </div>
          
          <h2 className="gradient-text-cyan-blue" style={{ fontSize: '28px', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
            NOVA ANALYTICS
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
            {isLogin ? 'Enter the portal to decipher your data' : 'Create an intelligence node account'}
          </p>
        </div>

        {success ? (
          <div style={{
            textAlign: 'center',
            padding: '30px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px'
          }}>
            <CheckCircle size={64} className="text-glow-emerald" />
            <h3 style={{ color: 'var(--neon-emerald)' }}>
              Authentication Verified
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
              Initializing neural dashboards...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div style={{
                background: 'rgba(255, 0, 127, 0.1)',
                border: '1px solid rgba(255, 0, 127, 0.25)',
                color: '#ff80b0',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '13px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <User size={18} style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255, 255, 255, 0.4)'
              }} />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ width: '100%', paddingLeft: '44px' }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255, 255, 255, 0.4)'
              }} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', paddingLeft: '44px' }}
              />
            </div>

            {!isLogin && (
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255, 255, 255, 0.4)'
                }} />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ width: '100%', paddingLeft: '44px' }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary hollow-glow"
              style={{
                width: '100%',
                marginTop: '10px',
                height: '48px',
                fontSize: '15px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {loading ? (
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '2px solid rgba(7, 9, 19, 0.2)',
                  borderTopColor: '#070913',
                  animation: 'spin 1s linear infinite'
                }}></div>
              ) : (
                isLogin ? 'Sync Session' : 'Create Node'
              )}
            </button>

            <div style={{
              textAlign: 'center',
              marginTop: '15px',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              {isLogin ? "New to the grid? " : "Already registered? "}
              <span
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                style={{
                  color: 'var(--neon-cyan)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  textDecoration: 'underline'
                }}
              >
                {isLogin ? 'Register Node' : 'Initialize Session'}
              </span>
            </div>
          </form>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
