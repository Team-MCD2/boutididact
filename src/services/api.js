import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const client = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

export const getHealth = async () => {
  const { data } = await client.get('/api/health');
  return data;
};

export const getHiboutikProducts = async () => {
  const { data } = await client.get('/api/hiboutik/products');
  return data;
};

export const getHiboutikCategories = async () => {
  const { data } = await client.get('/api/hiboutik/categories');
  return data;
};

export const checkout = async (payload) => {
  const { data, status } = await client.post('/api/checkout', payload, {
    validateStatus: (s) => s >= 200 && s < 300 || s === 207,
  });
  return { ...data, _status: status };
};

export default client;
