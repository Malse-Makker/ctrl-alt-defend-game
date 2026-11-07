#!/usr/bin/env bash
# One way to release, so version, changelog and build never drift apart.
#
#   tools/release.sh            check, tag and push (needs a clean, committed tree)
#   tools/release.sh --ssh      also deploy directly over SSH (when the Actions deploy key is not set)
#
# Steps: VERSION must match the top section of CHANGELOG.md, the tree must be clean, typecheck +
# tests + build must pass, then tag vX.Y.Z and push. Afterwards it waits until
# https://game.makkers.net/version.json reports the new version.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="$(tr -d '[:space:]' < VERSION)"
TOP="$(grep -m1 -oE '^## \[[0-9]+\.[0-9]+\.[0-9]+\]' CHANGELOG.md | tr -d '#[] ')"
if [[ "$VERSION" != "$TOP" ]]; then
  echo "VERSION is $VERSION but the top of CHANGELOG.md is $TOP. Add a changelog section first." >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree not clean. Commit first." >&2
  exit 1
fi

npm run check
npm run build

if git rev-parse "v$VERSION" >/dev/null 2>&1; then
  echo "Tag v$VERSION already exists, not tagging again."
else
  git tag -a "v$VERSION" -m "v$VERSION"
fi
git push origin main
git push origin "v$VERSION"

if [[ "${1:-}" == "--ssh" ]]; then
  ssh ubuntu@makkers.net 'cd /home/ubuntu/ctrl-alt-defend-game && git pull --ff-only origin main && GIT_COMMIT=$(git rev-parse --short HEAD) setsid nohup docker compose up -d --build --force-recreate > /home/ubuntu/ctrl-alt-defend-game/deploy.log 2>&1 < /dev/null &'
  echo "Building on the server. Follow along with:"
  echo "  ssh ubuntu@makkers.net 'tail -f /home/ubuntu/ctrl-alt-defend-game/deploy.log'"
fi

URL="${RELEASE_URL:-https://game.makkers.net/version.json}"
echo "Waiting for $URL to report $VERSION..."
for _ in $(seq 1 60); do
  LIVE="$(curl -fsS "$URL" 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["version"])' 2>/dev/null || true)"
  if [[ "$LIVE" == "$VERSION" ]]; then
    echo "Live: $VERSION"
    exit 0
  fi
  sleep 10
done
echo "Not live after 10 minutes (still: ${LIVE:-nothing}). Check the Actions run or deploy.log." >&2
exit 1
