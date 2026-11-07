"""Feedback relay for CTRL-ALT-DEFEND.

The browser posts round stats and feedback here. This service:

- keeps the Discord/Mattermost webhook out of the browser (it lives in .env on the server, so
  nobody can copy it from the devtools and spam the channel);
- rate-limits per IP, caps the body size and checks every field;
- stores every round and every piece of feedback in SQLite, so the balance can be read from
  real games (python -m report);
- never stores an IP address. The player id is a random string from the player's browser.
"""

import json
import os
import sqlite3
import threading
import time
import urllib.error
import urllib.request
from collections import defaultdict, deque

from flask import Flask, g, jsonify, request
from werkzeug.middleware.proxy_fix import ProxyFix

DB_PATH = os.environ.get("RELAY_DB", "/data/relay.sqlite3")
DISCORD_WEBHOOK = os.environ.get("DISCORD_WEBHOOK_URL", "").strip()
MATTERMOST_WEBHOOK = os.environ.get("MATTERMOST_WEBHOOK_URL", "").strip()
# Client -> Nginx Proxy Manager -> nginx (web container) -> here: two proxies in front of us.
TRUSTED_PROXIES = int(os.environ.get("TRUSTED_PROXIES", "2"))

RESULTS = {"won", "burnout", "gaveup"}
MAX_BODY = 64 * 1024

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_BODY
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=TRUSTED_PROXIES)  # type: ignore[method-assign]

SCHEMA = """
CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    version TEXT NOT NULL,
    player TEXT NOT NULL,
    level INTEGER NOT NULL,
    result TEXT NOT NULL,
    stars INTEGER NOT NULL,
    focus_left INTEGER NOT NULL,
    focus_start INTEGER NOT NULL,
    waves INTEGER NOT NULL,
    total_waves INTEGER NOT NULL,
    data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    version TEXT NOT NULL,
    player TEXT NOT NULL,
    level INTEGER NOT NULL,
    fun INTEGER NOT NULL,
    comment TEXT NOT NULL,
    name TEXT NOT NULL,
    forwarded INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL
);
"""


def db():
    if "db" not in g:
        conn = sqlite3.connect(DB_PATH, timeout=10)
        conn.row_factory = sqlite3.Row
        conn.executescript(SCHEMA)
        g.db = conn
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


# ------------------------------------------------------------------ rate limiting

class RateLimiter:
    """Sliding window per key, in memory. Fine for one gunicorn worker."""

    def __init__(self):
        self.hits = defaultdict(deque)
        self.lock = threading.Lock()

    def allow(self, key, limit, window):
        now = time.monotonic()
        with self.lock:
            q = self.hits[key]
            while q and now - q[0] > window:
                q.popleft()
            if len(q) >= limit:
                return False
            q.append(now)
            if len(self.hits) > 5000:
                for k in [k for k, v in self.hits.items() if not v or now - v[-1] > window]:
                    del self.hits[k]
            return True


limiter = RateLimiter()


def client_key(kind):
    return f"{kind}:{request.remote_addr or 'unknown'}"


# ------------------------------------------------------------------ validation

class Invalid(ValueError):
    pass


def _str(d, key, max_len, pattern=None, default=None):
    v = d.get(key, default)
    if not isinstance(v, str):
        raise Invalid(f"{key} must be text")
    v = v.strip()
    if len(v) > max_len:
        raise Invalid(f"{key} too long")
    if pattern is not None and not pattern(v):
        raise Invalid(f"{key} has an unexpected format")
    return v


def _int(d, key, lo, hi):
    v = d.get(key)
    if isinstance(v, bool) or not isinstance(v, (int, float)) or v != int(v):
        raise Invalid(f"{key} must be a whole number")
    v = int(v)
    if v < lo or v > hi:
        raise Invalid(f"{key} out of range")
    return v


def _counts(d, key):
    v = d.get(key, {})
    if not isinstance(v, dict) or len(v) > 40:
        raise Invalid(f"{key} must be a small object")
    out = {}
    for k, n in v.items():
        if not isinstance(k, str) or len(k) > 24 or not k.replace("_", "").isalnum():
            raise Invalid(f"{key} has a bad key")
        if isinstance(n, bool) or not isinstance(n, (int, float)) or n < 0 or n > 1e7:
            raise Invalid(f"{key} has a bad value")
        out[k] = n
    return out


def is_version(v):
    parts = v.split(".")
    return len(parts) == 3 and all(p.isdigit() for p in parts)


def is_player(v):
    return len(v) == 16 and all(c in "0123456789abcdef" for c in v)


def clean_round(d):
    if not isinstance(d, dict):
        raise Invalid("round must be an object")
    r = {
        "version": _str(d, "version", 20, is_version),
        "commit": _str(d, "commit", 12, lambda v: v.isalnum(), default="unknown"),
        "player": _str(d, "player", 16, is_player),
        "level": _int(d, "level", 1, 999),
        "seed": _int(d, "seed", 0, 2**32),
        "result": _str(d, "result", 10, lambda v: v in RESULTS),
        "stars": _int(d, "stars", 0, 3),
        "focusStart": _int(d, "focusStart", 1, 10000),
        "focusLeft": _int(d, "focusLeft", 0, 10000),
        "wavesReached": _int(d, "wavesReached", 0, 1000),
        "totalWaves": _int(d, "totalWaves", 1, 1000),
        "simSeconds": _int(d, "simSeconds", 0, 10**6),
        "realSeconds": _int(d, "realSeconds", 0, 10**6),
        "score": _int(d, "score", 0, 10**7),
        "upgrades": _int(d, "upgrades", 0, 10**5),
        "sold": _int(d, "sold", 0, 10**5),
        "earlyCalls": _int(d, "earlyCalls", 0, 10**4),
        "firstLeakWave": _int(d, "firstLeakWave", 0, 1000),
        "peakOnFloor": _int(d, "peakOnFloor", 0, 10**5),
    }
    for key in ("kills", "leaks", "leakFocus", "built", "sidePaths", "speedUse"):
        r[key] = _counts(d, key)
    coffee = d.get("coffee", {})
    if not isinstance(coffee, dict):
        raise Invalid("coffee must be an object")
    r["coffee"] = _counts({"coffee": coffee}, "coffee")
    towers = d.get("towers", [])
    if not isinstance(towers, list) or len(towers) > 200:
        raise Invalid("towers must be a short list")
    clean_towers = []
    for t in towers:
        if not isinstance(t, dict):
            raise Invalid("tower must be an object")
        side = t.get("side")
        if side not in (None, "overtime", "escalation"):
            raise Invalid("tower side unknown")
        clean_towers.append({
            "type": _str(t, "type", 24, lambda v: v.isalnum()),
            "level": _int(t, "level", 1, 3),
            "side": side,
            "step": _int(t, "step", 0, 2),
            "damage": _int(t, "damage", 0, 10**9),
            "kills": _int(t, "kills", 0, 10**7),
            "invested": _int(t, "invested", 0, 10**7),
        })
    r["towers"] = clean_towers
    return r


# ------------------------------------------------------------------ forwarding

def neutralise(text):
    """No pings: a comment that says @everyone must not notify a whole Discord server."""
    return text.replace("@", "@​")


def summary_text(r, fun, comment, name):
    stars = r["stars"]
    result = {"won": f"won, {stars} star{'s' if stars != 1 else ''}", "burnout": "burnout", "gaveup": "gave up"}[r["result"]]
    lines = [
        f"**Feedback** v{r['version']} ({r['commit']}) | Level {r['level']} | {result}",
        f"Fun: **{fun}/10** | Focus {r['focusLeft']}/{r['focusStart']} | waves {r['wavesReached']}/{r['totalWaves']} | "
        f"{r['realSeconds'] // 60}m{r['realSeconds'] % 60:02d}s",
    ]
    if r["leaks"]:
        hurt = sorted(r["leakFocus"].items(), key=lambda kv: -kv[1])
        lines.append("Hurt by: " + ", ".join(f"{k} x{int(r['leaks'].get(k, 0))} (-{int(v)})" for k, v in hurt))
    if r["towers"]:
        built = defaultdict(int)
        for t in r["towers"]:
            built[f"{t['type']}{t['level']}"] += 1
        lines.append("Towers: " + ", ".join(f"{k} x{n}" for k, n in sorted(built.items())))
    if comment:
        lines.append("> " + neutralise(comment).replace("\n", "\n> "))
    lines.append(f"-- {neutralise(name) if name else 'anonymous'} ({r['player'][:6]})")
    text = "\n".join(lines)
    return text[:1900]


def post_json(url, payload):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "ctrl-alt-defend-relay"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=6) as res:  # noqa: S310 (fixed https URLs from .env)
            return 200 <= res.status < 300
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def forward(text):
    ok = False
    if DISCORD_WEBHOOK.startswith("https://"):
        ok = post_json(DISCORD_WEBHOOK, {"content": text, "username": "CTRL-ALT-DEFEND", "allowed_mentions": {"parse": []}}) or ok
    if MATTERMOST_WEBHOOK.startswith("https://"):
        ok = post_json(MATTERMOST_WEBHOOK, {"text": text, "username": "CTRL-ALT-DEFEND"}) or ok
    return ok


# ------------------------------------------------------------------ routes

def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json():
    if not request.is_json:
        raise Invalid("expected JSON")
    data = request.get_json(silent=True)
    if data is None:
        raise Invalid("expected JSON")
    return data


@app.errorhandler(Invalid)
def on_invalid(err):
    return jsonify(ok=False, error=str(err)), 400


@app.errorhandler(413)
def on_too_large(_err):
    return jsonify(ok=False, error="too large"), 413


@app.get("/api/health")
def health():
    return jsonify(ok=True, forward=bool(DISCORD_WEBHOOK or MATTERMOST_WEBHOOK))


@app.post("/api/round")
def round_stats():
    if not limiter.allow(client_key("round"), 40, 600):
        return jsonify(ok=False, error="slow down"), 429
    r = clean_round(read_json())
    conn = db()
    conn.execute(
        "INSERT INTO rounds (created_at, version, player, level, result, stars, focus_left, focus_start, waves, total_waves, data)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (now_iso(), r["version"], r["player"], r["level"], r["result"], r["stars"], r["focusLeft"], r["focusStart"],
         r["wavesReached"], r["totalWaves"], json.dumps(r, separators=(",", ":"))),
    )
    conn.commit()
    return jsonify(ok=True)


@app.post("/api/feedback")
def feedback():
    if not limiter.allow(client_key("feedback"), 6, 600):
        return jsonify(ok=False, error="slow down"), 429
    data = read_json()
    if not isinstance(data, dict):
        raise Invalid("expected an object")
    r = clean_round(data.get("round"))
    fun = _int(data, "fun", 0, 10)
    comment = _str(data, "comment", 1500, default="")
    name = _str(data, "name", 40, default="")
    conn = db()
    cur = conn.execute(
        "INSERT INTO feedback (created_at, version, player, level, fun, comment, name, data) VALUES (?,?,?,?,?,?,?,?)",
        (now_iso(), r["version"], r["player"], r["level"], fun, comment, name, json.dumps(r, separators=(",", ":"))),
    )
    conn.commit()
    forwarded = forward(summary_text(r, fun, comment, name))
    if forwarded:
        conn.execute("UPDATE feedback SET forwarded = 1 WHERE id = ?", (cur.lastrowid,))
        conn.commit()
    return jsonify(ok=True)
