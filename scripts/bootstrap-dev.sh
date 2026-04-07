#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v corepack >/dev/null 2>&1; then
  echo 'corepack is required (Node.js >= 18).' >&2
  exit 1
fi

if ! corepack pnpm --version >/dev/null 2>&1; then
  corepack prepare pnpm@9.15.4 --activate
fi

if ! command -v rustc >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
  # shellcheck disable=SC1090
  . "$HOME/.cargo/env"
fi

if [[ "$(uname -s)" == "Linux" ]] && command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y \
    libssl-dev \
    libgtk-3-dev \
    libjavascriptcoregtk-4.1-dev \
    libwebkit2gtk-4.1-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    patchelf \
    libxdo-dev \
    libsoup2.4-dev
fi

corepack pnpm install
corepack pnpm exec playwright install chromium

echo 'Bootstrap complete.'
echo 'On Ubuntu 24.04+, run native cargo commands through scripts/cargo-linux.sh to reuse the WebKit pkg-config compatibility wrapper.'
