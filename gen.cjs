const fs = require('fs');
const w = (p,c) => fs.writeFileSync(p,c,'utf8');

// ── api.js ──────────────────────────────────────────────────
const api = [
  'import axios from ' + JSON.stringify('axios') + ';',
  'const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || ' + JSON.stringify('https://sms-backend-r0tn.onrender.com') + ', timeout: 60000 });',
  'api.interceptors.request.use(config => {',
  '  const token = sessionStorage.getItem(' + JSON.stringify('rep_token') + ');',
  '  if (token) config.headers.Authorization = ' + JSON.stringify('Bearer ') + ' + token;',
  '  return config;',
  '});',
  'export async function requestOtp(phone, email) {',
  '  const { data } = await api.post(' + JSON.stringify('/api/sales-rep/request-otp') + ', { phone, email });',
  '  return data;',
  '}',
  'export async function verifyOtp(session_id, code) {',
  '  const { data } = await api.post(' + JSON.stringify('/api/sales-rep/verify-otp') + ', { session_id, code });',
  '  return data;',
  '}',
  'export async function getProfile() {',
  '  const { data } = await api.get(' + JSON.stringify('/api/sales-rep/profile') + ');',
  '  return data;',
  '}',
  'export async function getCommissionSummary(term, year) {',
  '  const { data } = await api.get(' + JSON.stringify('/api/sales-rep/commission') + ', { params: { term, year } });',
  '  return data;',
  '}',
  'export async function getMyPayments() {',
  '  const { data } = await api.get(' + JSON.stringify('/api/sales-rep/payments') + ');',
  '  return data;',
  '}',
  'export async function requestPayment(body) {',
  '  const { data } = await api.post(' + JSON.stringify('/api/sales-rep/payments') + ', body, { timeout: 30000 });',
  '  return data;',
  '}',
  'export default api;'
].join('\n');
w('e:/FreeSchool/salesrep-frontend/src/utils/api.js', api);
