import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { fetchNews, fetchUpdates, fetchLiveServers } from "@/lib/api";

const DAYZ_IMG = "https://cdn.poehali.dev/projects/29041751-f323-4156-8c8d-555d4548c36a/files/a3857765-9781-4571-9024-bfa435c33d79.jpg";
const ARMA_IMG = "https://cdn.poehali.dev/projects/29041751-f323-4156-8c8d-555d4548c36a/files/6a0e6152-b147-41b7-aeb8-ea0e94ab1acf.jpg";
const CONAN_IMG = "https://cdn.poehali.dev/projects/29041751-f323-4156-8c8d-555d4548c36a/files/832efcfc-44ad-40c7-8177-e369446c3ab7.jpg";

const GAMES = [
  { id: "dayz", name: "DayZ", color: "#00ff41", img: DAYZ_IMG, tag: "SURVIVAL" },
  { id: "arma", name: "Arma Reforger", color: "#00bfff", img: ARMA_IMG, tag: "MILITARY" },
  { id: "conan", name: "Conan Exiles", color: "#ff6600", img: CONAN_IMG, tag: "FANTASY" },
];

// Типы данных
interface LiveServer {
  id: number; game: string; name: string; map: string; ip: string;
  max_players: number; online: number; status: string; activity: number;
  has_live: boolean; source: string;
}
interface DbNews { id: number; game: string; title: string; text: string; category: string; is_hot: boolean; date: string; }
interface DbUpdate { id: number; game: string; version: string; items: string[]; date: string; }


const NAV_ITEMS = [
  { id: "home", label: "ГЛАВНАЯ" },
  { id: "servers", label: "СЕРВЕРЫ" },
  { id: "news", label: "НОВОСТИ" },
  { id: "updates", label: "ОБНОВЛЕНИЯ" },
  { id: "stats", label: "СТАТИСТИКА" },
  { id: "contacts", label: "КОНТАКТЫ" },
];

function OnlineDot({ color = "#00ff41" }: { color?: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}`, animation: "pulse-green 2s infinite" }}
    />
  );
}

function gameColor(gameId: string) {
  const map: Record<string, string> = { dayz: "#00ff41", arma: "#00bfff", conan: "#ff6600" };
  return map[gameId] || "#fff";
}

function PlayerBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
      <span className="font-mono-tech text-xs text-white/50" style={{ minWidth: 44 }}>{value}/{max}</span>
    </div>
  );
}

function ServerRow({ s, color, rank }: { s: LiveServer; color: string; rank: number }) {
  const rankColors: Record<number, string> = { 1: "#ffd700", 2: "#c0c0c0", 3: "#cd7f32" };
  const isOffline = s.status === "offline" || s.status === "unknown";
  const dotColor = isOffline ? "#ff3030" : color;
  return (
    <div className="rounded px-4 py-3 transition-all hover:bg-white/5" style={{ background: "#111", border: `1px solid ${isOffline ? "#ff303022" : "#1e1e1e"}` }}>
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono-tech text-xs font-bold px-1.5 py-0.5 rounded"
          style={{ color: rankColors[rank] || "#555", border: `1px solid ${rankColors[rank] || "#333"}` }}>
          #{rank}
        </span>
        <OnlineDot color={dotColor} />
        <span className="font-semibold text-white text-sm flex-1 truncate">{s.name}</span>
        {s.has_live ? (
          <span className="font-mono-tech text-xs px-1.5 py-0.5 rounded-sm shrink-0"
            style={{ color: "#00ff41", background: "rgba(0,255,65,0.08)", border: "1px solid rgba(0,255,65,0.25)" }}>
            LIVE
          </span>
        ) : (
          <span className="font-mono-tech text-xs text-white/20 shrink-0">—</span>
        )}
        {isOffline
          ? <span className="font-mono-tech text-xs shrink-0" style={{ color: "#ff3030" }}>OFFLINE</span>
          : <span className="font-mono-tech text-xs shrink-0" style={{ color: "#00ff41" }}>{s.online > 0 ? "ONLINE" : "EMPTY"}</span>
        }
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-white/30 font-mono-tech w-24 shrink-0 truncate">{s.map}</span>
        <div className="flex-1">
          <PlayerBar value={s.online} max={s.max_players} color={isOffline ? "#ff3030" : color} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-white/25">Заполненность:</span>
        <div className="flex-1 h-0.5 bg-white/5 rounded overflow-hidden">
          <div className="h-full rounded transition-all duration-700"
            style={{ width: `${s.activity}%`, background: `linear-gradient(90deg, ${color}55, ${color})` }} />
        </div>
        <span className="font-mono-tech text-xs" style={{ color }}>{s.activity}%</span>
      </div>
    </div>
  );
}

export default function Index() {
  const [activeSection, setActiveSection] = useState("home");
  const [selectedGame, setSelectedGame] = useState<"dayz" | "arma" | "conan">("dayz");
  const [filterGame, setFilterGame] = useState<string>("all");
  const [time, setTime] = useState(new Date());
  const [mobileMenu, setMobileMenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Данные
  const [dbNews, setDbNews] = useState<DbNews[]>([]);
  const [liveServers, setLiveServers] = useState<LiveServer[]>([]);
  const [dbUpdates, setDbUpdates] = useState<DbUpdate[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadLive = () => {
    fetchLiveServers()
      .then(s => { setLiveServers(s); setLastUpdated(new Date()); setLiveLoading(false); })
      .catch(() => setLiveLoading(false));
  };

  useEffect(() => {
    setMounted(true);
    const clock = setInterval(() => setTime(new Date()), 1000);
    // Статичные данные — один раз
    fetchNews().then(setDbNews).catch(() => {});
    fetchUpdates().then(setDbUpdates).catch(() => {});
    // Live-данные — при загрузке и каждые 30 сек
    loadLive();
    const liveTimer = setInterval(loadLive, 30000);
    return () => { clearInterval(clock); clearInterval(liveTimer); };
  }, []);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    setMobileMenu(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Новости с цветом игры
  const newsWithColor = dbNews.map(n => ({ ...n, gameColor: gameColor(n.game), hot: n.is_hot }));
  const filteredNews = filterGame === "all" ? newsWithColor : newsWithColor.filter((n) => n.game === filterGame);

  // Live-серверы текущей игры (сортируем по онлайну — рейтинг по активности)
  const currentGame = GAMES.find((g) => g.id === selectedGame)!;
  const servers = liveServers
    .filter(s => s.game === selectedGame)
    .sort((a, b) => b.online - a.online);

  // Обновления — группируем по игре, берём последнее
  const updatesGrouped = GAMES.map(g => {
    const gUpdates = dbUpdates.filter(u => u.game === g.id);
    if (!gUpdates.length) return null;
    const latest = gUpdates[0];
    return { game: g.name, version: latest.version, date: latest.date, color: g.color, items: latest.items };
  }).filter(Boolean) as { game: string; version: string; date: string; color: string; items: string[] }[];

  // Статистика
  const onlineServers = liveServers.filter(s => s.status !== "offline").length;
  const totalPlayers = liveServers.reduce((acc, s) => acc + (s.online || 0), 0);
  const GLOBAL_STATS = [
    { label: "Серверов онлайн", value: liveLoading ? "..." : onlineServers.toString(), icon: "Server", color: "#00ff41" },
    { label: "Игроков сейчас", value: liveLoading ? "..." : totalPlayers.toLocaleString("ru-RU"), icon: "Users", color: "#00bfff" },
    { label: "Обновлено", value: lastUpdated ? lastUpdated.toLocaleTimeString("ru-RU") : "...", icon: "RefreshCw", color: "#ff6600" },
    { label: "Игр мониторится", value: "3", icon: "Gamepad2", color: "#ff3030" },
  ];

  return (
    <div className="min-h-screen text-white" style={{ background: "#0a0a0a", fontFamily: "Rajdhani, sans-serif" }}>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: "rgba(8,8,8,0.97)", borderBottom: "1px solid #1a1a1a", backdropFilter: "blur(10px)" }}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <button onClick={() => scrollTo("home")} className="flex items-center gap-2 group">
            <div className="w-5 h-5 rounded-sm" style={{ background: "var(--neon-green)", boxShadow: "0 0 10px var(--neon-green)" }} />
            <span className="text-lg font-bold tracking-widest" style={{ fontFamily: "Oswald", color: "var(--neon-green)", textShadow: "0 0 10px var(--neon-green)" }}>
              GAMEWATCH
            </span>
          </button>

          <div className="hidden md:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="px-3 py-4 text-xs font-semibold tracking-widest transition-all duration-200"
                style={{
                  fontFamily: "Oswald",
                  color: activeSection === item.id ? "var(--neon-green)" : "rgba(255,255,255,0.45)",
                  borderBottom: activeSection === item.id ? "2px solid var(--neon-green)" : "2px solid transparent",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href="/admin"
              className="font-mono-tech text-xs px-2 py-1 rounded-sm transition-all hover:opacity-80"
              style={{ color: "#ff6600", border: "1px solid #ff660033", background: "#ff660011" }}>
              ADMIN
            </a>
            <OnlineDot />
            <span className="font-mono-tech text-xs" style={{ color: "var(--neon-green)" }}>
              {time.toLocaleTimeString("ru-RU")}
            </span>
          </div>

          <button className="md:hidden text-white/60" onClick={() => setMobileMenu(!mobileMenu)}>
            <Icon name={mobileMenu ? "X" : "Menu"} size={20} />
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden px-4 pb-4 flex flex-col gap-1" style={{ borderTop: "1px solid #1a1a1a", background: "#090909" }}>
            {NAV_ITEMS.map((item) => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className="text-left py-2.5 text-sm font-semibold tracking-widest border-b border-white/5"
                style={{ fontFamily: "Oswald", color: activeSection === item.id ? "var(--neon-green)" : "rgba(255,255,255,0.55)" }}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ===== HERO ===== */}
      <section id="home" className="relative min-h-screen flex flex-col justify-center pt-14 hero-grid">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(0,255,65,0.05) 0%, transparent 70%)" }} />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(0,191,255,0.04) 0%, transparent 70%)" }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="flex items-center gap-3 mb-6">
              <OnlineDot />
              <span className="font-mono-tech text-xs text-white/35 tracking-widest">СИСТЕМА МОНИТОРИНГА v2.6.0</span>
              <span className="font-mono-tech text-xs cursor-blink" style={{ color: "var(--neon-green)" }}>_</span>
            </div>

            <h1 className="text-6xl md:text-9xl font-black tracking-tight mb-4" style={{ fontFamily: "Oswald", lineHeight: 0.95 }}>
              GAME<span style={{ color: "var(--neon-green)", textShadow: "0 0 30px rgba(0,255,65,0.6)" }}>WATCH</span>
            </h1>
            <p className="text-base md:text-xl text-white/40 mb-6 tracking-[0.3em] uppercase">
              Мониторинг игровых серверов в реальном времени
            </p>
            <div className="flex flex-wrap gap-2 mb-10">
              {GAMES.map((g) => (
                <span key={g.id} className="font-mono-tech text-xs px-3 py-1 rounded-sm" style={{ color: g.color, border: `1px solid ${g.color}44`, background: `${g.color}0f` }}>
                  {g.name.toUpperCase()}
                </span>
              ))}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
              {GLOBAL_STATS.map((s: { label: string; value: string; icon: string; color: string }) => (
                <div key={s.label} className="rounded-sm p-4" style={{ background: "#111", borderLeft: `2px solid ${s.color}`, boxShadow: `inset 0 0 20px ${s.color}06` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name={s.icon} size={13} style={{ color: s.color }} />
                    <span className="text-xs text-white/35 tracking-wider">{s.label}</span>
                  </div>
                  <div className="text-2xl font-black" style={{ fontFamily: "Oswald", color: s.color, textShadow: `0 0 12px ${s.color}66` }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Game cards */}
            <div className="grid md:grid-cols-3 gap-4">
              {GAMES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => { setSelectedGame(g.id as "dayz" | "arma" | "conan"); scrollTo("servers"); }}
                  className="scanline rounded overflow-hidden text-left group relative"
                  style={{ border: `1px solid ${g.color}33`, transition: "all 0.3s" }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 25px ${g.color}33`; e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}
                >
                  <img src={g.img} alt={g.name} className="w-full h-44 object-cover opacity-55 group-hover:opacity-75 transition-opacity duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="font-mono-tech text-xs px-2 py-0.5 rounded-sm" style={{ color: g.color, border: `1px solid ${g.color}88`, background: "rgba(0,0,0,0.8)" }}>
                      {g.tag}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Oswald" }}>{g.name}</h3>
                      <div className="flex items-center gap-1.5">
                        <OnlineDot color={g.color} />
                        <span className="font-mono-tech text-xs" style={{ color: g.color }}>
                          {liveServers.filter(s => s.game === g.id).reduce((a, s) => a + s.online, 0)} online
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== SERVERS ===== */}
      <section id="servers" className="py-20" style={{ borderTop: "1px solid #181818" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-8 rounded" style={{ background: "var(--neon-green)", boxShadow: "0 0 10px var(--neon-green)" }} />
            <h2 className="text-4xl font-black tracking-widest" style={{ fontFamily: "Oswald" }}>СЕРВЕРЫ</h2>
            <div className="flex-1 h-px hidden md:block" style={{ background: "linear-gradient(90deg, rgba(0,255,65,0.3), transparent)" }} />
            <div className="flex items-center gap-3">
              <button onClick={loadLive}
                className="flex items-center gap-1.5 font-mono-tech text-xs px-2 py-1 rounded-sm transition-all hover:opacity-80"
                style={{ color: "var(--neon-green)", border: "1px solid rgba(0,255,65,0.3)", background: "rgba(0,255,65,0.06)" }}>
                <Icon name="RefreshCw" size={11} />
                ОБНОВИТЬ
              </button>
              <div className="flex items-center gap-1.5">
                <OnlineDot />
                <span className="font-mono-tech text-xs" style={{ color: "var(--neon-green)" }}>
                  {lastUpdated ? `обновлено ${lastUpdated.toLocaleTimeString("ru-RU")}` : "LIVE"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            {GAMES.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGame(g.id as "dayz" | "arma" | "conan")}
                className="px-5 py-2 text-sm font-bold tracking-wider rounded-sm transition-all duration-200"
                style={{
                  fontFamily: "Oswald",
                  background: selectedGame === g.id ? `${g.color}1a` : "transparent",
                  color: selectedGame === g.id ? g.color : "rgba(255,255,255,0.35)",
                  border: `1px solid ${selectedGame === g.id ? g.color : "rgba(255,255,255,0.1)"}`,
                  boxShadow: selectedGame === g.id ? `0 0 12px ${g.color}33` : "none",
                }}
              >
                {g.name}
              </button>
            ))}
          </div>

          {liveLoading && (
            <div className="text-center py-8 font-mono-tech text-xs" style={{ color: "var(--neon-green)" }}>
              ПОЛУЧЕНИЕ ДАННЫХ...
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-2">
            {servers.map((s, i) => (
              <ServerRow key={s.id} s={s} color={currentGame.color} rank={i + 1} />
            ))}
            {!liveLoading && servers.length === 0 && (
              <div className="col-span-2 text-center py-8 text-white/30 font-mono-tech text-sm">
                Нет серверов. Добавьте серверы в <a href="/admin" className="underline" style={{ color: "var(--neon-green)" }}>панели управления</a>.
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-6 text-xs text-white/25 font-mono-tech">
            <span><span style={{ color: "#00ff41" }}>●</span> ping &lt;30ms — отлично</span>
            <span><span style={{ color: "#ffaa00" }}>●</span> ping 30–60ms — норма</span>
            <span><span style={{ color: "#ff3030" }}>●</span> ping &gt;60ms — высокий</span>
          </div>
        </div>
      </section>

      {/* ===== NEWS ===== */}
      <section id="news" className="py-20" style={{ borderTop: "1px solid #181818" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-8 rounded" style={{ background: "var(--neon-blue)", boxShadow: "0 0 10px var(--neon-blue)" }} />
            <h2 className="text-4xl font-black tracking-widest" style={{ fontFamily: "Oswald" }}>НОВОСТИ</h2>
            <div className="flex-1 h-px hidden md:block" style={{ background: "linear-gradient(90deg, rgba(0,191,255,0.3), transparent)" }} />
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            <button onClick={() => setFilterGame("all")}
              className="px-4 py-1.5 text-xs font-bold tracking-wider rounded-sm transition-all"
              style={{ fontFamily: "Oswald", background: filterGame === "all" ? "rgba(255,255,255,0.08)" : "transparent", color: filterGame === "all" ? "white" : "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.12)" }}>
              ВСЕ ИГРЫ
            </button>
            {GAMES.map((g) => (
              <button key={g.id} onClick={() => setFilterGame(g.id)}
                className="px-4 py-1.5 text-xs font-bold tracking-wider rounded-sm transition-all"
                style={{ fontFamily: "Oswald", background: filterGame === g.id ? `${g.color}1a` : "transparent", color: filterGame === g.id ? g.color : "rgba(255,255,255,0.35)", border: `1px solid ${filterGame === g.id ? g.color : "rgba(255,255,255,0.1)"}` }}>
                {g.name}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNews.map((n) => (
              <div key={n.id} className="rounded overflow-hidden cursor-pointer group transition-all hover:-translate-y-1"
                style={{ background: "#111", border: n.hot ? `1px solid ${n.gameColor}44` : "1px solid #1e1e1e", boxShadow: n.hot ? `0 0 15px ${n.gameColor}15` : "none" }}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tech text-xs px-2 py-0.5 rounded-sm" style={{ color: n.gameColor, background: `${n.gameColor}12`, border: `1px solid ${n.gameColor}33` }}>
                        {n.category}
                      </span>
                      {n.hot && (
                        <span className="font-mono-tech text-xs px-1.5 py-0.5 rounded-sm" style={{ color: "#ff3030", background: "rgba(255,48,48,0.1)", border: "1px solid rgba(255,48,48,0.3)" }}>
                          HOT
                        </span>
                      )}
                    </div>
                    <span className="font-mono-tech text-xs text-white/25">{n.date}</span>
                  </div>
                  <h3 className="font-bold text-white mb-2 leading-snug" style={{ fontFamily: "Oswald", fontSize: "1rem" }}>{n.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{n.text}</p>
                </div>
                <div className="h-px" style={{ background: `linear-gradient(90deg, ${n.gameColor}55, transparent)` }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== UPDATES ===== */}
      <section id="updates" className="py-20" style={{ borderTop: "1px solid #181818" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-8 rounded" style={{ background: "var(--neon-orange)", boxShadow: "0 0 10px var(--neon-orange)" }} />
            <h2 className="text-4xl font-black tracking-widest" style={{ fontFamily: "Oswald" }}>ОБНОВЛЕНИЯ</h2>
            <div className="flex-1 h-px hidden md:block" style={{ background: "linear-gradient(90deg, rgba(255,102,0,0.3), transparent)" }} />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {updatesGrouped.map((u) => (
              <div key={u.game} className="rounded p-5" style={{ background: "#111", borderTop: `2px solid ${u.color}`, boxShadow: `0 -4px 20px ${u.color}10` }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white" style={{ fontFamily: "Oswald", fontSize: "1.1rem" }}>{u.game}</h3>
                  <div className="text-right">
                    <div className="font-mono-tech text-sm font-bold" style={{ color: u.color }}>v{u.version}</div>
                    <div className="font-mono-tech text-xs text-white/25">{u.date}</div>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {u.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-white/65">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: u.color, boxShadow: `0 0 4px ${u.color}` }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4" style={{ borderTop: "1px solid #1e1e1e" }}>
                  <button className="w-full py-2 text-xs font-bold tracking-widest rounded-sm transition-all hover:opacity-80"
                    style={{ fontFamily: "Oswald", color: u.color, border: `1px solid ${u.color}44`, background: `${u.color}0f` }}>
                    ПОДРОБНЕЕ →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section id="stats" className="py-20" style={{ borderTop: "1px solid #181818" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-8 rounded" style={{ background: "#ff3030", boxShadow: "0 0 10px #ff3030" }} />
            <h2 className="text-4xl font-black tracking-widest" style={{ fontFamily: "Oswald" }}>СТАТИСТИКА</h2>
            <div className="flex-1 h-px hidden md:block" style={{ background: "linear-gradient(90deg, rgba(255,48,48,0.3), transparent)" }} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {GLOBAL_STATS.map((s: { label: string; value: string; icon: string; color: string }) => (
              <div key={s.label} className="rounded p-5 text-center" style={{ background: "#111", border: `1px solid ${s.color}22` }}>
                <Icon name={s.icon} size={26} className="mx-auto mb-3" style={{ color: s.color }} />
                <div className="text-3xl font-black mb-1" style={{ fontFamily: "Oswald", color: s.color, textShadow: `0 0 15px ${s.color}55` }}>{s.value}</div>
                <div className="text-xs text-white/35 tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>

          <h3 className="text-xl font-bold tracking-wider mb-4 text-white/60" style={{ fontFamily: "Oswald" }}>РЕЙТИНГ ПО АКТИВНОСТИ</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {GAMES.map((g) => {
              const gameServers = liveServers.filter(s => s.game === g.id);
              const totalPlayers = gameServers.reduce((a, s) => a + s.online, 0);
              const totalMax = gameServers.reduce((a, s) => a + s.max_players, 0);
              const avgActivity = gameServers.length ? Math.round(gameServers.reduce((a, s) => a + s.activity, 0) / gameServers.length) : 0;
              const pct = totalMax ? Math.round((totalPlayers / totalMax) * 100) : 0;

              return (
                <div key={g.id} className="rounded p-5" style={{ background: "#111", border: `1px solid ${g.color}22` }}>
                  <div className="flex items-center gap-3 mb-4">
                    <img src={g.img} alt={g.name} className="w-12 h-12 rounded object-cover opacity-60" />
                    <div>
                      <h3 className="font-bold" style={{ fontFamily: "Oswald", color: g.color }}>{g.name}</h3>
                      <span className="font-mono-tech text-xs text-white/30">{gameServers.length} серверов</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-white/35 mb-1">
                        <span>Игроков онлайн</span>
                        <span className="font-mono-tech" style={{ color: g.color }}>{totalPlayers}/{totalMax}</span>
                      </div>
                      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: g.color, boxShadow: `0 0 8px ${g.color}88` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-white/35 mb-1">
                        <span>Средняя активность</span>
                        <span className="font-mono-tech" style={{ color: g.color }}>{avgActivity}%</span>
                      </div>
                      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${avgActivity}%`, background: `linear-gradient(90deg, ${g.color}66, ${g.color})` }} />
                      </div>
                    </div>
                    <div className="pt-3 grid grid-cols-3 gap-2 text-center" style={{ borderTop: "1px solid #1e1e1e" }}>
                      <div>
                        <div className="font-mono-tech text-base font-bold" style={{ color: g.color }}>{totalPlayers}</div>
                        <div className="text-xs text-white/25">онлайн</div>
                      </div>
                      <div>
                        <div className="font-mono-tech text-base font-bold text-white">{gameServers.length}</div>
                        <div className="text-xs text-white/25">серверов</div>
                      </div>
                      <div>
                        <div className="font-mono-tech text-base font-bold" style={{ color: "#00ff41" }}>{avgActivity}%</div>
                        <div className="text-xs text-white/25">активность</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CONTACTS ===== */}
      <section id="contacts" className="py-20" style={{ borderTop: "1px solid #181818" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1 h-8 rounded" style={{ background: "var(--neon-green)", boxShadow: "0 0 10px var(--neon-green)" }} />
            <h2 className="text-4xl font-black tracking-widest" style={{ fontFamily: "Oswald" }}>КОНТАКТЫ</h2>
            <div className="flex-1 h-px hidden md:block" style={{ background: "linear-gradient(90deg, rgba(0,255,65,0.3), transparent)" }} />
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <p className="text-white/50 mb-6 leading-relaxed text-sm">
                Хочешь добавить свой сервер в мониторинг? Нашёл баг или хочешь предложить новую игру? Пишите — ответим быстро.
              </p>
              <div className="space-y-3">
                {[
                  { icon: "Mail", label: "Email", value: "admin@gamewatch.ru", color: "#00ff41" },
                  { icon: "MessageCircle", label: "Telegram", value: "@gamewatch_ru", color: "#00bfff" },
                  { icon: "Globe", label: "Discord", value: "discord.gg/gamewatch", color: "#ff6600" },
                ].map((c) => (
                  <div key={c.label} className="flex items-center gap-4 rounded px-4 py-3 transition-all hover:bg-white/5"
                    style={{ background: "#111", border: `1px solid ${c.color}22` }}>
                    <Icon name={c.icon} size={18} style={{ color: c.color }} />
                    <div>
                      <div className="text-xs text-white/25 font-mono-tech">{c.label}</div>
                      <div className="text-sm font-semibold" style={{ color: c.color }}>{c.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded p-6" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
              <h3 className="text-lg font-bold mb-4 tracking-wider" style={{ fontFamily: "Oswald" }}>ДОБАВИТЬ СЕРВЕР</h3>
              <div className="space-y-3">
                {[
                  { label: "НАЗВАНИЕ СЕРВЕРА", placeholder: "RU | My Server | PVP" },
                  { label: "IP:ПОРТ", placeholder: "192.168.1.1:2302" },
                  { label: "КОНТАКТ", placeholder: "Email или Telegram" },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="text-xs text-white/30 font-mono-tech tracking-wider">{f.label}</label>
                    <input className="w-full mt-1 px-3 py-2 rounded-sm text-sm text-white placeholder-white/15 outline-none transition-colors"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                      onFocus={e => e.target.style.borderColor = "var(--neon-green)"}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                      placeholder={f.placeholder} />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-white/30 font-mono-tech tracking-wider">ИГРА</label>
                  <select className="w-full mt-1 px-3 py-2 rounded-sm text-sm text-white outline-none transition-colors"
                    style={{ background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <option>DayZ</option>
                    <option>Arma Reforger</option>
                    <option>Conan Exiles</option>
                  </select>
                </div>
                <button className="w-full py-3 mt-2 font-bold tracking-widest text-black rounded-sm transition-all hover:opacity-90"
                  style={{ fontFamily: "Oswald", background: "var(--neon-green)", boxShadow: "0 0 20px rgba(0,255,65,0.25)" }}>
                  ОТПРАВИТЬ ЗАЯВКУ
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 text-center" style={{ borderTop: "1px solid #151515" }}>
        <div className="font-mono-tech text-xs text-white/18 tracking-widest mb-2">
          GAMEWATCH © 2026 — DayZ · Arma Reforger · Conan Exiles
        </div>
        <div className="flex items-center justify-center gap-2">
          <OnlineDot />
          <span className="font-mono-tech text-xs" style={{ color: "var(--neon-green)" }}>СИСТЕМА АКТИВНА</span>
        </div>
      </footer>
    </div>
  );
}