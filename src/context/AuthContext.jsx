import { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on application mount
  const checkAuth = async () => {
    try {
      const res = await apiRequest('/auth/me');
      if (res && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch (err) {
      // Unauthenticated or expired session
      setUser(null);
      localStorage.removeItem('cbit_auth_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (res.data?.token) {
      localStorage.setItem('cbit_auth_token', res.data.token);
    }
    setUser(res.data.student);
    return res.data.student;
  };

  const register = async ({ name, email, rollNo, password }) => {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, rollNo, password })
    });

    if (res.data?.token) {
      localStorage.setItem('cbit_auth_token', res.data.token);
    }
    setUser(res.data.student);
    return res.data.student;
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (err) {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('cbit_auth_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
