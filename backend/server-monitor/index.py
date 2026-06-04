import json
import os
import urllib.request
import urllib.error
import psycopg2


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def fetch_battlemetrics(server_id: str) -> dict:
    """Запрашивает данные сервера по BattleMetrics ID."""
    url = f"https://api.battlemetrics.com/servers/{server_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "GameWatch/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())
            attrs = data.get("data", {}).get("attributes", {})
            return {
                "online": attrs.get("players", 0),
                "max": attrs.get("maxPlayers", 0),
                "ping": attrs.get("details", {}).get("rust_last_seed_change") or attrs.get("rank", 0),
                "status": attrs.get("status", "unknown"),
                "name": attrs.get("name", ""),
                "ip": attrs.get("ip", ""),
                "port": attrs.get("port", 0),
            }
    except Exception:
        return {"online": 0, "max": 0, "ping": 0, "status": "offline", "name": "", "ip": "", "port": 0}


def handler(event: dict, context) -> dict:
    """
    GET / — возвращает онлайн всех серверов из БД.
    GET /?game=dayz — только для конкретной игры.
    Если у сервера есть battlemetrics_id — берёт реальные данные, иначе возвращает last_* из БД.
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    schema = os.environ.get("MAIN_DB_SCHEMA", "public")
    params = event.get("queryStringParameters") or {}
    game_filter = params.get("game")

    conn = get_conn()
    cur = conn.cursor()

    if game_filter:
        cur.execute(
            f"""SELECT id, game, name, map, ip, max_players, battlemetrics_id,
                last_online, last_max, last_ping, last_status
                FROM {schema}.servers
                WHERE is_active=TRUE AND game=%s
                ORDER BY id""",
            (game_filter,)
        )
    else:
        cur.execute(
            f"""SELECT id, game, name, map, ip, max_players, battlemetrics_id,
                last_online, last_max, last_ping, last_status
                FROM {schema}.servers
                WHERE is_active=TRUE
                ORDER BY id"""
        )

    rows = cur.fetchall()
    results = []

    for row in rows:
        sid, game, name, smap, ip, max_p, bm_id, last_online, last_max, last_ping, last_status = row

        if bm_id and bm_id.strip():
            live = fetch_battlemetrics(bm_id.strip())
            online = live["online"]
            maxx = live["max"] or max_p
            status = live["status"]
            # Сохраняем в БД для кэша
            cur.execute(
                f"""UPDATE {schema}.servers
                    SET last_online=%s, last_max=%s, last_status=%s, last_checked=NOW()
                    WHERE id=%s""",
                (online, maxx, status, sid)
            )
            source = "live"
        else:
            online = last_online or 0
            maxx = last_max or max_p
            status = last_status or "unknown"
            source = "cached"

        activity = round((online / maxx * 100)) if maxx > 0 else 0

        results.append({
            "id": sid,
            "game": game,
            "name": name,
            "map": smap,
            "ip": ip or "",
            "max_players": maxx,
            "online": online,
            "status": status,
            "activity": activity,
            "has_live": bool(bm_id and bm_id.strip()),
            "source": source,
        })

    conn.commit()
    conn.close()

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({"servers": results, "count": len(results)}),
    }
