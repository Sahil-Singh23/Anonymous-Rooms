import axios from 'axios';

const fallBackUrl = 'http://localhost:8080';
const API_URL = import.meta.env.VITE_API_URL || fallBackUrl;

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Automatically sends/receives cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
