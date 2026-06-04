import json
import os
import re
import urllib.request
import psycopg2


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def fetch_wargm(wargm_id: str) -> dict:
    """Парсит онлайн сервера со страницы wargm.ru по ID."""
    url = f"https://wargm.ru/server/{wargm_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
        match = re.search(r'Online\s+(\d+)/(\d+)', html)
        if match:
            return {
                "online": int(match.group(1)),
                "max": int(match.group(2)),
                "status": "online",
            }
        return {"online": 0, "max": 0, "status": "offline"}
    except Exception:
        return {"online": 0, "max": 0, "status": "offline"}


def handler(event: dict, context) -> dict:
    """
    GET / — возвращает онлайн всех серверов из БД.
    GET /?game=dayz — только для конкретной игры.
    Если у сервера есть wargm_id — парсит wargm.ru, иначе возвращает last_* из БД.
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
            f"""SELECT id, game, name, map, ip, max_players, wargm_id,
                last_online, last_max, last_ping, last_status
                FROM {schema}.servers
                WHERE is_active=TRUE AND game=%s
                ORDER BY id""",
            (game_filter,)
        )
    else:
        cur.execute(
            f"""SELECT id, game, name, map, ip, max_players, wargm_id,
                last_online, last_max, last_ping, last_status
                FROM {schema}.servers
                WHERE is_active=TRUE
                ORDER BY id"""
        )

    rows = cur.fetchall()
    results = []

    for row in rows:
        sid, game, name, smap, ip, max_p, wargm_id, last_online, last_max, last_ping, last_status = row

        if wargm_id and wargm_id.strip():
            live = fetch_wargm(wargm_id.strip())
            online = live["online"]
            maxx = live["max"] or max_p
            status = live["status"]
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
            "has_live": bool(wargm_id and wargm_id.strip()),
            "source": source,
        })

    conn.commit()
    conn.close()

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({"servers": results, "count": len(results)}),
    }
