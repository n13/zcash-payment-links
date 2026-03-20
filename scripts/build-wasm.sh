#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="/tmp/webzjs-build"

echo "==> Checking prerequisites..."
command -v rustup >/dev/null || { echo "Error: rustup not found. Install Rust: https://rustup.rs"; exit 1; }
command -v wasm-pack >/dev/null || { echo "Error: wasm-pack not found. Install: https://rustwasm.github.io/wasm-pack/installer/"; exit 1; }
command -v just >/dev/null || { echo "Installing just..."; cargo install just; }

echo "==> Cloning WebZjs..."
rm -rf "$BUILD_DIR"
git clone --depth 1 https://github.com/ChainSafe/WebZjs.git "$BUILD_DIR"

cd "$BUILD_DIR"

TOOLCHAIN=$(grep 'channel' rust-toolchain.toml | sed 's/.*"\(.*\)"/\1/')
echo "==> Installing Rust toolchain: $TOOLCHAIN"
rustup install "$TOOLCHAIN"
rustup target add wasm32-unknown-unknown --toolchain "$TOOLCHAIN"
rustup component add rust-src --toolchain "$TOOLCHAIN"

echo "==> Installing wasm-bindgen-cli..."
WBVER=$(grep 'wasm-bindgen = ' crates/webzjs-wallet/Cargo.toml | head -1 | sed 's/.*"\(.*\)"/\1/')
cargo install wasm-bindgen-cli --version "$WBVER" --locked 2>/dev/null || true

echo "==> Building WebZjs wallet WASM..."
just build-wallet

echo "==> Building WebZjs keys WASM..."
just build-keys

echo "==> Copying to project..."
mkdir -p "$PROJECT_DIR/public/wasm/wallet" "$PROJECT_DIR/public/wasm/keys"
cp -r "$BUILD_DIR/packages/webzjs-wallet/"* "$PROJECT_DIR/public/wasm/wallet/"
cp -r "$BUILD_DIR/packages/webzjs-keys/"* "$PROJECT_DIR/public/wasm/keys/"

echo "==> Done! WASM packages installed to public/wasm/"
echo "    wallet: $(du -sh "$PROJECT_DIR/public/wasm/wallet/" | cut -f1)"
echo "    keys:   $(du -sh "$PROJECT_DIR/public/wasm/keys/" | cut -f1)"
