const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:7071/api';
export function setToken(t){ localStorage.setItem('token', t); }
export function getToken(){ return localStorage.getItem('token'); }

export async function apiGet(path, auth=true){
  const h = auth ? { Authorization: `Bearer ${getToken()}` } : {};
  const r = await fetch(`${API_BASE}${path}`, { headers: h });
  if(!r.ok) throw new Error(await r.text()); return r.json();
}
export async function apiPost(path, body, auth=true){
  const h = { 'Content-Type':'application/json' };
  if(auth) h.Authorization = `Bearer ${getToken()}`;
  const r = await fetch(`${API_BASE}${path}`, { method:'POST', headers:h, body: JSON.stringify(body) });
  if(!r.ok) throw new Error(await r.text()); return r.json();
}
