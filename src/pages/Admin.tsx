import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import {
  adminLogin, adminLogout, isLoggedIn,
  fetchNews, createNews, deleteNews, updateNews,
  fetchServers, createServer, deleteServer, updateServer,
  fetchUpdates, createUpdate, deleteUpdate,
} from "@/lib/api";

interface NewsItem {
  id: number; game: string; title: string; text: string;
  category: string; is_hot: boolean; date: string;
}

interface ServerItem {
  id: number; game: string; name: string; map: string;
  ip: string; max_players: number; is_active: boolean;
  battlemetrics_id?: string;
}

interface UpdateItem {
  id: number; game: string; version: string; items: string[]; date: string;
}

const GAMES = [
  { id: "dayz", label: "DayZ", color: "#00ff41" },
  { id: "arma", label: "Arma Reforger", color: "#00bfff" },
  { id: "conan", label: "Conan Exiles", color: "#ff6600" },
];

const CATEGORIES = ["НОВОСТЬ", "ОБНОВЛЕНИЕ", "АНОНС", "ИВЕНТ", "ПАТЧ", "СООБЩЕСТВО"];

function Toast({ msg, type, onClose }: { msg: string; type: "ok" | "err"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded text-sm font-semibold flex items-center gap-2"
      style={{ background: type === "ok" ? "#00ff4122" : "#ff303022", border: `1px solid ${type === "ok" ? "#00ff41" : "#ff3030"}`, color: type === "ok" ? "#00ff41" : "#ff3030", backdropFilter: "blur(10px)" }}>
      <Icon name={type === "ok" ? "CheckCircle" : "AlertCircle"} size={16} />
      {msg}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-white/40 font-mono-tech tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-sm text-sm text-white placeholder-white/20 outline-none transition-colors";
const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" };

function GameSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={inputCls} style={{ ...inputStyle, background: "#0e0e0e" }}>
      <option value="">— Выберите игру —</option>
      {GAMES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
    </select>
  );
}

// ──────── Логин ────────
function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      await adminLogin(u, p);
      onLogin();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
      <div className="w-full max-w-sm p-8 rounded" style={{ background: "#111", border: "1px solid #00ff4133" }}>
        <div className="flex items-center gap-2 mb-8">
          <div className="w-4 h-4 rounded-sm" style={{ background: "#00ff41", boxShadow: "0 0 8px #00ff41" }} />
          <span className="text-lg font-black tracking-widest" style={{ fontFamily: "Oswald", color: "#00ff41" }}>DivanMonitoring ADMIN</span>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="ЛОГИН">
            <input value={u} onChange={e => setU(e.target.value)} className={inputCls} style={inputStyle}
              placeholder="admin" autoComplete="username" />
          </Field>
          <Field label="ПАРОЛЬ">
            <input type="password" value={p} onChange={e => setP(e.target.value)} className={inputCls} style={inputStyle}
              placeholder="••••••••" autoComplete="current-password" />
          </Field>
          {err && <p className="text-xs" style={{ color: "#ff3030" }}>{err}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 font-bold tracking-widest text-black rounded-sm transition-all hover:opacity-90 disabled:opacity-50 mt-2"
            style={{ fontFamily: "Oswald", background: "#00ff41", boxShadow: "0 0 16px rgba(0,255,65,0.25)" }}>
            {loading ? "ВХОД..." : "ВОЙТИ"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ──────── Секция новостей ────────
function NewsSection({ toast }: { toast: (m: string, t: "ok" | "err") => void }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ game: "", title: "", text: "", category: "НОВОСТЬ", is_hot: false });
  const [editItem, setEditItem] = useState<NewsItem | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await fetchNews());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.game || !form.title || !form.text) { toast("Заполните все поля", "err"); return; }
    setSaving(true);
    try {
      if (editItem) {
        await updateNews({ ...form, id: editItem.id });
        toast("Новость обновлена", "ok");
      } else {
        await createNews(form);
        toast("Новость добавлена", "ok");
      }
      setForm({ game: "", title: "", text: "", category: "НОВОСТЬ", is_hot: false });
      setEditItem(null);
      await load();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    } finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!confirm("Удалить новость?")) return;
    await deleteNews(id);
    toast("Новость удалена", "ok");
    await load();
  }

  function startEdit(item: NewsItem) {
    setEditItem(item);
    setForm({ game: item.game, title: item.title, text: item.text, category: item.category, is_hot: item.is_hot });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const gameColor = (g: string) => GAMES.find(x => x.id === g)?.color || "#fff";

  return (
    <div className="space-y-6">
      {/* Форма */}
      <div className="rounded p-5" style={{ background: "#111", border: editItem ? "1px solid #00bfff44" : "1px solid #1e1e1e" }}>
        <h3 className="text-base font-bold mb-4 tracking-wider" style={{ fontFamily: "Oswald" }}>
          {editItem ? "✏️ РЕДАКТИРОВАТЬ НОВОСТЬ" : "ДОБАВИТЬ НОВОСТЬ"}
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="ИГРА"><GameSelect value={form.game} onChange={v => setForm(f => ({ ...f, game: v }))} /></Field>
          <Field label="КАТЕГОРИЯ">
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className={inputCls} style={{ ...inputStyle, background: "#0e0e0e" }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="ЗАГОЛОВОК">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className={inputCls} style={inputStyle} placeholder="Название новости" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="ТЕКСТ">
              <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                className={inputCls} style={inputStyle} placeholder="Текст новости..." rows={3} />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-white/60">
              <div
                className="w-5 h-5 rounded-sm flex items-center justify-center transition-all cursor-pointer"
                style={{ background: form.is_hot ? "#ff3030" : "transparent", border: `1px solid ${form.is_hot ? "#ff3030" : "#444"}` }}
                onClick={() => setForm(f => ({ ...f, is_hot: !f.is_hot }))}>
                {form.is_hot && <Icon name="Check" size={12} style={{ color: "white" }} />}
              </div>
              Отметить как HOT
            </label>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={saving}
            className="px-6 py-2 font-bold tracking-widest text-black rounded-sm text-sm disabled:opacity-50 transition-all hover:opacity-90"
            style={{ fontFamily: "Oswald", background: "#00ff41" }}>
            {saving ? "СОХРАНЕНИЕ..." : editItem ? "СОХРАНИТЬ" : "ДОБАВИТЬ"}
          </button>
          {editItem && (
            <button onClick={() => { setEditItem(null); setForm({ game: "", title: "", text: "", category: "НОВОСТЬ", is_hot: false }); }}
              className="px-6 py-2 font-bold tracking-widest rounded-sm text-sm transition-all hover:bg-white/10"
              style={{ fontFamily: "Oswald", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.15)" }}>
              ОТМЕНА
            </button>
          )}
        </div>
      </div>

      {/* Список */}
      <div className="rounded" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
          <span className="text-sm font-bold tracking-wider text-white/50" style={{ fontFamily: "Oswald" }}>
            НОВОСТИ ({items.length})
          </span>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-white/30 font-mono-tech text-sm">Загрузка...</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center text-white/30 font-mono-tech text-sm">Нет новостей</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#1e1e1e" }}>
            {items.map(n => (
              <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition-all">
                <span className="font-mono-tech text-xs px-1.5 py-0.5 rounded-sm shrink-0 mt-0.5"
                  style={{ color: gameColor(n.game), border: `1px solid ${gameColor(n.game)}44`, background: `${gameColor(n.game)}11` }}>
                  {n.game.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">{n.title}</span>
                    {n.is_hot && <span className="font-mono-tech text-xs px-1 py-0.5 rounded-sm shrink-0" style={{ color: "#ff3030", background: "rgba(255,48,48,0.1)", border: "1px solid rgba(255,48,48,0.3)" }}>HOT</span>}
                  </div>
                  <p className="text-xs text-white/35 mt-0.5 line-clamp-1">{n.text}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => startEdit(n)}
                    className="p-1.5 rounded hover:bg-white/10 transition-all" style={{ color: "#00bfff" }}>
                    <Icon name="Pencil" size={14} />
                  </button>
                  <button onClick={() => remove(n.id)}
                    className="p-1.5 rounded hover:bg-white/10 transition-all" style={{ color: "#ff3030" }}>
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────── Секция серверов ────────
function ServersSection({ toast }: { toast: (m: string, t: "ok" | "err") => void }) {
  const [items, setItems] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ game: "", name: "", map: "", ip: "", max_players: "60", battlemetrics_id: "" });
  const [editItem, setEditItem] = useState<ServerItem | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await fetchServers());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.game || !form.name || !form.map) { toast("Игра, название и карта обязательны", "err"); return; }
    setSaving(true);
    try {
      if (editItem) {
        await updateServer({ ...form, max_players: Number(form.max_players), id: editItem.id, is_active: true });
        toast("Сервер обновлён", "ok");
      } else {
        await createServer({ ...form, max_players: Number(form.max_players) });
        toast("Сервер добавлен", "ok");
      }
      setForm({ game: "", name: "", map: "", ip: "", max_players: "60", battlemetrics_id: "" });
      setEditItem(null);
      await load();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    } finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!confirm("Удалить сервер?")) return;
    await deleteServer(id);
    toast("Сервер удалён", "ok");
    await load();
  }

  function startEdit(item: ServerItem) {
    setEditItem(item);
    setForm({ game: item.game, name: item.name, map: item.map, ip: item.ip || "", max_players: String(item.max_players), battlemetrics_id: item.battlemetrics_id || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const gameColor = (g: string) => GAMES.find(x => x.id === g)?.color || "#fff";

  return (
    <div className="space-y-6">
      <div className="rounded p-5" style={{ background: "#111", border: editItem ? "1px solid #00bfff44" : "1px solid #1e1e1e" }}>
        <h3 className="text-base font-bold mb-4 tracking-wider" style={{ fontFamily: "Oswald" }}>
          {editItem ? "✏️ РЕДАКТИРОВАТЬ СЕРВЕР" : "ДОБАВИТЬ СЕРВЕР"}
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="ИГРА"><GameSelect value={form.game} onChange={v => setForm(f => ({ ...f, game: v }))} /></Field>
          <Field label="МАКСИМУМ ИГРОКОВ">
            <input type="number" value={form.max_players} onChange={e => setForm(f => ({ ...f, max_players: e.target.value }))}
              className={inputCls} style={inputStyle} min={1} max={256} />
          </Field>
          <div className="md:col-span-2">
            <Field label="НАЗВАНИЕ СЕРВЕРА">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={inputCls} style={inputStyle} placeholder="RU | SERVER | PVP" />
            </Field>
          </div>
          <Field label="КАРТА">
            <input value={form.map} onChange={e => setForm(f => ({ ...f, map: e.target.value }))}
              className={inputCls} style={inputStyle} placeholder="Chernarus" />
          </Field>
          <Field label="IP:ПОРТ (необязательно)">
            <input value={form.ip} onChange={e => setForm(f => ({ ...f, ip: e.target.value }))}
              className={inputCls} style={inputStyle} placeholder="1.2.3.4:2302" />
          </Field>
          <div className="md:col-span-2">
            <Field label="BATTLEMETRICS ID (для live-мониторинга)">
              <div className="flex gap-2 items-start">
                <input value={form.battlemetrics_id} onChange={e => setForm(f => ({ ...f, battlemetrics_id: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="например: 12345678" />
                <a href="https://www.battlemetrics.com/servers/dayz" target="_blank" rel="noreferrer"
                  className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-sm text-xs font-bold transition-all hover:opacity-80"
                  style={{ fontFamily: "Oswald", color: "#00bfff", border: "1px solid #00bfff44", background: "#00bfff11", whiteSpace: "nowrap" }}>
                  Найти ID →
                </a>
              </div>
              <p className="text-xs text-white/25 mt-1">Откройте страницу сервера на battlemetrics.com — ID в URL: /servers/dayz/<b style={{color:"#00bfff"}}>12345678</b></p>
            </Field>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={saving}
            className="px-6 py-2 font-bold tracking-widest text-black rounded-sm text-sm disabled:opacity-50 transition-all hover:opacity-90"
            style={{ fontFamily: "Oswald", background: "#00ff41" }}>
            {saving ? "СОХРАНЕНИЕ..." : editItem ? "СОХРАНИТЬ" : "ДОБАВИТЬ"}
          </button>
          {editItem && (
            <button onClick={() => { setEditItem(null); setForm({ game: "", name: "", map: "", ip: "", max_players: "60", battlemetrics_id: "" }); }}
              className="px-6 py-2 font-bold tracking-widest rounded-sm text-sm transition-all hover:bg-white/10"
              style={{ fontFamily: "Oswald", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.15)" }}>
              ОТМЕНА
            </button>
          )}
        </div>
      </div>

      <div className="rounded" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
          <span className="text-sm font-bold tracking-wider text-white/50" style={{ fontFamily: "Oswald" }}>СЕРВЕРЫ ({items.length})</span>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-white/30 font-mono-tech text-sm">Загрузка...</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center text-white/30 font-mono-tech text-sm">Нет серверов</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#1e1e1e" }}>
            {items.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-all">
                <span className="font-mono-tech text-xs px-1.5 py-0.5 rounded-sm shrink-0"
                  style={{ color: gameColor(s.game), border: `1px solid ${gameColor(s.game)}44`, background: `${gameColor(s.game)}11` }}>
                  {s.game.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{s.name}</span>
                    {s.battlemetrics_id ? (
                      <span className="font-mono-tech text-xs px-1.5 py-0.5 rounded-sm"
                        style={{ color: "#00ff41", background: "rgba(0,255,65,0.08)", border: "1px solid rgba(0,255,65,0.25)" }}>
                        LIVE
                      </span>
                    ) : (
                      <span className="font-mono-tech text-xs text-white/20">NO LIVE</span>
                    )}
                  </div>
                  <div className="text-xs text-white/35 font-mono-tech">
                    {s.map} · {s.ip || "—"} · max {s.max_players}
                    {s.battlemetrics_id && <span style={{ color: "#00bfff" }}> · BM:{s.battlemetrics_id}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => startEdit(s)} className="p-1.5 rounded hover:bg-white/10 transition-all" style={{ color: "#00bfff" }}>
                    <Icon name="Pencil" size={14} />
                  </button>
                  <button onClick={() => remove(s.id)} className="p-1.5 rounded hover:bg-white/10 transition-all" style={{ color: "#ff3030" }}>
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────── Секция обновлений ────────
function UpdatesSection({ toast }: { toast: (m: string, t: "ok" | "err") => void }) {
  const [items, setItems] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ game: "", version: "", items_text: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await fetchUpdates());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.game || !form.version || !form.items_text.trim()) { toast("Заполните все поля", "err"); return; }
    setSaving(true);
    try {
      await createUpdate({ game: form.game, version: form.version, items: form.items_text });
      toast("Обновление добавлено", "ok");
      setForm({ game: "", version: "", items_text: "" });
      await load();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    } finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!confirm("Удалить запись об обновлении?")) return;
    await deleteUpdate(id);
    toast("Удалено", "ok");
    await load();
  }

  const gameColor = (g: string) => GAMES.find(x => x.id === g)?.color || "#fff";

  return (
    <div className="space-y-6">
      <div className="rounded p-5" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
        <h3 className="text-base font-bold mb-4 tracking-wider" style={{ fontFamily: "Oswald" }}>ДОБАВИТЬ ОБНОВЛЕНИЕ</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="ИГРА"><GameSelect value={form.game} onChange={v => setForm(f => ({ ...f, game: v }))} /></Field>
          <Field label="ВЕРСИЯ">
            <input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
              className={inputCls} style={inputStyle} placeholder="1.25.0" />
          </Field>
          <div className="md:col-span-2">
            <Field label="СПИСОК ИЗМЕНЕНИЙ (каждое с новой строки)">
              <textarea value={form.items_text} onChange={e => setForm(f => ({ ...f, items_text: e.target.value }))}
                className={inputCls} style={inputStyle} rows={5}
                placeholder={"Новая карта Sakhal\nПереработка системы погоды\nНовое оружие"} />
            </Field>
          </div>
        </div>
        <button onClick={save} disabled={saving}
          className="px-6 py-2 mt-4 font-bold tracking-widest text-black rounded-sm text-sm disabled:opacity-50 transition-all hover:opacity-90"
          style={{ fontFamily: "Oswald", background: "#00ff41" }}>
          {saving ? "СОХРАНЕНИЕ..." : "ДОБАВИТЬ"}
        </button>
      </div>

      <div className="rounded" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
          <span className="text-sm font-bold tracking-wider text-white/50" style={{ fontFamily: "Oswald" }}>ОБНОВЛЕНИЯ ({items.length})</span>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-white/30 font-mono-tech text-sm">Загрузка...</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center text-white/30 font-mono-tech text-sm">Нет данных</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#1e1e1e" }}>
            {items.map(u => (
              <div key={u.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition-all">
                <span className="font-mono-tech text-xs px-1.5 py-0.5 rounded-sm shrink-0 mt-0.5"
                  style={{ color: gameColor(u.game), border: `1px solid ${gameColor(u.game)}44`, background: `${gameColor(u.game)}11` }}>
                  {u.game.toUpperCase()}
                </span>
                <div className="flex-1">
                  <span className="font-mono-tech text-sm font-bold" style={{ color: gameColor(u.game) }}>v{u.version}</span>
                  <span className="text-xs text-white/30 ml-2">{u.date}</span>
                  <ul className="mt-1 space-y-0.5">
                    {u.items.slice(0, 3).map((item: string, i: number) => (
                      <li key={i} className="text-xs text-white/50">• {item}</li>
                    ))}
                    {u.items.length > 3 && <li className="text-xs text-white/30">...и ещё {u.items.length - 3}</li>}
                  </ul>
                </div>
                <button onClick={() => remove(u.id)} className="p-1.5 rounded hover:bg-white/10 transition-all shrink-0" style={{ color: "#ff3030" }}>
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────── Главный компонент ────────
export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [tab, setTab] = useState<"news" | "servers" | "updates">("news");
  const [toastMsg, setToastMsg] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = useCallback((msg: string, type: "ok" | "err") => setToastMsg({ msg, type }), []);

  if (!loggedIn) return <LoginForm onLogin={() => setLoggedIn(true)} />;

  const adminUser = localStorage.getItem("gw_admin_user") || "admin";

  const TABS = [
    { id: "news", label: "НОВОСТИ", icon: "Newspaper" },
    { id: "servers", label: "СЕРВЕРЫ", icon: "Server" },
    { id: "updates", label: "ОБНОВЛЕНИЯ", icon: "RefreshCw" },
  ] as const;

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a", fontFamily: "Rajdhani, sans-serif" }}>
      {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}

      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: "rgba(8,8,8,0.97)", borderBottom: "1px solid #1a1a1a", backdropFilter: "blur(10px)" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm" style={{ background: "#00ff41", boxShadow: "0 0 8px #00ff41" }} />
            <span className="font-black tracking-widest" style={{ fontFamily: "Oswald", color: "#00ff41", fontSize: "1.1rem" }}>
              DivanMonitoring
            </span>
            <span className="font-mono-tech text-xs px-2 py-0.5 rounded-sm" style={{ color: "#ff6600", border: "1px solid #ff660044", background: "#ff660011" }}>
              ADMIN
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30 font-mono-tech hidden md:block">{adminUser}</span>
            <a href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1 font-mono-tech">
              <Icon name="ExternalLink" size={12} /> Сайт
            </a>
            <button onClick={() => { adminLogout(); setLoggedIn(false); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm transition-all hover:bg-white/10"
              style={{ color: "#ff3030", border: "1px solid rgba(255,48,48,0.3)" }}>
              <Icon name="LogOut" size={12} /> Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded" style={{ background: "#111", border: "1px solid #1e1e1e", width: "fit-content" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold tracking-wider rounded-sm transition-all"
              style={{
                fontFamily: "Oswald",
                background: tab === t.id ? "rgba(0,255,65,0.12)" : "transparent",
                color: tab === t.id ? "#00ff41" : "rgba(255,255,255,0.4)",
                border: tab === t.id ? "1px solid rgba(0,255,65,0.3)" : "1px solid transparent",
              }}>
              <Icon name={t.icon} size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "news" && <NewsSection toast={showToast} />}
        {tab === "servers" && <ServersSection toast={showToast} />}
        {tab === "updates" && <UpdatesSection toast={showToast} />}
      </div>
    </div>
  );
}