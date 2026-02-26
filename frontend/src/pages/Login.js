import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Login attempt with username:', username);
      const result = await login(username, password);
      console.log('Login result:', { success: result.success, error: result.error });

      if (result.success) {
        // Redirect based on user role
        if (result.user.role === 'superadmin') {
          navigate('/superadmin');
        } else if (result.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        const errorMsg = result.error || 'Login failed. Please check your credentials and try again.';
        console.error('Login error:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Unexpected error during login:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '1rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ marginBottom: '2rem', textAlign: 'center', color: '#000', fontWeight: '700', letterSpacing: '0.5px' }}>
          Login to your account
        </h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
