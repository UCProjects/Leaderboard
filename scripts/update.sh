#!/usr/bin/env bash
export PATH="$HOME/node/bin:$PATH"
set -euo pipefail

type="${1:?usage: update.sh hourly|daily|weekly}"
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

exec 9>"$HOME/.leaderboard-update.lock"
flock 9

cd "$repo"
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'

git fetch --depth 1 origin master
git reset --hard origin/master
git clean -fd
npm clean-install --omit=dev --prefer-offline --no-audit --no-fund
node --env-file="$HOME/.config/leaderboard.env" src/index.js "$type"

git add -A
if git diff --cached --quiet; then
  echo 'Nothing to commit'
  exit 0
fi

label="$(tr '[:lower:]' '[:upper:]' <<<"${type:0:1}")${type:1}"
git commit -m "chore: $label Update"
for attempt in 1 2 3; do
  git pull --rebase && git push && exit 0
  sleep $((attempt * 15))
done
exit 1
