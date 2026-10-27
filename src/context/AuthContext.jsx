import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (token && token !== 'undefined' && token !== 'null' && storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.role) return parsed;
      }
    } catch (e) {
      // Ignore parse failure
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token && token !== 'undefined' && token !== 'null') {
        try {
          const res = await api.get('/auth/me');
          if (res.data && res.data._id) {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          }
        } catch (err) {
          // Only clear session if token was rejected as unauthorized (401)
          if (err.response?.status === 401) {
            console.warn('Session expired or token invalid:', err.message);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          } else {
            console.warn('Network issue during session validation; keeping existing cached session:', err.message);
          }
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', {
      email: email ? email.trim() : '',
      password
    });

    if (!res.data || !res.data.token || typeof res.data.token !== 'string' || res.data.token === 'undefined') {
      throw new Error('Authentication failed: Missing or invalid security token.');
    }

    const { token, user: userData } = res.data;
    if (!userData || !userData.role) {
      throw new Error('Authentication failed: Incomplete user profile received.');
    }

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (name, email, password, phone) => {
    const payload = {
      name: name ? name.trim() : '',
      email: email ? email.trim() : '',
      password,
      ...(phone ? { phone: phone.trim() } : {})
    };
    const res = await api.post('/auth/register', payload);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUserRoleDept = (updatedUser) => {
    // When admin updates user roles, if the logged-in user is updated, sync state
    const currentLocalUser = JSON.parse(localStorage.getItem('user'));
    if (currentLocalUser && currentLocalUser._id === updatedUser._id) {
      const mergedUser = { ...currentLocalUser, role: updatedUser.role, department: updatedUser.department };
      localStorage.setItem('user', JSON.stringify(mergedUser));
      setUser(mergedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUserRoleDept }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
