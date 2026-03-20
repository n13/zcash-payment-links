export type WebZjsModule = {
  default: () => Promise<void>;
  initThreadPool: (threads: number) => Promise<void>;
  WebWallet: new (
    network: string,
    lightwalletdUrl: string,
    minConfTrusted: number,
    minConfUntrusted: number,
    dbBytes: Uint8Array | null,
  ) => WalletInstance;
  generate_seed_phrase: () => string;
};

export type WalletInstance = {
  create_account: (
    name: string,
    seed: string,
    hdIndex: number,
    birthday?: number,
  ) => Promise<number>;
  sync: () => Promise<void>;
  get_wallet_summary: () => Promise<WalletSummary | null>;
  get_current_address: (accountId: number) => Promise<string>;
  propose_transfer: (
    accountId: number,
    toAddress: string,
    value: bigint,
  ) => Promise<unknown>;
  create_proposed_transactions: (
    proposal: unknown,
    seed: string,
    hdIndex: number,
  ) => Promise<Uint8Array>;
  send_authorized_transactions: (txids: Uint8Array) => Promise<void>;
  free: () => void;
};

export type WalletSummary = {
  account_balances: [number, { sapling_balance: { spendable_value: bigint } }][];
  fully_scanned_height?: bigint;
};

const LIGHTWALLETD_PROXY = "https://zcash-mainnet.chainsafe.dev";

let _module: WebZjsModule | null = null;

export async function loadWalletWasm(): Promise<WebZjsModule> {
  if (_module) return _module;
  _module = await (Function('return import("/wasm/wallet/webzjs_wallet.js")')() as Promise<WebZjsModule>);
  await _module.default();
  const threads = navigator.hardwareConcurrency || 4;
  await _module.initThreadPool(threads);
  return _module;
}

export function createWallet(
  mod: WebZjsModule,
  network: "main" | "test" = "main",
): WalletInstance {
  const url =
    network === "test"
      ? "https://zcash-testnet.chainsafe.dev"
      : LIGHTWALLETD_PROXY;
  return new mod.WebWallet(network, url, 1, 1, null);
}

export function zatoshisToZec(zatoshis: bigint): string {
  const whole = zatoshis / 100_000_000n;
  const frac = (zatoshis % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

export function zecToZatoshis(zec: string): bigint {
  const [whole, frac = ""] = zec.split(".");
  const paddedFrac = frac.padEnd(8, "0").slice(0, 8);
  return BigInt(whole) * 100_000_000n + BigInt(paddedFrac);
}
