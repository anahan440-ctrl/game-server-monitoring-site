import json
import os
import hashlib
import psycopg2


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def verify_token(headers: dict) -> bool:
    token = headers.get("x-admin-token") or headers.get("X-Admin-Token", "")
    schema = os.environ.get("MAIN_DB_SCHEMA", "public")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT id, username FROM {schema}.admins")
    admins = cur.fetchall()
    conn.close()
    for row in admins:
        expected = hashlib.sha256(f"{row[0]}:{row[1]}:gamewatch-secret".encode()).hexdigest()
        if token == expected:
            return True
    return False


def handler(event: dict, context) -> dict:
    """Управление серверами и обновлениями. GET /servers, GET /updates — публичные. POST/PUT/DELETE — только для админа."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    schema = os.environ.get("MAIN_DB_SCHEMA", "public")
    params = event.get("queryStringParameters") or {}
    path = event.get("path", "/")
    resource = params.get("resource", "servers")

    # GET — публичные данные
    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        if resource == "updates":
            cur.execute(f"SELECT id, game, version, items, published_at FROM {schema}.updates ORDER BY published_at DESC")
            rows = cur.fetchall()
            conn.close()
            data = [
                {"id": r[0], "game": r[1], "version": r[2], "items": list(r[3]),
                 "date": r[4].strftime("%d.%m.%Y") if r[4] else ""}
                for r in rows
            ]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"updates": data})}
        else:
            game = params.get("game")
            if game:
                cur.execute(
                    f"SELECT id, game, name, map, ip, max_players, is_active, battlemetrics_id FROM {schema}.servers WHERE game=%s AND is_active=TRUE ORDER BY id",
                    (game,)
                )
            else:
                cur.execute(
                    f"SELECT id, game, name, map, ip, max_players, is_active, battlemetrics_id FROM {schema}.servers WHERE is_active=TRUE ORDER BY id"
                )
            rows = cur.fetchall()
            conn.close()
            data = [
                {"id": r[0], "game": r[1], "name": r[2], "map": r[3],
                 "ip": r[4], "max_players": r[5], "is_active": r[6],
                 "battlemetrics_id": r[7] or ""}
                for r in rows
            ]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"servers": data})}

    # Только для админа
    if not verify_token(event.get("headers") or {}):
        return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Нет доступа"})}

    body = json.loads(event.get("body") or "{}")
    resource = body.get("resource", resource)

    if resource == "servers":
        if method == "POST":
            conn = get_conn()
            cur = conn.cursor()
            bm_id = body.get("battlemetrics_id", "").strip() or None
            cur.execute(
                f"INSERT INTO {schema}.servers (game, name, map, ip, max_players, battlemetrics_id) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
                (body["game"], body["name"], body["map"], body.get("ip",""), int(body.get("max_players", 60)), bm_id)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            conn.close()
            return {"statusCode": 201, "headers": CORS, "body": json.dumps({"id": new_id, "ok": True})}

        if method == "PUT":
            conn = get_conn()
            cur = conn.cursor()
            bm_id = body.get("battlemetrics_id", "").strip() or None
            cur.execute(
                f"UPDATE {schema}.servers SET game=%s,name=%s,map=%s,ip=%s,max_players=%s,is_active=%s,battlemetrics_id=%s WHERE id=%s",
                (body["game"], body["name"], body["map"], body.get("ip",""), int(body.get("max_players",60)), bool(body.get("is_active",True)), bm_id, body["id"])
            )
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        if method == "DELETE":
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"UPDATE {schema}.servers SET is_active=FALSE WHERE id=%s", (body.get("id") or params.get("id"),))
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    if resource == "updates":
        if method == "POST":
            items = body.get("items", [])
            if isinstance(items, str):
                items = [i.strip() for i in items.split("\n") if i.strip()]
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(
                f"INSERT INTO {schema}.updates (game, version, items) VALUES (%s,%s,%s) RETURNING id",
                (body["game"], body["version"], items)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            conn.close()
            return {"statusCode": 201, "headers": CORS, "body": json.dumps({"id": new_id, "ok": True})}

        if method == "DELETE":
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"DELETE FROM {schema}.updates WHERE id=%s", (body.get("id") or params.get("id"),))
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}