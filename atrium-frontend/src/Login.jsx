import React, { useState, useEffect } from 'react'; 
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; 

import logoAsset from './assets/atrium-logo.png'; 

const Login = ({ setToken, setRole, closeModal, onSuccess }) => {
  const navigate = useNavigate(); 
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userRole = localStorage.getItem('user_role');
    if (token) {
      if (userRole === 'admin' || userRole === 'staff') {
        navigate('/admin-dashboard');
      } else {
        navigate('/');
      }
    }
  }, [navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isRegister 
      ? 'http://127.0.0.1:8000/api/register/' 
      : 'http://127.0.0.1:8000/api/token/';

    const payload = isRegister 
      ? { username, email, password, role: 'CLIENT' } 
      : { username, password };

    try {
      const response = await axios.post(url, payload);

      if (isRegister) {
        alert("Account created! Welcome to Atrium.");
        setIsRegister(false);
        setPassword('');
      } else {
        const accessToken = response.data.access;
        const refreshToken = response.data.refresh;
        const normalizedRole = (response.data.role || 'client').toLowerCase();

        localStorage.clear();
        localStorage.setItem('access_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
        localStorage.setItem('user_role', normalizedRole);

        setToken(accessToken);
        setRole(normalizedRole);

        if (onSuccess) onSuccess(username, normalizedRole);
        if (closeModal) closeModal();    
        
        navigate(normalizedRole === 'admin' ? '/admin-dashboard' : '/');
      }
    } catch (err) {
      const errorData = err.response?.data;
      let message = "Something went wrong. Please check your inputs.";

      if (typeof errorData === 'object') {
        const firstKey = Object.keys(errorData)[0];
        if (firstKey) {
          const fieldError = errorData[firstKey];
          message = Array.isArray(fieldError) 
            ? `${firstKey.charAt(0).toUpperCase() + firstKey.slice(1)}: ${fieldError[0]}` 
            : JSON.stringify(fieldError);
        }
      } else if (err.response?.data?.detail) {
        message = err.response.data.detail;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <img src={logoAsset} alt="Atrium Logo" style={s.logoImage} />
          <h1 style={s.brand}>ATRIUM TRAVEL AND TOURS</h1>
          <p style={s.subtitle}>Great journey starts with us</p>
        </div>

        {error && <div style={s.errorBadge}>{error}</div>}

        <form onSubmit={handleAuth} style={s.form}>
          <div style={s.inputWrapper}>
            <label style={s.label}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              style={s.input}
              placeholder="Enter username"
              autoComplete="username"
              required
            />
          </div>

          {isRegister && (
            <div style={s.inputWrapper}>
              <label style={s.label}>Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                style={s.input}
                placeholder="yourname@email.com"
                required
              />
            </div>
          )}

          <div style={s.inputWrapper}>
            <label style={s.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                style={s.input}
                placeholder="••••••••"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={s.visibilityBtn}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          {isRegister && (
            <div style={s.inputWrapper}>
              <label style={s.label}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={s.input} placeholder="••••••••" autoComplete="new-password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={s.visibilityBtn}>
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} style={s.button} className="main-btn">
            {loading 
              ? (isRegister ? 'Creating Account...' : 'Authenticating...') 
              : (isRegister ? 'Create Account' : 'Login')}
          </button>
        </form>

        <div style={s.toggleBox}>
          <p style={s.toggleText}>
            {isRegister ? "Already have an account?" : "Don't have an account yet?"}
            <span 
              style={s.toggleLink} 
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
            >
              {isRegister ? ' Log In' : ' Register'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

const s = {
  page: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
    background: 'linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%)',
    fontFamily: "'Inter', sans-serif",
  },
  card: {
    background: '#ffffff',
    padding: '40px',
    borderRadius: '24px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
    border: '1px solid #f1f5f9',
  },
  header: { marginBottom: '32px' },
  logoImage: { width: '72px', height: 'auto', marginBottom: '16px' },
  brand: { fontSize: '24px', fontWeight: '900', color: '#1e3a8a', margin: '0' },
  subtitle: { color: '#94a3b8', fontSize: '14px', marginTop: '4px' },
  form: { textAlign: 'left' },
  inputWrapper: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' },
  input: { width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px', boxSizing: 'border-box', outline: 'none', backgroundColor: '#f8fafc' },
  visibilityBtn: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', fontWeight: '700', cursor: 'pointer' },
  button: { width: '100%', padding: '16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', marginTop: '12px', transition: '0.3s' },
  errorBadge: { color: '#ef4444', fontSize: '13px', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '10px', marginBottom: '24px', border: '1px solid #fee2e2' },
  toggleBox: { marginTop: '24px' },
  toggleText: { fontSize: '14px', color: '#64748b' },
  toggleLink: { color: '#2563eb', fontWeight: '700', cursor: 'pointer', marginLeft: '6px' },
};

if (typeof document !== 'undefined') {
  const styleTag = document.createElement("style");
  styleTag.innerHTML = `
    input:focus { border-color: #2563eb !important; background-color: #ffffff !important; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }
    .main-btn:hover { background: #1d4ed8 !important; }
  `;
  document.head.appendChild(styleTag);
}

export default Login;