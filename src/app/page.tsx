"use client";

import { useState } from "react";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { buildGiftUrl, type GiftPayload } from "@/lib/gift";

const INPUT =
  "w-full bg-surface border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow";

const CURRENT_HEIGHT = 3_277_800;

export default function Home() {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [result, setResult] = useState<{
    giftUrl: string;
    message: string;
    seed: string;
    payload: GiftPayload;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const valid = /^\d+(\.\d{1,8})?$/.test(amount) && parseFloat(amount) > 0;

  function create() {
    const seed = generateMnemonic(wordlist, 256);
    const payload: GiftPayload = {
      seed,
      birthday: CURRENT_HEIGHT,
      amount: amount || undefined,
      desc: desc || undefined,
    };
    const giftUrl = buildGiftUrl(window.location.origin, payload);
    const message = [
      `You received ${amount} ZEC${desc ? ` — ${desc}` : ""}!`,
      `Claim it here: ${giftUrl}`,
      "",
      "Don't have a wallet? Get Zodl: https://zodl.com",
    ].join("\n");
    setResult({ giftUrl, message, seed, payload });
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-1">Create Payment Link</h1>
        <p className="text-muted mb-8">Send ZEC to anyone with a shareable URL</p>

        {!result ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) create();
            }}
            className="space-y-4"
          >
            <label className="block">
              <span className="text-sm font-medium text-foreground/80 block mb-1">
                Amount (ZEC)
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.1"
                className={INPUT}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground/80 block mb-1">
                Description{" "}
                <span className="text-muted font-normal">(optional)</span>
              </span>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Welcome to Zodl!"
                className={INPUT}
              />
            </label>
            <button
              type="submit"
              disabled={!valid}
              className="w-full bg-accent text-black font-semibold rounded-xl px-4 py-3 hover:bg-accent-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Generate Payment Link
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-sm text-muted mb-1">Payment amount</p>
              <p className="text-3xl font-bold">
                {amount} <span className="text-accent">ZEC</span>
              </p>
              {desc && <p className="text-muted mt-1">{desc}</p>}
            </div>

            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-sm font-medium text-foreground/80 mb-2">
                Step 1: Fund the payment wallet
              </p>
              <p className="text-sm text-muted mb-3">
                Open Zodl and send {amount} ZEC to the wallet derived from this
                seed phrase. The recipient will use this link to claim the funds.
              </p>
              <div className="bg-background rounded-lg p-3 font-mono text-xs leading-relaxed break-all text-accent/80 select-all">
                {result.seed}
              </div>
              <button
                onClick={() => copy(result.seed, "seed")}
                className="mt-2 text-xs text-muted hover:text-foreground transition-colors"
              >
                {copied === "seed" ? "Copied!" : "Copy seed phrase"}
              </button>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-sm font-medium text-foreground/80 mb-2">
                Step 2: Share the payment link
              </p>
              <p className="font-mono text-xs break-all text-foreground/70 leading-relaxed">
                {result.giftUrl}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => copy(result.giftUrl, "link")}
                className="bg-accent text-black font-semibold rounded-xl px-4 py-3 hover:bg-accent-hover transition-colors"
              >
                {copied === "link" ? "Copied!" : "Copy Link"}
              </button>
              <button
                onClick={() => copy(result.message, "msg")}
                className="bg-surface border border-border font-medium rounded-xl px-4 py-3 hover:bg-surface-hover transition-colors"
              >
                {copied === "msg" ? "Copied!" : "Copy Message"}
              </button>
            </div>

            <button
              onClick={() => {
                setResult(null);
                setAmount("");
                setDesc("");
              }}
              className="w-full text-sm text-muted hover:text-foreground transition-colors py-2"
            >
              Create another payment link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
