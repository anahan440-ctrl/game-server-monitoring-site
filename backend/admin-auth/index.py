import json
import os
import psycopg2


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    """Авторизация администратора. POST /login — проверка логина/пароля, возвращает токен."""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    if event.get("httpMethod") != "POST":
        return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "Method not allowed"})}

    body = json.loads(event.get("body") or "{}")
    username = body.get("username", "").strip()
    password = body.get("password", "").strip()

    if not username or not password:
        return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Укажите логин и пароль"})}

    schema = os.environ.get("MAIN_DB_SCHEMA", "public")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, username FROM {schema}.admins WHERE username = %s AND password_hash = %s",
        (username, password)
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Неверный логин или пароль"})}

    import hashlib
    token = hashlib.sha256(f"{row[0]}:{username}:gamewatch-secret".encode()).hexdigest()

    return {
        "statusCode": 200,
        "headers": cors,
        "body": json.dumps({"token": token, "username": row[1], "admin_id": row[0]}),
    }
