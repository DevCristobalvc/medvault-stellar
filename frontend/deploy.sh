#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env.local ]; then
  echo "Missing .env.local" >&2
  exit 1
fi

get() {
  grep -E "^$1=" .env.local | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | tr -d '\n\r'
}

export VITE_PINATA_JWT="$(get VITE_PINATA_JWT)"
export VITE_CONTRACT_ID="$(get VITE_CONTRACT_ID)"
export VITE_SOROBAN_RPC="$(get VITE_SOROBAN_RPC)"
export VITE_PINATA_GATEWAY="$(get VITE_PINATA_GATEWAY)"
export VITE_WALLETCONNECT_PROJECT_ID="$(get VITE_WALLETCONNECT_PROJECT_ID)"

vercel build --prod --yes
vercel deploy --prebuilt --prod --yes
