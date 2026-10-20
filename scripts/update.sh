#!/usr/bin/env bash
export PATH="/opt/node-24/node/bin:$PATH"
set -euo pipefail

step() {
  echo "[$(date -u +%T)] $*"
}

type="${1:?usage: update.sh hourly|daily|weekly}"
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

exec 9>"$HOME/.leaderboard-update.lock"
flock 9

cd "$repo"
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'

step "Fetching the latest checkout"
git rebase --abort 2>/dev/null || rm -rf .git/rebase-merge .git/rebase-apply
git fetch --depth 1 origin master
git reset --hard origin/master
git clean -fd
step "Checking dependencies"
lock="$(sha256sum package-lock.json | cut -d' ' -f1)"
if [ ! -d node_modules ] || [ "$(cat node_modules/.lock-sha 2>/dev/null)" != "$lock" ]; then
  npm clean-install --omit=dev --prefer-offline --no-audit --no-fund
  echo "$lock" > node_modules/.lock-sha
fi
step "Running the $type update"
node --env-file="$HOME/.config/leaderboard.env" src/index.js "$type"

step "Checking for changes"
git add -A
if git diff --cached --quiet; then
  step "Nothing to commit"
  exit 0
fi

label="$(tr '[:lower:]' '[:upper:]' <<<"${type:0:1}")${type:1}"
step "Committing"
git commit -q -m "chore: $label Update"
for attempt in 1 2 3; do
  step "Pushing (attempt $attempt)"
  git pull --rebase && git push && step "Pushed" && exit 0
  git rebase --abort 2>/dev/null || true
  sleep $((attempt * 15))
done
exit 1
