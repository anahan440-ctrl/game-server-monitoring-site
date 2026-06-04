const URLS = {
  auth: "https://functions.poehali.dev/da8f11cc-7cbd-4334-bcf4-0c01df96cd75",
  news: "https://functions.poehali.dev/e38dc555-2544-4e76-a035-3c9e906ac0fb",
  data: "https://functions.poehali.dev/3a5cbb70-45ab-43c2-b300-634b51d7dedb",
  monitor: "https://functions.poehali.dev/62f422ed-1c81-442d-8c09-f6e6e0a9816d",
  requests: "https://functions.poehali.dev/f1de4e51-9596-4ad2-bb49-c42040e9439a",
};

function getToken() {
  return localStorage.getItem("gw_admin_token") || "";
}

function authHeaders() {
  return { "Content-Type": "application/json", "X-Admin-Token": getToken() };
}

// AUTH
export async function adminLogin(username: string, password: string) {
  const r = await fetch(URLS.auth, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Ошибка входа");
  localStorage.setItem("gw_admin_token", data.token);
  localStorage.setItem("gw_admin_user", data.username);
  return data;
}

export function adminLogout() {
  localStorage.removeItem("gw_admin_token");
  localStorage.removeItem("gw_admin_user");
}

export function isLoggedIn() {
  return !!localStorage.getItem("gw_admin_token");
}

// NEWS
export async function fetchNews(game?: string) {
  const url = game ? `${URLS.news}?game=${game}` : URLS.news;
  const r = await fetch(url);
  const data = await r.json();
  return data.news || [];
}

export async function createNews(payload: object) {
  const r = await fetch(URLS.news, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
  if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Ошибка"); }
  return r.json();
}

export async function deleteNews(id: number) {
  const r = await fetch(URLS.news, { method: "DELETE", headers: authHeaders(), body: JSON.stringify({ id }) });
  if (!r.ok) throw new Error("Ошибка удаления");
  return r.json();
}

export async function updateNews(payload: object) {
  const r = await fetch(URLS.news, { method: "PUT", headers: authHeaders(), body: JSON.stringify(payload) });
  if (!r.ok) throw new Error("Ошибка обновления");
  return r.json();
}

// SERVERS
export async function fetchServers(game?: string) {
  const url = game ? `${URLS.data}?resource=servers&game=${game}` : `${URLS.data}?resource=servers`;
  const r = await fetch(url);
  const data = await r.json();
  return data.servers || [];
}

export async function createServer(payload: object) {
  const r = await fetch(URLS.data, { method: "POST", headers: authHeaders(), body: JSON.stringify({ resource: "servers", ...payload }) });
  if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Ошибка"); }
  return r.json();
}

export async function updateServer(payload: object) {
  const r = await fetch(URLS.data, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ resource: "servers", ...payload }) });
  if (!r.ok) throw new Error("Ошибка обновления");
  return r.json();
}

export async function deleteServer(id: number) {
  const r = await fetch(URLS.data, { method: "DELETE", headers: authHeaders(), body: JSON.stringify({ resource: "servers", id }) });
  if (!r.ok) throw new Error("Ошибка удаления");
  return r.json();
}

// MONITOR — live server stats
export async function fetchLiveServers(game?: string) {
  const url = game ? `${URLS.monitor}?game=${game}` : URLS.monitor;
  const r = await fetch(url);
  const data = await r.json();
  return data.servers || [];
}

// UPDATES
export async function fetchUpdates() {
  const r = await fetch(`${URLS.data}?resource=updates`);
  const data = await r.json();
  return data.updates || [];
}

export async function createUpdate(payload: object) {
  const r = await fetch(URLS.data, { method: "POST", headers: authHeaders(), body: JSON.stringify({ resource: "updates", ...payload }) });
  if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Ошибка"); }
  return r.json();
}

export async function deleteUpdate(id: number) {
  const r = await fetch(URLS.data, { method: "DELETE", headers: authHeaders(), body: JSON.stringify({ resource: "updates", id }) });
  if (!r.ok) throw new Error("Ошибка удаления");
  return r.json();
}

// SERVER REQUESTS
export async function submitServerRequest(payload: { server_name: string; ip: string; contact: string; game: string }) {
  const r = await fetch(URLS.requests, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Ошибка отправки");
  return d;
}

export async function fetchServerRequests() {
  const r = await fetch(URLS.requests, { headers: authHeaders() });
  const d = await r.json();
  return d.requests || [];
}

export async function deleteServerRequest(id: number) {
  const r = await fetch(URLS.requests, { method: "DELETE", headers: authHeaders(), body: JSON.stringify({ id }) });
  if (!r.ok) throw new Error("Ошибка удаления");
  return r.json();
}