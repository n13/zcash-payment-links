"use client";

import { useState } from "react";
import { generateEphemeralKey, encodeKey } from "@/lib/keys";
import { buildFragment, buildCanonicalURI } from "@/lib/zip324";
import type { Network } from "@/lib/types";

interface Result {
  webUrl: string;
  canonicalUri: string;
  message: string;
  amount: string;
  desc?: string;
}

const INPUT =
  "w-full bg-surface border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow";

export default function Home() {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [network, setNetwork] = useState<Network>("mainnet");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const testnet = network === "testnet";
  const coin = testnet ? "TAZ" : "ZEC";
  const valid = /^\d+(\.\d{1,8})?$/.test(amount) && parseFloat(amount) > 0;

  function create() {
    const key = encodeKey(generateEphemeralKey());
    const params = { amount, key, desc: desc || undefined };
    const fragment = buildFragment(params) + (testnet ? "&net=test" : "");
    const webUrl = `${window.location.origin}/claim#${fragment}`;
    const canonicalUri = buildCanonicalURI(params, network);
    const message = [
      `You received ${amount} ${coin}${desc ? ` — ${desc}` : ""}!`,
      `Claim it here: ${webUrl}`,
      "",
      "Don't have a wallet? Get Zodl: https://zodl.com",
    ].join("\n");
    setResult({ webUrl, canonicalUri, message, amount, desc: desc || undefined });
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  function reset() {
    setResult(null);
    setAmount("");
    setDesc("");
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={testnet}
                onChange={(e) =>
                  setNetwork(e.target.checked ? "testnet" : "mainnet")
                }
                className="accent-accent"
              />
              <span className="text-muted">
                Testnet mode{testnet && " (TAZ)"}
              </span>
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
                {result.amount} <span className="text-accent">{coin}</span>
              </p>
              {result.desc && <p className="text-muted mt-1">{result.desc}</p>}
            </div>

            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-sm text-muted mb-2">Shareable link</p>
              <p className="font-mono text-xs break-all text-foreground/70 leading-relaxed">
                {result.webUrl}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => copy(result.webUrl, "link")}
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

            <details className="text-xs text-muted">
              <summary className="cursor-pointer hover:text-foreground transition-colors">
                ZIP-324 canonical URI
              </summary>
              <p className="font-mono mt-2 break-all leading-relaxed bg-background rounded-lg p-3 border border-border">
                {result.canonicalUri}
              </p>
            </details>

            <button
              onClick={reset}
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
