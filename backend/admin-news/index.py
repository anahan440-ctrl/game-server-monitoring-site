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
    """CRUD для новостей. GET — список, POST — создать, PUT — обновить, DELETE — удалить."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    schema = os.environ.get("MAIN_DB_SCHEMA", "public")
    params = event.get("queryStringParameters") or {}

    # GET — публичный список
    if method == "GET":
        game = params.get("game")
        conn = get_conn()
        cur = conn.cursor()
        if game:
            cur.execute(
                f"SELECT id, game, title, text, category, is_hot, published_at FROM {schema}.news WHERE game = %s ORDER BY published_at DESC",
                (game,)
            )
        else:
            cur.execute(
                f"SELECT id, game, title, text, category, is_hot, published_at FROM {schema}.news ORDER BY published_at DESC"
            )
        rows = cur.fetchall()
        conn.close()
        news = [
            {"id": r[0], "game": r[1], "title": r[2], "text": r[3],
             "category": r[4], "is_hot": r[5], "date": r[6].strftime("%d.%m.%Y") if r[6] else ""}
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"news": news})}

    # Все остальные методы — только для админа
    if not verify_token(event.get("headers") or {}):
        return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Нет доступа"})}

    body = json.loads(event.get("body") or "{}")

    if method == "POST":
        game = body.get("game", "")
        title = body.get("title", "").strip()
        text = body.get("text", "").strip()
        category = body.get("category", "НОВОСТЬ").strip()
        is_hot = bool(body.get("is_hot", False))

        if not game or not title or not text:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "game, title, text обязательны"})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {schema}.news (game, title, text, category, is_hot) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (game, title, text, category, is_hot)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {"statusCode": 201, "headers": CORS, "body": json.dumps({"id": new_id, "ok": True})}

    if method == "PUT":
        news_id = body.get("id")
        if not news_id:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id обязателен"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {schema}.news SET game=%s, title=%s, text=%s, category=%s, is_hot=%s WHERE id=%s",
            (body.get("game"), body.get("title"), body.get("text"), body.get("category", "НОВОСТЬ"), bool(body.get("is_hot")), news_id)
        )
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    if method == "DELETE":
        news_id = params.get("id") or body.get("id")
        if not news_id:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id обязателен"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {schema}.news WHERE id=%s", (news_id,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}
