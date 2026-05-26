/**
 * Merkezi API istemcisi. JWT (localStorage token veya user.token) otomatik eklenir.
 */

import { API_URL } from '../config/api.js';

const API_BASE = API_URL;

const getAuthHeaders = () => {
  let token = localStorage.getItem('token');
  if (!token) {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        token = userData.token;
      } catch {
        /* ignore */
      }
    }
  }
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...getAuthHeaders(),
});

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `HTTP Hatası: ${response.status}`);
  }
  return data;
};

export const apiGet = async (endpoint) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const apiDownloadBlob = async (endpoint) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const text = await response.text();
    let msg = `HTTP Hatası: ${response.status}`;
    try {
      const data = JSON.parse(text);
      if (data.message) msg = data.message;
    } catch {
      /* gövde JSON değil */
    }
    throw new Error(msg);
  }
  return response.blob();
};

export const apiPost = async (endpoint, body) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
};

export const apiPatch = async (endpoint, body) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
};

export const apiPut = async (endpoint, body) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
};

export const apiDelete = async (endpoint) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const apiUpload = async (endpoint, formData, method = 'POST') => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });
  return handleResponse(response);
};
