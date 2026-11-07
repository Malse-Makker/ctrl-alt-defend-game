import importlib
import json

import pytest


def sample_round(**over):
    r = {
        "version": "0.1.0",
        "commit": "abc1234",
        "player": "0123456789abcdef",
        "level": 1,
        "seed": 42,
        "result": "won",
        "stars": 3,
        "focusStart": 100,
        "focusLeft": 100,
        "wavesReached": 21,
        "totalWaves": 21,
        "simSeconds": 400,
        "realSeconds": 300,
        "score": 900,
        "coffee": {"kills": 300.5, "bank": 0, "salary": 290, "machines": 40, "sales": 0, "spent": 600, "end": 30.5},
        "kills": {"intern": 300},
        "leaks": {},
        "leakFocus": {},
        "built": {"autoreply": 7},
        "upgrades": 14,
        "pathTiers": {"autoreply_0": 3, "autoreply_1": 2},
        "sold": 0,
        "earlyCalls": 2,
        "firstLeakWave": 0,
        "peakOnFloor": 30,
        "towers": [{"type": "autoreply", "tiers": [3, 2, 0], "owner": 0, "damage": 900, "kills": 80, "invested": 120}],
        "speedUse": {"1x": 120.5, "2x": 30},
    }
    r.update(over)
    return r


@pytest.fixture()
def relay(tmp_path, monkeypatch):
    monkeypatch.setenv("RELAY_DB", str(tmp_path / "relay.sqlite3"))
    monkeypatch.setenv("DISCORD_WEBHOOK_URL", "https://discord.example/webhook")
    monkeypatch.setenv("TRUSTED_PROXIES", "1")
    import app as appmod

    appmod = importlib.reload(appmod)
    sent = []
    monkeypatch.setattr(appmod, "post_json", lambda url, payload: sent.append((url, payload)) or True)
    appmod.app.config["TESTING"] = True
    return appmod, appmod.app.test_client(), sent


def test_health(relay):
    _, client, _ = relay
    assert client.get("/api/health").get_json() == {"ok": True, "forward": True}


def test_round_is_stored(relay):
    mod, client, _ = relay
    res = client.post("/api/round", json=sample_round())
    assert res.status_code == 200
    with mod.app.app_context():
        row = mod.db().execute("SELECT * FROM rounds").fetchone()
        assert row["level"] == 1 and row["result"] == "won"
        assert json.loads(row["data"])["towers"][0]["type"] == "autoreply"


@pytest.mark.parametrize(
    "bad",
    [
        {"version": "1.0"},
        {"player": "not-hex-at-all!!"},
        {"result": "cheated"},
        {"stars": 4},
        {"level": "1"},
        {"kills": {"<script>": 1}},
        {"towers": [{"type": "autoreply", "tiers": [4, 4, 0], "owner": 0, "damage": 1, "kills": 0, "invested": 1}]},
        {"towers": [{"type": "autoreply", "tiers": [1, 1, 1], "owner": 0, "damage": 1, "kills": 0, "invested": 1}]},
    ],
)
def test_round_rejects_bad_fields(relay, bad):
    _, client, _ = relay
    res = client.post("/api/round", json=sample_round(**bad))
    assert res.status_code == 400


def test_feedback_is_stored_and_forwarded_without_pings(relay):
    mod, client, sent = relay
    res = client.post("/api/feedback", json={"round": sample_round(), "fun": 8, "comment": "@everyone this is great", "name": "Tester"})
    assert res.status_code == 200
    assert len(sent) == 1
    url, payload = sent[0]
    assert payload["allowed_mentions"] == {"parse": []}
    assert "@everyone" not in payload["content"]
    assert "8/10" in payload["content"]
    assert "autoreply 3-2-0" in payload["content"]
    with mod.app.app_context():
        row = mod.db().execute("SELECT * FROM feedback").fetchone()
        assert row["fun"] == 8 and row["forwarded"] == 1 and row["name"] == "Tester"


def test_feedback_validation(relay):
    _, client, _ = relay
    assert client.post("/api/feedback", json={"round": sample_round(), "fun": 11}).status_code == 400
    assert client.post("/api/feedback", json={"round": sample_round(), "fun": 5, "comment": "x" * 1501}).status_code == 400
    assert client.post("/api/feedback", data="not json", content_type="text/plain").status_code == 400


def test_body_size_cap(relay):
    _, client, _ = relay
    big = sample_round(kills={f"k{i}": 1 for i in range(30)})
    big["padding"] = "x" * 70000
    assert client.post("/api/round", json=big).status_code == 413


def test_rate_limit_per_ip(relay):
    _, client, _ = relay
    codes = [
        client.post("/api/feedback", json={"round": sample_round(), "fun": 5}, headers={"X-Forwarded-For": "1.2.3.4"}).status_code
        for _ in range(8)
    ]
    assert codes[:6] == [200] * 6
    assert codes[6] == 429
    other = client.post("/api/feedback", json={"round": sample_round(), "fun": 5}, headers={"X-Forwarded-For": "5.6.7.8"})
    assert other.status_code == 200
