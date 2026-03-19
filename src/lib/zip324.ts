import type { Network, PaymentParams } from "./types";

const HOSTS: Record<Network, string> = {
  mainnet: "pay.withzcash.com",
  testnet: "pay.testzcash.com",
};
const PORT = "65536";
const PATH = "/payment/v1";

export function buildFragment(params: PaymentParams): string {
  const parts = [`amount=${params.amount}`];
  if (params.desc) parts.push(`desc=${encodeURIComponent(params.desc)}`);
  parts.push(`key=${params.key}`);
  return parts.join("&");
}

export function buildCanonicalURI(
  params: PaymentParams,
  network: Network = "mainnet",
): string {
  return `https://${HOSTS[network]}:${PORT}${PATH}#${buildFragment(params)}`;
}

export function parseFragment(fragment: string): PaymentParams | null {
  const p = new URLSearchParams(fragment);
  const amount = p.get("amount");
  const key = p.get("key");
  if (!amount || !key || !isValidAmount(amount)) return null;
  return { amount, key, desc: p.get("desc") || undefined };
}

export function parseCanonicalURI(
  uri: string,
): { params: PaymentParams; network: Network } | null {
  try {
    const url = new URL(uri);
    if (url.protocol !== "https:") return null;
    const network = (Object.entries(HOSTS) as [Network, string][]).find(
      ([, host]) => url.hostname === host,
    )?.[0];
    if (!network || url.port !== PORT || url.pathname !== PATH) return null;
    const params = parseFragment(url.hash.slice(1));
    return params ? { params, network } : null;
  } catch {
    return null;
  }
}

function isValidAmount(s: string): boolean {
  return /^\d+(\.\d{1,8})?$/.test(s) && parseFloat(s) > 0;
}
