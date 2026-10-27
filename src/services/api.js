export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'http://localhost:5000/api';

export const BACKEND_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
  'http://localhost:5000';

/**
 * Normalizes item image paths to support:
 * - Uploaded media served by backend: /uploads/...
 * - Static public campus assets: /images/...
 * - Base64 data URLs: data:image/...
 * - Remote HTTP/HTTPS URLs
 */
export function getImageUrl(imagePath) {
  if (!imagePath) return '/images/placeholder.svg';
  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('data:')
  ) {
    return imagePath;
  }
  if (imagePath.startsWith('/uploads')) {
    return `${BACKEND_URL}${imagePath}`;
  }
  return imagePath;
}

/**
 * Perform an authenticated HTTP fetch request supporting both
 * HttpOnly session cookies and Bearer tokens stored in localStorage.
 */
export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('cbit_auth_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // If body is FormData (e.g. file upload), remove Content-Type so browser sets boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const errorMsg =
      data?.error?.message ||
      (Array.isArray(data?.error?.details)
        ? data.error.details.map((d) => d.message).join(' ')
        : null) ||
      `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.details = data?.error?.details;
    throw err;
  }

  return data;
}
