"use client";

import { useState, useEffect, useRef } from "react";
import {
  Home,
  Settings,
  Activity,
  Wallet,
  LogOut,
  Download,
  Search,
  Plus,
  X,
  ExternalLink,
  CheckCircle,
  Loader2,
  Building2,
  TrendingUp,
  Tag,
} from "lucide-react";
import { useConnect, useAccounts, useDisconnect } from "@midl/react";
import { AddressPurpose } from "@midl/core";
import { useReadContracts, usePublicClient } from "wagmi";
import { encodeFunctionData, parseEther } from "viem";
import {
  useAddTxIntention,
  useFinalizeBTCTransaction,
  useSignIntention,
} from "@midl/executor-react";
import { useWaitForTransaction } from "@midl/react";
import { BitEstateContract } from "@/lib/contracts";

// ─── Types ────────────────────────────────────────────────────────────────────

type PropertyData = {
  id: number;
  title: string;
  location: string;
  price: string;
  rawPrice: bigint;
  isSold: boolean;
  owner: string;
  image: string;
};

type TxReceipt = {
  hash: string;
  propertyId: number;
  type: "BUY" | "LIST";
  timestamp: number;
};

type PurchaseStatus =
  | "IDLE"
  | "ADDING_INTENTION"
  | "FINALIZING"
  | "SIGNING"
  | "BROADCASTING"
  | "SUCCESS";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROPERTY_IMAGES = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=800",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800",
  "https://images.unsplash.com/photo-1515263487990-61b07816bc32?q=80&w=800",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=800",
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=800",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=800",
];

// ─── List Property Modal ───────────────────────────────────────────────────────

type ListStatus = "IDLE" | "ADDING_INTENTION" | "FINALIZING" | "SIGNING" | "BROADCASTING" | "SUCCESS" | "ERROR";

const LIST_STEPS: ListStatus[] = ["ADDING_INTENTION", "FINALIZING", "SIGNING", "BROADCASTING"];

const LIST_STEP_LABELS: Record<ListStatus, string> = {
  IDLE: "List Property",
  ADDING_INTENTION: "Preparing transaction…",
  FINALIZING: "Finalizing BTC transaction…",
  SIGNING: "Sign with Xverse wallet…",
  BROADCASTING: "Broadcasting to Midl…",
  SUCCESS: "Listed!",
  ERROR: "Failed",
};

function ListPropertyModal({
  onClose,
  onSuccess,
  btcPriceUsd = 97000,
}: {
  onClose: () => void;
  onSuccess: (receipt: TxReceipt) => void;
  btcPriceUsd?: number;
}) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<ListStatus>("IDLE");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  // Use the same Midl executor flow — no wagmi writeContract (avoids StacksProvider conflict)
  const { addTxIntention, txIntentions } = useAddTxIntention();
  const { finalizeBTCTransaction, data: txData } = useFinalizeBTCTransaction();
  const { signIntentionAsync } = useSignIntention();
  const publicClient = usePublicClient();
  const { waitForTransaction } = useWaitForTransaction({
    mutation: {
      onSuccess: (data: any) => {
        const hash = data?.tx?.id || txHash;
        setTxHash(hash);
        setStatus("SUCCESS");
        onSuccess({ hash, propertyId: Date.now(), type: "LIST", timestamp: Date.now() });
      },
    },
  });

  // Ref always points at the latest txIntentions so the async signing callback
  // can read the post-sign store values without stale closure captures.
  const txIntentionsRef = useRef(txIntentions);
  useEffect(() => { txIntentionsRef.current = txIntentions; }, [txIntentions]);

  // Step 2: triggered when txData is ready after finalize
  useEffect(() => {
    if (status !== "FINALIZING" || !txData) return;

    const run = async () => {
      setStatus("SIGNING");
      try {
        // Sign each intention — signIntentionAsync mutates the store reactively.
        // We must wait a tick after all signs complete before reading the updated values.
        for (const intention of txIntentionsRef.current) {
          await signIntentionAsync({ intention, txId: txData.tx.id });
        }
        await new Promise(r => setTimeout(r, 150));

        // Read from txIntentionsRef which is kept in sync via useEffect
        const signedHexes = txIntentionsRef.current
          .map(it => it.signedEvmTransaction)
          .filter((h): h is string => typeof h === "string" && h.startsWith("0x")) as `0x${string}`[];

        if (signedHexes.length === 0) {
          throw new Error("No signed transactions found. Check wallet signing step.");
        }
        setStatus("BROADCASTING");
        await publicClient?.sendBTCTransactions({
          serializedTransactions: signedHexes,
          btcTransaction: txData.tx.hex,
        });
        setTxHash(txData.tx.id);
        waitForTransaction({ txId: txData.tx.id });
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e?.shortMessage || e?.message || "Transaction failed.");
        setStatus("ERROR");
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txData, status]);

  const handleSubmit = () => {
    if (!title.trim() || !price.trim()) {
      setErrorMsg("Title and price are required.");
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg("Enter a valid price.");
      return;
    }

    setErrorMsg("");
    setStatus("ADDING_INTENTION");

    const metadataURI = JSON.stringify({
      title: title.trim(),
      location: location.trim() || "Midl Metaverse",
    });

    const priceWei = parseEther(price);

    // Step 1: add intention for listProperty (non-payable, value = 0n)
    addTxIntention({
      reset: true,
      intention: {
        evmTransaction: {
          to: BitEstateContract.address as `0x${string}`,
          value: 0n,
          data: encodeFunctionData({
            abi: BitEstateContract.abi,
            functionName: "listProperty",
            args: [priceWei, metadataURI],
          }),
        },
      },
    });

  };

  // Reactively trigger finalize once intention is registered in the store
  useEffect(() => {
    if (status === "ADDING_INTENTION" && txIntentions.length > 0) {
      setStatus("FINALIZING");
      finalizeBTCTransaction();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txIntentions.length, status]);

  const isProcessing = status !== "IDLE" && status !== "SUCCESS" && status !== "ERROR";
  const currentStepIdx = LIST_STEPS.indexOf(status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isProcessing ? onClose : undefined}
      />
      <div className="relative w-full max-w-lg bg-[#141414] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Tag size={18} className="text-orange-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">List a Property</h2>
              <p className="text-xs text-zinc-500">Publish on the BitEstate contract</p>
            </div>
          </div>
          {!isProcessing && (
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          {status === "SUCCESS" ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Property Listed!</h3>
                <p className="text-zinc-400 text-sm">Your property is now live on the Midl network.</p>
              </div>
              {txHash && (
                <a
                  href={`https://blockscout.staging.midl.xyz/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm font-mono bg-zinc-900 px-4 py-2 rounded-lg"
                >
                  <span className="truncate max-w-[260px]">{txHash}</span>
                  <ExternalLink size={14} />
                </a>
              )}
              <button
                onClick={onClose}
                className="mt-2 px-8 py-2.5 bg-orange-500 hover:bg-orange-400 text-black font-semibold rounded-full transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
                  Property Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Beachfront Villa, Lagos"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isProcessing}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/60 text-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Victoria Island, Lagos"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isProcessing}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/60 text-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
                  Price (BTC) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={isProcessing}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 pr-20 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/60 text-sm disabled:opacity-50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-mono">
                    BTC
                  </span>
                </div>
                {price && !isNaN(parseFloat(price)) && (
                  <p className="text-xs text-zinc-600 mt-1 font-mono">
                    ≈ ${(parseFloat(price || "0") * btcPriceUsd).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} USD
                  </p>
                )}
              </div>

              {/* Contract Info */}
              <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800 space-y-2">
                <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">Contract Details</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Address</span>
                  <span className="text-xs font-mono text-zinc-300">
                    {BitEstateContract.address.slice(0, 8)}...{BitEstateContract.address.slice(-6)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Network</span>
                  <span className="text-xs text-orange-400 font-medium">Midl L2</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Function</span>
                  <span className="text-xs font-mono text-zinc-300">listProperty(price, metadataURI)</span>
                </div>
              </div>

              {/* Step progress (shown while processing) */}
              {isProcessing && (
                <div className="space-y-2">
                  {LIST_STEPS.map((step, i) => {
                    const done = i < currentStepIdx;
                    const active = i === currentStepIdx;
                    return (
                      <div key={step} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${done ? "bg-green-500" : active ? "bg-orange-500" : "bg-zinc-800"}`}>
                          {done && <CheckCircle size={14} className="text-white" />}
                          {active && <Loader2 size={14} className="text-white animate-spin" />}
                          {!done && !active && <span className="text-xs text-zinc-600">{i + 1}</span>}
                        </div>
                        <span className={`text-sm transition-colors ${done ? "text-green-400" : active ? "text-orange-300 font-medium" : "text-zinc-600"}`}>
                          {LIST_STEP_LABELS[step]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {errorMsg}
                </div>
              )}

              <button
                onClick={status === "ERROR" ? handleSubmit : handleSubmit}
                disabled={isProcessing || !title || !price}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing && (<><Loader2 size={18} className="animate-spin" />{LIST_STEP_LABELS[status]}</>)}
                {(status === "IDLE" || status === "ERROR") && (<><Tag size={18} />List Property</>)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Buy Confirmation Modal ────────────────────────────────────────────────────

function BuyModal({
  property,
  purchaseState,
  txHash,
  onConfirm,
  onClose,
  toUSD,
}: {
  property: PropertyData;
  purchaseState: PurchaseStatus;
  txHash: string;
  onConfirm: () => void;
  onClose: () => void;
  toUSD?: (btc: string) => string;
}) {
  const stateLabels: Record<PurchaseStatus, string> = {
    IDLE: "Confirm Purchase",
    ADDING_INTENTION: "Preparing transaction…",
    FINALIZING: "Finalizing BTC transaction…",
    SIGNING: "Sign with Xverse wallet…",
    BROADCASTING: "Broadcasting to Midl…",
    SUCCESS: "Purchase Complete!",
  };

  const STEPS: PurchaseStatus[] = ["ADDING_INTENTION", "FINALIZING", "SIGNING", "BROADCASTING"];
  const currentIdx = STEPS.indexOf(purchaseState);
  const isLoading = purchaseState !== "IDLE" && purchaseState !== "SUCCESS";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={purchaseState === "IDLE" ? onClose : undefined}
      />
      <div className="relative w-full max-w-md bg-[#141414] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Building2 size={18} className="text-orange-400" />
            </div>
            <div>
              <h2 className="font-bold text-white">Confirm Purchase</h2>
              <p className="text-xs text-zinc-500">Signed via Xverse wallet</p>
            </div>
          </div>
          {purchaseState === "IDLE" && (
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6">
          {purchaseState === "SUCCESS" ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Purchase Successful!</h3>
                <p className="text-zinc-400 text-sm">
                  You now own <span className="text-white font-semibold">{property.title}</span>
                </p>
              </div>
              {txHash && (
                <a
                  href={`https://blockscout.staging.midl.xyz/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm font-mono bg-zinc-900 px-4 py-2 rounded-lg"
                >
                  <span className="truncate max-w-[240px]">{txHash}</span>
                  <ExternalLink size={14} />
                </a>
              )}
              <button
                onClick={onClose}
                className="mt-2 px-8 py-2.5 bg-orange-500 hover:bg-orange-400 text-black font-semibold rounded-full transition-colors"
              >
                View Portfolio
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Property Preview */}
              <div
                className="h-36 w-full rounded-xl bg-cover bg-center relative overflow-hidden"
                style={{ backgroundImage: `url(${property.image})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <p className="font-bold text-white">{property.title}</p>
                  <p className="text-xs text-zinc-400">📍 {property.location}</p>
                </div>
              </div>

              {/* Price Summary */}
              <div className="bg-zinc-900 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Property Price</span>
                  <div className="flex flex-col items-end">
                    <span className="text-white font-bold">{property.price} BTC</span>
                    {toUSD && <span className="text-xs text-zinc-500">{toUSD(property.price)}</span>}
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Network</span>
                  <span className="text-orange-400 font-medium">Midl L2</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Contract Call</span>
                  <span className="font-mono text-zinc-300 text-xs">buyProperty({property.id})</span>
                </div>
                <div className="border-t border-zinc-800 pt-2.5 flex justify-between">
                  <span className="text-zinc-300 font-semibold">Total</span>
                  <div className="flex flex-col items-end">
                    <span className="text-orange-500 font-bold text-lg">{property.price} BTC</span>
                    {toUSD && <span className="text-xs text-zinc-500">{toUSD(property.price)}</span>}
                  </div>
                </div>
              </div>

              {/* Progress Steps */}
              {isLoading && (
                <div className="space-y-2">
                  {STEPS.map((step, i) => {
                    const done = i < currentIdx;
                    const active = i === currentIdx;
                    return (
                      <div key={step} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${done ? "bg-green-500" : active ? "bg-orange-500" : "bg-zinc-800"}`}>
                          {done && <CheckCircle size={14} className="text-white" />}
                          {active && <Loader2 size={14} className="text-white animate-spin" />}
                          {!done && !active && <span className="text-xs text-zinc-600">{i + 1}</span>}
                        </div>
                        <span className={`text-sm transition-colors ${done ? "text-green-400" : active ? "text-orange-300 font-medium" : "text-zinc-600"}`}>
                          {stateLabels[step]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Loader2 size={18} className="animate-spin" />Processing…</>
                ) : (
                  <><Wallet size={18} />Confirm &amp; Buy</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Property Card Component ──────────────────────────────────────────────────

function PropertyCard({
  property,
  isConnected,
  onBuy,
  isOwned,
  toUSD,
}: {
  property: PropertyData;
  isConnected: boolean;
  onBuy: () => void;
  isOwned?: boolean;
  toUSD?: (btc: string) => string;
}) {
  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden group hover:border-zinc-700 transition-all duration-200 hover:shadow-lg hover:shadow-black/40">
      <div
        className="h-48 w-full bg-zinc-900 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${property.image})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-4 right-4">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm ${
            isOwned
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              : property.isSold
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-green-500/20 text-green-400 border border-green-500/30"
          }`}>
            {isOwned ? "OWNED" : property.isSold ? "SOLD" : "AVAILABLE"}
          </span>
        </div>
        <div className="absolute bottom-3 left-4">
          <p className="text-xs font-mono text-zinc-400/80">ID #{property.id}</p>
        </div>
      </div>

      <div className="p-5">
        <h4 className="text-base font-bold text-white mb-1 truncate">{property.title}</h4>
        <p className="text-zinc-500 text-sm mb-4 flex items-center gap-1">📍 {property.location}</p>

        <div className="flex items-center justify-between pt-4 border-t border-zinc-800/60">
          <div className="flex flex-col" suppressHydrationWarning>
            <p className="text-xs text-zinc-500 mb-0.5">Price</p>
            <p className="text-lg font-bold text-orange-500">
              {property.price} <span className="text-sm font-normal text-zinc-400">BTC</span>
            {toUSD && toUSD(property.price) && (
              <span className="text-xs text-zinc-500 font-normal">{toUSD(property.price)}</span>
            )}
            </p>
          </div>

          {!isOwned ? (
            <button
              onClick={onBuy}
              disabled={property.isSold || !isConnected}
              title={!isConnected ? "Connect wallet to buy" : undefined}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                property.isSold
                  ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  : !isConnected
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-zinc-800 text-white hover:bg-orange-600 hover:shadow-md hover:shadow-orange-500/20"
              }`}
            >
              {property.isSold ? "Sold" : !isConnected ? "Connect" : "Buy Now"}
            </button>
          ) : (
            <span className="text-xs text-purple-400 font-semibold bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-full">
              In Portfolio
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("Marketplace");
  const [showListModal, setShowListModal] = useState(false);
  const [buyingProperty, setBuyingProperty] = useState<PropertyData | null>(null);
  const [receipts, setReceipts] = useState<TxReceipt[]>([]);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [btcPriceUsd, setBtcPriceUsd] = useState<number>(97000); // fallback price

  // Fetch live BTC/USD price on mount
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")
      .then(r => r.json())
      .then(d => { if (d?.bitcoin?.usd) setBtcPriceUsd(d.bitcoin.usd); })
      .catch(() => {}); // silently keep fallback
  }, []);

  const toUSD = (btc: string) => {
    const usd = parseFloat(btc) * btcPriceUsd;
    if (isNaN(usd) || usd === 0) return "";
    if (usd >= 1000) return `≈ $${(usd / 1000).toFixed(1)}k`;
    return `≈ $${usd.toFixed(0)}`;
  };

  // ── Wallet ──────────────────────────────────────────────────────────────────
  const { connectors, connectAsync } = useConnect({
    purposes: [AddressPurpose.Payment, AddressPurpose.Ordinals],
  });
  const { accounts, isConnected } = useAccounts();
  const { disconnect } = useDisconnect();

  const paymentAccount = accounts?.find((a) => a.purpose === AddressPurpose.Payment) || accounts?.[0];
  const walletAddress = paymentAccount?.address ?? "";
  const shortAddress = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "";

  const handleConnect = async () => {
    try {
      if (!connectors || connectors.length === 0) {
        alert("No Midl connectors found. Is the Xverse extension installed?");
        return;
      }
      const xverse = connectors.find((c: any) => c.name?.toLowerCase().includes("xverse")) || connectors[0];
      await connectAsync({ id: xverse.id });
    } catch (e: any) {
      alert("Error connecting wallet: " + e.message);
    }
  };

  const copyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  // ── Contract Reads ──────────────────────────────────────────────────────────
  const contractReads = [1, 2, 3, 4, 5, 6].map((id) => ({
    address: BitEstateContract.address as `0x${string}`,
    abi: BitEstateContract.abi,
    functionName: "properties",
    args: [BigInt(id)],
  }));

  const { data: propertiesData, isLoading, refetch } = useReadContracts({
    contracts: contractReads as any,
  });

  const parseTitle = (metadataURI: string, id: number): { title: string; location: string } => {
    try {
      const parsed = JSON.parse(metadataURI);
      return {
        title: parsed.title || `Property #${id}`,
        location: parsed.location || "Midl Metaverse",
      };
    } catch {
      return {
        title: metadataURI || `Property #${id}`,
        location: "Midl Metaverse",
      };
    }
  };

  const properties: PropertyData[] = (
    propertiesData
      ?.map((res, index) => {
        if (!res.result) return null;
        const [id, owner, price, metadataURI, isListed] = res.result as [bigint, string, bigint, string, boolean];
        if (id === 0n) return null;
        // Contract stores price in wei (1 BTC = 1e18 wei on Midl)
        const displayPrice = (Number(price) / 1e18).toFixed(6);
        const { title, location } = parseTitle(metadataURI, Number(id));
        return {
          id: Number(id),
          title,
          location,
          price: displayPrice,
          rawPrice: price,
          isSold: !isListed,
          owner,
          image: PROPERTY_IMAGES[index % PROPERTY_IMAGES.length],
        };
      })
      .filter((p): p is PropertyData => p !== null) || []
  );

  const myProperties = properties.filter(
    (p) => p.owner.toLowerCase() === walletAddress.toLowerCase()
  );

  // ── Buy Flow ────────────────────────────────────────────────────────────────
  const [purchaseState, setPurchaseState] = useState<PurchaseStatus>("IDLE");
  const [latestTxHash, setLatestTxHash] = useState("");

  const { addTxIntention, txIntentions } = useAddTxIntention();
  const { finalizeBTCTransaction, data: txData } = useFinalizeBTCTransaction();
  const { signIntentionAsync } = useSignIntention();
  const publicClient = usePublicClient();

  // Ref always points at the latest txIntentions so the async signing callback
  // can read post-sign store values without stale closure captures.
  const txIntentionsRef = useRef(txIntentions);
  useEffect(() => { txIntentionsRef.current = txIntentions; }, [txIntentions]);

  const { waitForTransaction } = useWaitForTransaction({
    mutation: {
      onSuccess: (data: any) => {
        setPurchaseState("SUCCESS");
        const hash = data?.tx?.id || latestTxHash;
        setLatestTxHash(hash);
        if (buyingProperty) {
          setReceipts((prev) => [
            { hash, propertyId: buyingProperty.id, type: "BUY", timestamp: Date.now() },
            ...prev,
          ]);
        }
        refetch();
      },
    },
  });

  const handleBuyConfirm = () => {
    if (!buyingProperty || !isConnected) return;

    setPurchaseState("ADDING_INTENTION");
    addTxIntention({
      reset: true,
      intention: {
        evmTransaction: {
          to: BitEstateContract.address as `0x${string}`,
          value: buyingProperty.rawPrice,
          data: encodeFunctionData({
            abi: BitEstateContract.abi,
            functionName: "buyProperty",
            args: [BigInt(buyingProperty.id)],
          }),
        },
      },
    });

  };

  // Reactively trigger finalize once intention is registered in the store
  useEffect(() => {
    if (purchaseState === "ADDING_INTENTION" && txIntentions.length > 0) {
      setPurchaseState("FINALIZING");
      finalizeBTCTransaction();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txIntentions.length, purchaseState]);

  useEffect(() => {
    if (purchaseState !== "FINALIZING" || !txData) return;

    const run = async () => {
      setPurchaseState("SIGNING");
      try {
        // Sign each intention — signIntentionAsync mutates the store reactively.
        // We must wait a tick after all signs complete before reading the updated values.
        for (const intention of txIntentionsRef.current) {
          await signIntentionAsync({ intention, txId: txData.tx.id });
        }
        await new Promise(r => setTimeout(r, 150));

        // Read from txIntentionsRef which is kept in sync via useEffect
        const signedHexes = txIntentionsRef.current
          .map(it => it.signedEvmTransaction)
          .filter((h): h is string => typeof h === "string" && h.startsWith("0x")) as `0x${string}`[];

        if (signedHexes.length === 0) {
          throw new Error("No signed transactions found. Check wallet signing step.");
        }
        setPurchaseState("BROADCASTING");
        await publicClient?.sendBTCTransactions({
          serializedTransactions: signedHexes,
          btcTransaction: txData.tx.hex,
        });
        setLatestTxHash(txData.tx.id);
        waitForTransaction({ txId: txData.tx.id });
      } catch (e: any) {
        console.error(e);
        alert("Transaction failed: " + e.message);
        setPurchaseState("IDLE");
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txData, purchaseState]);

  const handleBuyModalClose = () => {
    setBuyingProperty(null);
    setPurchaseState("IDLE");
    setLatestTxHash("");
  };

  const handleListSuccess = (receipt: TxReceipt) => {
    setReceipts((prev) => [receipt, ...prev]);
    setTimeout(() => {
      refetch();
      setShowListModal(false);
    }, 2000);
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalValueBTC = properties.reduce((sum, p) => sum + parseFloat(p.price), 0).toFixed(4);
  const availableCount = properties.filter((p) => !p.isSold).length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {showListModal && (
        <ListPropertyModal onClose={() => setShowListModal(false)} onSuccess={handleListSuccess} btcPriceUsd={btcPriceUsd} />
      )}

      {buyingProperty && (
        <BuyModal
          property={buyingProperty}
          purchaseState={purchaseState}
          txHash={latestTxHash}
          onConfirm={handleBuyConfirm}
          onClose={handleBuyModalClose}
          toUSD={toUSD}
        />
      )}

      <div className="flex h-screen bg-[#0E0E0E] text-zinc-300 font-sans overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="w-64 border-r border-zinc-800 bg-[#121212] flex flex-col justify-between shrink-0">
          <div>
            <div className="p-6 flex items-center gap-3 border-b border-zinc-800/60 pb-8">
              <div className="w-8 h-8 rounded bg-gradient-to-tr from-orange-600 to-yellow-500 flex items-center justify-center">
                <span className="font-bold text-white text-xs">BE</span>
              </div>
              <h1 className="text-xl font-bold tracking-widest uppercase text-white">BitEstate</h1>
            </div>

            <div className="p-4 space-y-2 mt-4">
              <p className="text-xs uppercase text-zinc-600 font-semibold px-4 mb-2">Platform</p>
              {[
                { id: "Marketplace", icon: Home, label: "Marketplace", requiresWallet: false },
                {
                  id: "My Portfolio",
                  icon: Building2,
                  label: `My Portfolio${myProperties.length ? ` (${myProperties.length})` : ""}`,
                  requiresWallet: true,
                },
                {
                  id: "Activity",
                  icon: Activity,
                  label: `Activity${receipts.length ? ` (${receipts.length})` : ""}`,
                  requiresWallet: false,
                },
              ].map((item) => {
                const isDisabled = !isConnected && item.requiresWallet;
                return (
                  <button
                    key={item.id}
                    onClick={() => !isDisabled && setActiveTab(item.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isDisabled
                        ? "opacity-40 cursor-not-allowed text-zinc-600"
                        : activeTab === item.id
                        ? "bg-orange-500/10 text-orange-500"
                        : "hover:bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 space-y-2 mb-4">
            <p className="text-xs uppercase text-zinc-600 font-semibold px-4 mb-2">System</p>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800 text-zinc-400 transition-all">
              <Settings size={20} />
              <span className="font-medium text-sm">Settings</span>
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0A0A0A]">
          {/* Header */}
          <header className="h-20 border-b border-zinc-800 flex items-center justify-between px-8 bg-[#0E0E0E]">
            <h2 className="text-2xl font-bold text-white">{activeTab}</h2>

            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="text"
                  placeholder="Search properties…"
                  className="bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-orange-500/50 w-56 text-white"
                />
              </div>

              {isConnected && (
                <button
                  onClick={() => setShowListModal(true)}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors"
                >
                  <Plus size={16} />
                  List Property
                </button>
              )}

              {isConnected ? (
                <div
                  className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full p-1 pr-4 cursor-pointer group"
                  onClick={copyAddress}
                  title="Click to copy address"
                  suppressHydrationWarning
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-amber-500" />
                  <div className="flex flex-col">
                    <span className="text-xs font-mono text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      {copiedAddr ? "Copied!" : shortAddress}
                    </span>
                    <span className="text-sm font-semibold text-white">Connected</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); disconnect(); }}
                    className="ml-1 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-colors shadow-lg shadow-orange-500/20"
                >
                  <Wallet size={18} />
                  Connect Xverse
                </button>
              )}
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-auto p-8">

            {/* ══ Marketplace ══ */}
            {activeTab === "Marketplace" && (
              <>
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: "Total Listings Value", value: `${totalValueBTC} BTC`, icon: TrendingUp, color: "text-green-400" },
                    { label: "Active Listings", value: String(availableCount), icon: Tag, color: "text-orange-400" },
                    { label: "Total Properties", value: String(properties.length), icon: Building2, color: "text-blue-400" },
                    { label: "My Portfolio", value: isConnected ? String(myProperties.length) : "—", icon: Wallet, color: "text-purple-400" },
                  ].map((stat, i) => (
                    <div key={i} className="bg-[#121212] border border-zinc-800/60 p-5 rounded-2xl flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <p className="text-zinc-500 text-sm">{stat.label}</p>
                        <stat.icon size={16} className={stat.color} />
                      </div>
                      <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                    </div>
                  ))}
                </div>

                {/* Grid Header */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-white">Live Listings</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowListModal(true)}
                      disabled={!isConnected}
                      className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors ${
                        isConnected
                          ? "text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
                          : "text-zinc-600 border-zinc-800 cursor-not-allowed"
                      }`}
                    >
                      <Plus size={16} />
                      New Listing
                    </button>
                    <button className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white border border-zinc-800 rounded-lg px-3 py-2">
                      <Download size={16} /> Export
                    </button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                    <p className="text-zinc-500 font-mono text-sm">Querying Midl RPC…</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.length === 0 ? (
                      <div className="col-span-full py-16 flex flex-col items-center gap-4 text-center border border-dashed border-zinc-800 rounded-2xl">
                        <Building2 size={40} className="text-zinc-700" />
                        <div>
                          <p className="font-medium text-zinc-400">No properties listed yet</p>
                          <p className="text-sm text-zinc-500 mt-1">Be the first to list a property on BitEstate!</p>
                        </div>
                        {isConnected && (
                          <button
                            onClick={() => setShowListModal(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-400 text-black font-semibold rounded-full transition-colors mt-2"
                          >
                            <Plus size={18} />
                            List Your First Property
                          </button>
                        )}
                      </div>
                    ) : (
                      properties.map((prop) => (
                        <PropertyCard
                          key={prop.id}
                          property={prop}
                          isConnected={isConnected}
                          toUSD={toUSD}
                          onBuy={() => {
                            setPurchaseState("IDLE");
                            setBuyingProperty(prop);
                          }}
                        />
                      ))
                    )}
                  </div>
                )}
              </>
            )}

            {/* ══ My Portfolio ══ */}
            {activeTab === "My Portfolio" && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <p className="text-zinc-500 text-sm">Properties you own on the Midl network</p>
                  <button
                    onClick={() => setShowListModal(true)}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-black px-5 py-2.5 rounded-full text-sm font-semibold transition-colors"
                  >
                    <Plus size={16} />
                    List New Property
                  </button>
                </div>

                {myProperties.length === 0 ? (
                  <div className="py-16 flex flex-col items-center gap-4 text-center border border-dashed border-zinc-800 rounded-2xl">
                    <Building2 size={40} className="text-zinc-700" />
                    <div>
                      <p className="font-medium text-zinc-400">No properties in your portfolio</p>
                      <p className="text-sm text-zinc-500 mt-1">Buy or list properties to see them here</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("Marketplace")}
                      className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-full transition-colors mt-2"
                    >
                      Browse Marketplace
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myProperties.map((prop) => (
                      <PropertyCard key={prop.id} property={prop} isConnected={isConnected} onBuy={() => {}} isOwned toUSD={toUSD} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ══ Activity ══ */}
            {activeTab === "Activity" && (
              <>
                <div className="mb-6">
                  <p className="text-zinc-500 text-sm">Recent transactions from this session</p>
                </div>

                {receipts.length === 0 ? (
                  <div className="py-16 flex flex-col items-center gap-4 text-center border border-dashed border-zinc-800 rounded-2xl">
                    <Activity size={40} className="text-zinc-700" />
                    <div>
                      <p className="font-medium text-zinc-400">No transactions yet</p>
                      <p className="text-sm text-zinc-500 mt-1">Buy or list properties to see activity here</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receipts.map((r, i) => (

                      <div key={i} className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.type === "BUY" ? "bg-green-500/10 text-green-400" : "bg-orange-500/10 text-orange-400"}`}>
                            {r.type === "BUY" ? <Building2 size={20} /> : <Tag size={20} />}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-sm">
                              {r.type === "BUY" ? "Bought Property" : "Listed Property"} #{r.propertyId}
                            </p>
                            <p className="text-xs text-zinc-500 font-mono mt-0.5">
                              {new Date(r.timestamp).toLocaleString()}
                              {r}

                            </p>
                          </div>
                        </div>
                        {r.hash && (
                          <a
                            href={`https://blockscout.staging.midl.xyz/tx/${r.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-orange-400 font-mono bg-zinc-900 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {r.hash.slice(0, 10)}…
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
