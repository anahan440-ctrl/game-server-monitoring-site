import json
import os
import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def verify_token(headers: dict) -> bool:
    import hashlib
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
    """
    POST / — принять заявку на добавление сервера (публично).
    GET / — список заявок (только для админа).
    DELETE / — удалить/закрыть заявку (только для админа).
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    schema = os.environ.get("MAIN_DB_SCHEMA", "public")

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        server_name = (body.get("server_name") or "").strip()
        ip = (body.get("ip") or "").strip()
        contact = (body.get("contact") or "").strip()
        game = (body.get("game") or "").strip()

        if not server_name or not ip or not contact or not game:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните все поля"})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {schema}.server_requests (server_name, ip, contact, game) VALUES (%s,%s,%s,%s) RETURNING id",
            (server_name, ip, contact, game)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {"statusCode": 201, "headers": CORS, "body": json.dumps({"ok": True, "id": new_id})}

    if method == "GET":
        if not verify_token(event.get("headers") or {}):
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Нет доступа"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, server_name, ip, contact, game, status, created_at FROM {schema}.server_requests ORDER BY created_at DESC"
        )
        rows = cur.fetchall()
        conn.close()
        data = [
            {"id": r[0], "server_name": r[1], "ip": r[2], "contact": r[3],
             "game": r[4], "status": r[5], "created_at": r[6].strftime("%d.%m.%Y %H:%M") if r[6] else ""}
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"requests": data})}

    if method == "DELETE":
        if not verify_token(event.get("headers") or {}):
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Нет доступа"})}
        body = json.loads(event.get("body") or "{}")
        rid = body.get("id")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {schema}.server_requests WHERE id=%s", (rid,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}
