import axios from 'axios';

const PRODUCTION_API_URL = 'https://ai-public-grievance-analyzer.onrender.com/api';

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    let raw = envUrl.trim().replace(/\/+$/, '');
    if (!raw.endsWith('/api')) {
      raw = `${raw}/api`;
    }
    return raw;
  }

  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return 'http://localhost:3001/api';
  }

  return PRODUCTION_API_URL;
};

const api = axios.create({
  baseURL: getBaseURL()
});

// Request interceptor to attach JWT token and avoid duplicated /api prefixes
api.interceptors.request.use(
  (config) => {
    // Avoid double /api prefix if client code passed /api/...
    if (config.url && config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api/, '');
    }

    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthorized access safely
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = localStorage.getItem('token');
    const isAuthPage =
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/login') ||
        window.location.pathname.startsWith('/register') ||
        window.location.pathname === '/');

    const isMeRequest = error.config?.url?.includes('/auth/me');

    // Never trigger full window redirect loop from auth pages or background /auth/me checks
    if (error.response?.status === 401 && !isAuthPage && !isMeRequest && token) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

/**
 * Resolves static media / uploaded assets to backend origin
 */
export const getAssetUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const backendOrigin = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
    : typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? ''
    : 'https://ai-public-grievance-analyzer.onrender.com';
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${backendOrigin}${cleanPath}`;
};

export default api;