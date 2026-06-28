import React, { useState } from 'react';
import { Lock, User, CheckCircle, Database } from 'lucide-react';
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
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#00f2fe', '#ff007f', '#00f5a0']
        });
      } else {
        // Celebrate login
        confetti({
          particleCount: 80,
          spread: 40,
          origin: { y: 0.65 },
          colors: ['#00f2fe', '#7f00ff']
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
      position: 'relative',
      overflow: 'hidden',
      backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
      backgroundSize: '24px 24px'
    }}>
      {/* Background glowing nebulas */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 242, 254, 0.15) 0%, transparent 75%)',
        top: '15%',
        left: '15%',
        filter: 'blur(50px)',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255, 0, 127, 0.12) 0%, transparent 75%)',
        bottom: '15%',
        right: '15%',
        filter: 'blur(60px)',
        zIndex: 0
      }}></div>

      <div className="glass-panel pulse-glowing" style={{
        width: '100%',
        maxWidth: '450px',
        padding: '50px 40px',
        zIndex: 1,
        position: 'relative',
        background: 'rgba(6, 10, 26, 0.55)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(0, 242, 254, 0.08), inset 0 0 24px rgba(255,255,255,0.02)'
      }}>
        {/* Logo and title */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          {/* Animated overlapping orbit rings */}
          <div className="floating" style={{
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #090e24 20%, #03050f 100%)',
            border: '1.5px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 30px rgba(0, 242, 254, 0.25), inset 0 0 20px rgba(255, 0, 127, 0.2)',
            position: 'relative',
            cursor: 'pointer'
          }}>
            {/* Outer spinning ring clockwise */}
            <div style={{
              position: 'absolute',
              top: '-6px',
              left: '-6px',
              right: '-6px',
              bottom: '-6px',
              borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: 'var(--neon-cyan)',
              borderBottomColor: 'var(--neon-cyan)',
              animation: 'spin 4s linear infinite',
              opacity: 0.8
            }}></div>
            
            {/* Inner spinning ring counter-clockwise */}
            <div style={{
              position: 'absolute',
              top: '-12px',
              left: '-12px',
              right: '-12px',
              bottom: '-12px',
              borderRadius: '50%',
              border: '1px dashed transparent',
              borderLeftColor: 'var(--neon-magenta)',
              borderRightColor: 'var(--neon-magenta)',
              animation: 'spin-reverse 6s linear infinite',
              opacity: 0.6
            }}></div>

            <Database size={38} className="text-glow-cyan" style={{
              filter: 'drop-shadow(0 0 10px rgba(0,242,254,0.5))'
            }} />
          </div>
          
          <h2 className="gradient-text-cyan-blue" style={{ 
            fontSize: '30px', 
            marginBottom: '8px', 
            fontFamily: 'var(--font-display)',
            fontWeight: '900',
            letterSpacing: '0.08em',
            textShadow: '0 0 15px rgba(0,242,254,0.3)'
          }}>
            NOVA ANALYTICS
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '13.5px', fontWeight: '500' }}>
            {isLogin ? 'Establish secure access connection' : 'Initialize new metadata directory account'}
          </p>
        </div>

        {success ? (
          <div style={{
            textAlign: 'center',
            padding: '30px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <CheckCircle size={72} className="text-glow-emerald" style={{
              filter: 'drop-shadow(0 0 12px rgba(0,245,160,0.4))'
            }} />
            <h3 style={{ color: 'var(--neon-emerald)', fontSize: '20px', fontWeight: '800' }}>
              Connection Synchronized
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              Decrypting database channels...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {error && (
              <div style={{
                background: 'rgba(255, 0, 127, 0.08)',
                border: '1px solid rgba(255, 0, 127, 0.25)',
                color: '#ff80b0',
                padding: '14px',
                borderRadius: '10px',
                fontSize: '13px',
                textAlign: 'center',
                boxShadow: '0 0 10px rgba(255, 0, 127, 0.1)'
              }}>
                {error}
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <User size={18} style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255, 255, 255, 0.4)'
              }} />
              <input
                type="text"
                placeholder="Database Identifier (Username)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ width: '100%', paddingLeft: '48px', height: '48px' }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255, 255, 255, 0.4)'
              }} />
              <input
                type="password"
                placeholder="Access Passcode (Password)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', paddingLeft: '48px', height: '48px' }}
              />
            </div>

            {!isLogin && (
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255, 255, 255, 0.4)'
                }} />
                <input
                  type="password"
                  placeholder="Re-enter Access Passcode"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ width: '100%', paddingLeft: '48px', height: '48px' }}
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
                height: '52px',
                fontSize: '14px',
                fontWeight: '700',
                letterSpacing: '0.1em',
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
                  borderTopColor: '#03050c',
                  animation: 'spin 1s linear infinite'
                }}></div>
              ) : (
                isLogin ? 'Sync Session Node' : 'Register Node Credentials'
              )}
            </button>

            <div style={{
              textAlign: 'center',
              marginTop: '15px',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.45)'
            }}>
              {isLogin ? "New user node? " : "Access credentials established? "}
              <span
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                style={{
                  color: 'var(--neon-cyan)',
                  cursor: 'pointer',
                  fontWeight: '700',
                  textDecoration: 'underline',
                  textShadow: '0 0 10px var(--neon-cyan-glow)'
                }}
              >
                {isLogin ? 'Create Node' : 'Sync Session'}
              </span>
            </div>
          </form>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          to { transform: rotate(-360deg); }
        }
      `}} />
    </div>
  );
}
