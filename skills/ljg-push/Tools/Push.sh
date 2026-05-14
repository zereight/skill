#!/usr/bin/env bash
set -euo pipefail

git status --short
git remote -v
git branch --show-current

echo "Review the status above before syncing or pushing ljg skills."
