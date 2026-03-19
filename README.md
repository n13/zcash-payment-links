# Zcash Payment Links (ZIP-324)

Send ZEC to anyone via shareable URLs. No address exchange needed — just send a link.

Built on [ZIP-324: URI-Encapsulated Payments](https://zips.z.cash/zip-0324).

## How It Works

```
Alice                          Bob
  |                              |
  |  1. Create payment link      |
  |  2. Fund ephemeral address   |
  |                              |
  |  --- sends link via SMS ---> |
  |                              |
  |       3. Click link          |
  |       4. See payment details |
  |       5. Open in Zodl        |
  |       6. Finalize payment    |
  |                              |
```

1. **Sender** enters an amount and optional description
2. App generates an ephemeral 256-bit key, encodes it in Bech32, and builds a ZIP-324 URI
3. Sender shares the link via any messaging app (Signal, WhatsApp, SMS, etc.)
4. **Recipient** clicks the link and sees the payment details
5. Recipient taps "Open in Zodl" to finalize the payment into their wallet

The private key is encoded in the URL **fragment** (after `#`) and is never sent to any server.

## ZIP-324 URI Format

```
https://pay.withzcash.com:65536/payment/v1#amount=0.1&desc=Welcome&key=zkey1...
```

| Component | Value | Purpose |
|-----------|-------|---------|
| Scheme | `https` | Enables Universal Links / App Links |
| Host | `pay.withzcash.com` | Applink domain for wallet whitelisting |
| Port | `65536` | Intentionally invalid — prevents network requests |
| Path | `/payment/v1` | Version identifier |
| Fragment | `amount`, `desc`, `key` | Payment params (never sent to server) |

For testnet, substitute `pay.testzcash.com` and `TAZ` for `ZEC`.

## Project Structure

```
src/
├── lib/
│   ├── types.ts        # Network, PaymentParams types
│   ├── keys.ts         # Ephemeral key generation, Bech32 encoding
│   └── zip324.ts       # ZIP-324 URI building and parsing
└── app/
    ├── layout.tsx       # App shell with header
    ├── page.tsx         # Create payment link form
    ├── globals.css      # Zcash-themed dark UI
    └── claim/
        └── page.tsx     # Claim page (client-side only)
```

## Core Library

### `zip324.ts`

```typescript
import { buildFragment, buildCanonicalURI, parseFragment, parseCanonicalURI } from "@/lib/zip324";

// Build a ZIP-324 URI
const uri = buildCanonicalURI({ amount: "0.1", key: "zkey1...", desc: "Welcome" });

// Parse a fragment from a claim URL
const params = parseFragment("amount=0.1&key=zkey1...&desc=Welcome");
```

### `keys.ts`

```typescript
import { generateEphemeralKey, encodeKey, decodeKey } from "@/lib/keys";

const key = generateEphemeralKey();   // 256-bit random Uint8Array
const encoded = encodeKey(key);       // Bech32: "zkey1..."
const decoded = decodeKey(encoded);   // Back to Uint8Array
```

## Zodl Integration

The claim page constructs a canonical ZIP-324 URI for the "Open in Zodl" button. On iOS/macOS with Zodl installed, clicking triggers [Universal Links](https://developer.apple.com/documentation/uikit/inter-process_communication/allowing_apps_and_websites_to_link_to_your_content) to open Zodl directly.

For Zodl to handle these links, it would need:
1. Register `pay.withzcash.com` in its Associated Domains entitlement
2. Handle the URI fragment to extract payment params
3. Use the embedded key to locate and spend the ephemeral note

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to create payment links, or visit a claim URL like:

```
http://localhost:3000/claim#amount=0.1&desc=Welcome+to+Zodl!&key=zkey1...
```

## Testnet

Toggle "Testnet mode" on the create page to generate testnet payment links. Testnet links use `pay.testzcash.com` in the canonical URI and display TAZ instead of ZEC.

To test with real testnet funds:

```bash
# Fund the ephemeral address derived from the payment key
zcash-cli -testnet z_sendmany "FROM_ADDRESS" '[{"address": "EPHEMERAL_ADDRESS", "amount": 0.10001}]'

# Verify the note exists
zcash-cli -testnet z_listunspent

# Sweep funds to recipient (finalization)
zcash-cli -testnet z_sendmany "EPHEMERAL_ADDRESS" '[{"address": "RECIPIENT_ADDRESS", "amount": 0.1}]'
```

Get testnet TAZ from the [Zecpages faucet](https://faucet.zecpages.com/).

## Full Lifecycle (ZIP-324)

| Stage | Description |
|-------|-------------|
| **Generate** | Create ephemeral key, fund address, build URI |
| **Transmit** | Share URI via secure messaging channel |
| **Render** | Recipient sees payment amount and description |
| **Verify** | Wallet checks note exists and is unspent on-chain |
| **Finalize** | Recipient sweeps funds to their own address |
| **Cancel** | Sender can reclaim unfinalized funds |

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [bech32](https://www.npmjs.com/package/bech32) for key encoding
- [@noble/hashes](https://www.npmjs.com/package/@noble/hashes) for BLAKE2b (ZIP-32 key derivation)

## License

MIT — matching [ZIP-324](https://zips.z.cash/zip-0324).
