import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Support both string path and location object redirects
  const rawFrom = location.state?.from;
  const redirectTarget = typeof rawFrom === 'string'
    ? rawFrom
    : rawFrom?.pathname
      ? `${rawFrom.pathname}${rawFrom.search || ''}`
      : '/my-reports';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both your CBIT email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(redirectTarget, {
        replace: true,
        state: { claimItemId: location.state?.claimItemId }
      });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mt-5 mb-5" style={{ maxWidth: '480px' }}>
      <div className="card">
        <div className="card-header bg-primary text-white text-center py-3">
          <h4 className="mb-0 fw-bold">Student Login</h4>
          <small>CBIT Lost &amp; Found Portal</small>
        </div>
        <div className="card-body p-4">
          {location.state?.message && (
            <div className="alert alert-info py-2" role="alert">
              {location.state.message}
            </div>
          )}

          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="loginEmail" className="form-label fw-semibold">
                Institutional Email Address *
              </label>
              <input
                type="email"
                className="form-control"
                id="loginEmail"
                placeholder="e.g. rahul.sharma@cbit.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <div className="form-text">Use your official @cbit.ac.in student email.</div>
            </div>

            <div className="mb-4">
              <label htmlFor="loginPassword" className="form-label fw-semibold">
                Password *
              </label>
              <input
                type="password"
                className="form-control"
                id="loginPassword"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 py-2 fw-bold"
              disabled={submitting}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <hr className="my-4" />

          <div className="text-center">
            <p className="mb-1 text-muted">New student at CBIT?</p>
            <Link to="/register" className="btn btn-outline-secondary btn-sm">
              Register Student Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
