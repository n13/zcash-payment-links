"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { decodeGift, type GiftPayload } from "@/lib/gift";
import {
  loadWalletWasm,
  createWallet,
  zatoshisToZec,
  zecToZatoshis,
  type WalletInstance,
  type WebZjsModule,
} from "@/lib/wallet";

const INPUT =
  "w-full bg-surface border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow";

type Phase =
  | { step: "loading" }
  | { step: "error"; message: string }
  | { step: "init-wasm"; gift: GiftPayload }
  | { step: "syncing"; gift: GiftPayload; progress: string }
  | { step: "ready"; gift: GiftPayload; balance: string; balanceZatoshis: bigint }
  | { step: "sweeping"; gift: GiftPayload }
  | { step: "done"; txid: string }
  | { step: "no-funds"; gift: GiftPayload };

export default function ClaimPage() {
  const [phase, setPhase] = useState<Phase>({ step: "loading" });
  const [address, setAddress] = useState("");
  const walletRef = useRef<WalletInstance | null>(null);
  const modRef = useRef<WebZjsModule | null>(null);
  const accountIdRef = useRef<number>(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const giftParam = params.get("gift");
    if (!giftParam) return setPhase({ step: "error", message: "No payment link found" });
    const gift = decodeGift(giftParam);
    if (!gift) return setPhase({ step: "error", message: "Invalid payment link" });
    setPhase({ step: "init-wasm", gift });
  }, []);

  const initAndSync = useCallback(async (gift: GiftPayload) => {
    try {
      setPhase({ step: "syncing", gift, progress: "Loading wallet engine..." });
      const mod = await loadWalletWasm();
      modRef.current = mod;

      setPhase({ step: "syncing", gift, progress: "Connecting to Zcash network..." });
      const wallet = createWallet(mod);
      walletRef.current = wallet;

      setPhase({ step: "syncing", gift, progress: "Importing seed and scanning blockchain..." });
      const accountId = await wallet.create_account(
        "gift",
        gift.seed,
        0,
        gift.birthday,
      );
      accountIdRef.current = accountId;

      await wallet.sync();

      const summary = await wallet.get_wallet_summary();
      const acctBalance = summary?.account_balances?.find(([id]) => id === accountId);
      const spendable = acctBalance?.[1]?.sapling_balance?.spendable_value ?? 0n;

      if (spendable > 0n) {
        setPhase({
          step: "ready",
          gift,
          balance: zatoshisToZec(spendable),
          balanceZatoshis: spendable,
        });
      } else {
        setPhase({ step: "no-funds", gift });
      }
    } catch (err) {
      console.error("Claim error:", err);
      setPhase({ step: "error", message: String(err) });
    }
  }, []);

  useEffect(() => {
    if (phase.step === "init-wasm") initAndSync(phase.gift);
  }, [phase, initAndSync]);

  const sweep = useCallback(async () => {
    if (phase.step !== "ready" || !walletRef.current) return;
    const wallet = walletRef.current;
    const { gift, balanceZatoshis } = phase;
    setPhase({ step: "sweeping", gift });

    try {
      const fee = 10_000n; // 0.0001 ZEC standard fee
      const sendAmount = balanceZatoshis - fee;
      if (sendAmount <= 0n) {
        setPhase({ step: "error", message: "Balance too low to cover the transaction fee" });
        return;
      }

      const proposal = await wallet.propose_transfer(
        accountIdRef.current,
        address,
        sendAmount,
      );
      const txids = await wallet.create_proposed_transactions(
        proposal,
        gift.seed,
        0,
      );
      await wallet.send_authorized_transactions(txids);

      setPhase({ step: "done", txid: "Transaction sent successfully" });
    } catch (err) {
      console.error("Sweep error:", err);
      setPhase({ step: "error", message: `Transfer failed: ${err}` });
    }
  }, [phase, address]);

  if (phase.step === "loading") {
    return <CenteredCard><Spinner text="Loading..." /></CenteredCard>;
  }

  if (phase.step === "error") {
    return (
      <CenteredCard>
        <p className="text-red-400 text-sm">{phase.message}</p>
        <a href="/" className="text-accent text-sm mt-4 block hover:underline">
          Back to home
        </a>
      </CenteredCard>
    );
  }

  if (phase.step === "init-wasm" || phase.step === "syncing") {
    const gift = phase.step === "syncing" ? phase.gift : phase.gift;
    return (
      <CenteredCard>
        {gift.amount && (
          <p className="text-4xl font-bold mb-2">
            {gift.amount} <span className="text-accent">ZEC</span>
          </p>
        )}
        {gift.desc && <p className="text-muted mb-4">&ldquo;{gift.desc}&rdquo;</p>}
        <Spinner
          text={phase.step === "syncing" ? phase.progress : "Initializing..."}
        />
        <p className="text-xs text-muted/50 mt-4">
          First-time load downloads the Zcash proving engine (~60 MB)
        </p>
      </CenteredCard>
    );
  }

  if (phase.step === "no-funds") {
    return (
      <CenteredCard>
        <p className="text-xl font-bold mb-2">No funds found</p>
        {phase.gift.amount && (
          <p className="text-muted text-sm mb-1">
            Expected {phase.gift.amount} ZEC
          </p>
        )}
        <p className="text-muted text-sm">
          The payment may not have been funded yet, or the funds have already been
          claimed.
        </p>
      </CenteredCard>
    );
  }

  if (phase.step === "ready") {
    const validAddr = address.startsWith("u1") || address.startsWith("zs") || address.startsWith("t1");
    return (
      <CenteredCard>
        <p className="text-muted text-sm mb-3">You received a Zcash payment</p>
        <p className="text-5xl font-bold tracking-tight mb-1">
          {phase.balance} <span className="text-accent">ZEC</span>
        </p>
        {phase.gift.desc && (
          <p className="text-muted text-lg mt-2 mb-6">
            &ldquo;{phase.gift.desc}&rdquo;
          </p>
        )}

        <div className="w-full space-y-4 mt-6">
          <label className="block">
            <span className="text-sm font-medium text-foreground/80 block mb-1">
              Your Zcash address
            </span>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="u1... or zs1... or t1..."
              className={INPUT}
            />
            <span className="text-xs text-muted mt-1 block">
              Enter your Zodl wallet address to receive the funds
            </span>
          </label>
          <button
            onClick={sweep}
            disabled={!validAddr}
            className="w-full bg-accent text-black font-semibold rounded-xl px-4 py-3 hover:bg-accent-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Claim Funds
          </button>
        </div>
      </CenteredCard>
    );
  }

  if (phase.step === "sweeping") {
    return (
      <CenteredCard>
        <Spinner text="Creating shielded transaction and sending funds..." />
        <p className="text-xs text-muted/50 mt-4">
          Generating zero-knowledge proof — this may take 30-60 seconds
        </p>
      </CenteredCard>
    );
  }

  if (phase.step === "done") {
    return (
      <CenteredCard>
        <p className="text-2xl font-bold text-accent mb-2">Funds claimed!</p>
        <p className="text-muted text-sm">
          Your ZEC is on its way. It may take a few minutes for the transaction
          to be confirmed on the Zcash network.
        </p>
        <a
          href="/"
          className="inline-block mt-6 text-sm text-accent hover:underline"
        >
          Create your own payment link
        </a>
      </CenteredCard>
    );
  }

  return null;
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">{children}</div>
    </div>
  );
}

function Spinner({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}
