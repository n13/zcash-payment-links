export interface GiftPayload {
  seed: string;
  birthday: number;
  amount?: string;
  desc?: string;
}

export function encodeGift(payload: GiftPayload): string {
  return btoa(JSON.stringify(payload));
}

export function decodeGift(encoded: string): GiftPayload | null {
  try {
    const json = JSON.parse(atob(encoded));
    if (!json.seed || typeof json.birthday !== "number") return null;
    return json as GiftPayload;
  } catch {
    return null;
  }
}

export function buildGiftUrl(origin: string, payload: GiftPayload): string {
  return `${origin}/claim?gift=${encodeGift(payload)}`;
}
