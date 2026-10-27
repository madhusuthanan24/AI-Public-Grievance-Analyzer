import axios from 'axios';

const PRODUCTION_API_URL = 'https://ai-public-grievance-analyzer.onrender.com/api';

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
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
 * Fetches an evidence file as a Blob using the authenticated Axios client.
 * Returns an object URL and a revoke function.
 * @param {string} complaintId - MongoDB _id or human grievanceId (e.g. GRV-2026-123456)
 * @param {string} fileIdOrUrl - filename, attachment ID, or URL
 */
export const fetchEvidenceBlob = async (complaintId, fileIdOrUrl) => {
  if (!complaintId) {
    throw new Error('Complaint ID is required to fetch evidence');
  }

  // Extract clean filename or ID from fileIdOrUrl
  let fileId = fileIdOrUrl || 'primary';
  if (typeof fileId === 'string') {
    fileId = fileId.split('/').pop().split('?')[0];
  }

  try {
    const response = await api.get(`/complaints/${complaintId}/evidence/${fileId}`, {
      responseType: 'blob'
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    const blob = new Blob([response.data], { type: contentType });
    const blobUrl = URL.createObjectURL(blob);

    return {
      blobUrl,
      contentType,
      revoke: () => {
        URL.revokeObjectURL(blobUrl);
      }
    };
  } catch (error) {
    if (error.response?.data && typeof error.response.data.text === 'function') {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        error.response.data = json;
      } catch (_) {
        // Response was not JSON, keep original blob
      }
    }
    throw error;
  }
};

/**
 * Resolves static media / uploaded assets to backend origin
 */
export const getAssetUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  const backendOrigin = envUrl
    ? envUrl.replace(/\/api\/?$/, '')
    : typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? ''
    : 'https://ai-public-grievance-analyzer.onrender.com';
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${backendOrigin}${cleanPath}`;
};

export default api;