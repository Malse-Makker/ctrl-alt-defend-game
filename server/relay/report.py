"""Read the playtest data the relay collected. Run on the server:

    docker compose exec relay python report.py [--version 0.1.0] [--level 1] [--comments 20]

Follows the rules from the Godot version for reading playtest data:
- early wave calls are a contaminated signal (players rush a round that is already lost), so
  look at Coffee earned and kills next to them;
- look at what leaked before touching towers;
- always split by version: half the feedback is about things already fixed.
"""

import argparse
import json
import os
import sqlite3
from collections import Counter, defaultdict

DB_PATH = os.environ.get("RELAY_DB", "/data/relay.sqlite3")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--version")
    ap.add_argument("--level", type=int)
    ap.add_argument("--comments", type=int, default=15)
    args = ap.parse_args()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    where, params = [], []
    if args.version:
        where.append("version = ?")
        params.append(args.version)
    if args.level:
        where.append("level = ?")
        params.append(args.level)
    clause = (" WHERE " + " AND ".join(where)) if where else ""

    rounds = conn.execute(f"SELECT * FROM rounds{clause} ORDER BY id", params).fetchall()
    print(f"ROUNDS: {len(rounds)}")
    groups = defaultdict(list)
    for r in rounds:
        groups[(r["version"], r["level"])].append(r)
    for (ver, lvl), rs in sorted(groups.items()):
        n = len(rs)
        won = sum(1 for r in rs if r["result"] == "won")
        flawless = sum(1 for r in rs if r["result"] == "won" and r["focus_left"] == r["focus_start"])
        players = len({r["player"] for r in rs})
        print(f"\nv{ver} level {lvl}: {n} rounds by {players} players, won {won} ({100 * won // n}%), flawless {flawless}")
        results = Counter(r["result"] for r in rs)
        print("  results: " + ", ".join(f"{k} {v}" for k, v in results.most_common()))
        leaks, leak_focus, built, early, coffee = Counter(), Counter(), Counter(), [], []
        lost_wave = Counter()
        for r in rs:
            d = json.loads(r["data"])
            leaks.update(d.get("leaks", {}))
            leak_focus.update(d.get("leakFocus", {}))
            built.update(d.get("built", {}))
            early.append(d.get("earlyCalls", 0))
            coffee.append(sum(d.get("coffee", {}).get(k, 0) for k in ("kills", "salary", "machines")))
            if r["result"] != "won":
                lost_wave[r["waves"]] += 1
        if leak_focus:
            print("  focus lost to: " + ", ".join(f"{k} {int(v)} ({int(leaks[k])}x)" for k, v in leak_focus.most_common()))
        if lost_wave:
            print("  lost at wave: " + ", ".join(f"{w}: {c}" for w, c in sorted(lost_wave.items())))
        print("  built: " + ", ".join(f"{k} {v}" for k, v in built.most_common()))
        print(f"  early calls avg {sum(early) / n:.1f} | coffee earned avg {sum(coffee) / n:.0f} (read these together)")

    fb = conn.execute(f"SELECT * FROM feedback{clause} ORDER BY id DESC", params).fetchall()
    print(f"\nFEEDBACK: {len(fb)}")
    by_ver = defaultdict(list)
    for f in fb:
        by_ver[(f["version"], f["level"])].append(f["fun"])
    for (ver, lvl), funs in sorted(by_ver.items()):
        print(f"  v{ver} level {lvl}: fun avg {sum(funs) / len(funs):.1f} over {len(funs)}")
    for f in fb[: args.comments]:
        if f["comment"]:
            print(f"  [{f['created_at']} v{f['version']} L{f['level']} fun {f['fun']}] {f['name'] or 'anonymous'}: {f['comment']}")


if __name__ == "__main__":
    main()
