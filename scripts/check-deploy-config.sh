#!/usr/bin/env bash
# Refuses to deploy while wrangler.toml still has unfilled REPLACE_WITH_*
# placeholders for the target environment, or when staging and production point
# at the same Hyperdrive config (the mistake reNudge had to unpick by hand).
#
#   bash scripts/check-deploy-config.sh staging|production
set -euo pipefail

env="${1:?usage: check-deploy-config.sh staging|production}"
case "$env" in staging|production) ;; *) echo "unknown environment: $env" >&2; exit 2;; esac

# Only the lines that belong to this environment's blocks.
section=$(awk -v env="$env" '
  /^\[/ { active = ($0 ~ "^\\[+env\\." env "[.\\]]") }
  active { print }
' wrangler.toml)

if grep -q 'REPLACE_WITH_' <<<"$section"; then
  echo "wrangler.toml still has placeholders for $env:" >&2
  grep -n 'REPLACE_WITH_' <<<"$section" >&2
  echo "Fill them in first: docs/setup.md" >&2
  exit 1
fi

staging_id=$(awk '/^\[\[env\.staging\.hyperdrive\]\]/{f=1} f&&/^id *=/{print $3; exit}' wrangler.toml)
production_id=$(awk '/^\[\[env\.production\.hyperdrive\]\]/{f=1} f&&/^id *=/{print $3; exit}' wrangler.toml)
if [ "$staging_id" = "$production_id" ]; then
  echo "staging and production use the same Hyperdrive id ($staging_id): they would share a database." >&2
  exit 1
fi
echo "Deploy config for $env looks complete."
