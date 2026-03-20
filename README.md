# Zcash Payment Links

Send ZEC to anyone via shareable URLs. No address exchange needed — just send a link.

Built on [ZIP-324: URI-Encapsulated Payments](https://zips.z.cash/zip-0324), with full in-browser claiming powered by [WebZjs](https://github.com/ChainSafe/WebZjs).

## How It Works

```
Alice (Sender)                            Bob (Recipient)
  │                                         │
  │  1. Create payment link                 │
  │  2. Fund ephemeral wallet via Zodl      │
  │                                         │
  │  ─── sends link via Signal/SMS/etc ──>  │
  │                                         │
  │              3. Click link              │
  │              4. Wallet syncs in-browser  │
  │              5. Enter Zodl address       │
  │              6. Funds swept to address   │
  │                                         │
```

1. **Sender** enters an amount and description
2. App generates a BIP-39 seed phrase and encodes it in the payment link
3. Sender funds the ephemeral wallet (using Zodl or any Zcash wallet)
4. Sender shares the link via any messaging app
5. **Recipient** clicks the link — the browser loads a Zcash WASM wallet
6. Recipient enters their Zodl address, and funds are swept directly to them

Everything happens client-side. The seed phrase is never sent to any server.

## Architecture

The claim page loads [ChainSafe WebZjs](https://github.com/ChainSafe/WebZjs), a full Zcash wallet compiled to WebAssembly. It connects to a lightwalletd proxy to sync the blockchain, finds the funded notes, creates a shielded transaction (with zk-SNARK proof generation), and broadcasts it — all in the browser.

### Payment Link Format

```
https://example.com/claim?gift=eyJzZWVkIjoiLi4uIiwiYmly...
```

The `gift` parameter is a base64-encoded JSON payload:

```json
{
  "seed": "24-word BIP-39 mnemonic",
  "birthday": 3277800,
  "amount": "0.1",
  "desc": "Welcome to Zodl!"
}
```

### Claim Flow (In-Browser)

1. Decode seed + birthday from URL
2. Initialize WebZjs WASM (~60 MB, cached after first load)
3. Create wallet from seed, sync from birthday block
4. Display spendable balance
5. User enters recipient address
6. `propose_transfer` → `create_proposed_transactions` → `send_authorized_transactions`

## Project Structure

```
src/
├── lib/
│   ├── gift.ts         # Gift payload encoding/decoding
│   ├── wallet.ts       # WebZjs WASM loader and wallet helpers
│   ├── types.ts        # Network, PaymentParams types
│   ├── keys.ts         # Ephemeral key generation (Bech32)
│   └── zip324.ts       # ZIP-324 canonical URI building/parsing
├── app/
│   ├── layout.tsx      # App shell
│   ├── page.tsx        # Create payment link
│   ├── globals.css     # Zcash-themed dark UI
│   └── claim/
│       └── page.tsx    # Claim page (WebZjs in-browser sweep)
public/
└── wasm/
    ├── wallet/         # WebZjs wallet WASM (~60 MB)
    └── keys/           # WebZjs keys WASM (~2 MB)
```

## Setup

### Prerequisites

- Node.js 18+
- Rust nightly (for building WebZjs WASM)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)

### Build WebZjs WASM

```bash
./scripts/build-wasm.sh
```

This clones WebZjs, builds the WASM packages, and copies them to `public/wasm/`.

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## End-to-End Flow with Zodl

1. **Create**: Go to the app, enter amount + description, click "Generate Payment Link"
2. **Fund**: Copy the seed phrase, import it into a Zcash wallet to get the address, send ZEC to it from Zodl
3. **Share**: Copy the payment link and send it via any messaging app
4. **Claim**: Recipient opens the link, enters their Zodl address, clicks "Claim Funds"
5. **Done**: Funds are swept to the recipient's Zodl wallet via an in-browser shielded transaction

## ZIP-324 Compliance

This implementation follows ZIP-324's core concepts:
- Ephemeral wallet keys encoded in shareable URIs
- Funds are swept ("finalized") to the recipient's address
- Key material stays client-side (never sent to a server)
- On-chain footprint is indistinguishable from normal shielded transactions

The canonical ZIP-324 URI library (`src/lib/zip324.ts`) is also included for reference.

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [WebZjs](https://github.com/ChainSafe/WebZjs) (Zcash WASM wallet)
- [@scure/bip39](https://github.com/paulmillr/scure-bip39) for seed generation

## License

MIT
