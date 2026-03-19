"use client";

import { useEffect, useState } from "react";
import { parseFragment, buildCanonicalURI } from "@/lib/zip324";
import type { Network, PaymentParams } from "@/lib/types";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; payment: PaymentParams; zodlUri: string; testnet: boolean };

export default function ClaimPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return setState({ status: "error" });
    const payment = parseFragment(hash);
    if (!payment) return setState({ status: "error" });
    const net: Network = new URLSearchParams(hash).get("net") === "test" ? "testnet" : "mainnet";
    setState({
      status: "ready",
      payment,
      zodlUri: buildCanonicalURI(payment, net),
      testnet: net === "testnet",
    });
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted animate-pulse">Loading payment...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Invalid Payment Link</h1>
          <p className="text-muted">
            This link doesn&apos;t contain a valid Zcash payment.
          </p>
        </div>
      </div>
    );
  }

  const { payment, zodlUri, testnet } = state;
  const coin = testnet ? "TAZ" : "ZEC";

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {testnet && (
            <span className="inline-block text-xs font-mono bg-accent/20 text-accent px-2 py-0.5 rounded mb-3">
              TESTNET
            </span>
          )}
          <p className="text-muted text-sm mb-3">You received a Zcash payment</p>
          <p className="text-5xl font-bold tracking-tight">
            {payment.amount} <span className="text-accent">{coin}</span>
          </p>
          {payment.desc && (
            <p className="text-muted text-lg mt-3">
              &ldquo;{payment.desc}&rdquo;
            </p>
          )}
        </div>

        <a
          href={zodlUri}
          className="block w-full text-center bg-accent text-black font-semibold rounded-xl px-4 py-3.5 hover:bg-accent-hover transition-colors mb-3"
        >
          Open in Zodl
        </a>
        <a
          href="https://zodl.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-surface border border-border font-medium rounded-xl px-4 py-3 hover:bg-surface-hover transition-colors mb-6"
        >
          Get Zodl Wallet
        </a>

        <div className="bg-surface border border-border rounded-xl p-4 text-sm text-muted space-y-2">
          <p>
            <strong className="text-foreground/80">How it works:</strong> This
            link contains a private spending key for an ephemeral Zcash address
            holding the funds. Open it in Zodl to finalize the payment into your
            wallet.
          </p>
          <p className="text-xs">
            Your key never leaves this browser &mdash; the data after # is not
            sent to any server.
          </p>
        </div>
      </div>
    </div>
  );
}
