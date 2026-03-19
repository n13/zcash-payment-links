import { bech32 } from "bech32";

const HRP = "zkey";
const LIMIT = 90;

export function generateEphemeralKey(): Uint8Array {
  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  return key;
}

export function encodeKey(key: Uint8Array): string {
  return bech32.encode(HRP, bech32.toWords(key), LIMIT);
}

export function decodeKey(encoded: string): Uint8Array {
  const { words } = bech32.decode(encoded, LIMIT);
  return new Uint8Array(bech32.fromWords(words));
}
