# 🏠 BitEstate — Real Estate on Bitcoin

> **Buy, sell, and list real estate properties natively on the Bitcoin blockchain using Midl smart contract infrastructure and Xverse wallet.**

Built for the [Midl VibeHack Hackathon](https://dorahacks.io/hackathon/vibemidl/detail) · February 2025

---

## 🎬 Demo

| | |
|---|---|
| **Live Demo** | [bitestate.vercel.app](https://bitestate.vercel.app) *(deploy your own)* |
| **Contract** | [`0xC2DcED4E47cf45FEEC1b432AeA91ca09Cb830050`](https://blockscout.regtest.midl.xyz/address/0xC2DcED4E47cf45FEEC1b432AeA91ca09Cb830050) |
| **Deploy Tx** | [`0x5af0454...`](https://blockscout.regtest.midl.xyz/tx/0x5af04549f84ea0ca6410b0b4544b01655ec26966927fe10c0ac3e7b814cb3c27) |
| **BTC Tx ID** | `166f4bb25d9912b2924d704e3f82f515b9af6848b6b31632147257dbbc0d65ed` |
| **Network** | Midl L2 (Regtest) |

___

## 🏗️ What Is BitEstate?

BitEstate is a **tokenized real estate marketplace** built on Bitcoin L2 via the Midl network. It allows users to:

- **Browse** real estate listings pulled live from an on-chain smart contract
- **Buy** properties using BTC (signed via Xverse wallet)
- **List** new properties by publishing metadata + price to the blockchain
- **Track** their portfolio and view a full activity log of on-chain transactions

Every action — listing and buying — goes through a **real Solidity contract** deployed on Midl's Bitcoin-native L2, signed with BTC via the Xverse wallet, and confirmed on-chain. No mocks. No stubs.

---

## 🧱 Architecture

```
┌─────────────────────────────────────────────────────┐
│                   BitEstate dApp                    │
│                  (Next.js 15 App)                   │
├──────────────┬──────────────────────────────────────┤
│  Landing Page│  Dashboard (/dashboard)              │
│  (app/page)  │  ┌──────────┬──────────┬──────────┐  │
│              │  │Marketplace│Portfolio │ Activity │  │
└──────────────┴──┴──────────┴──────────┴──────────┴──┘
         │                    │
         ▼                    ▼
  @midl/react             wagmi (v2)
  ┌────────────┐        ┌────────────┐
  │useConnect  │        │useReadContr│
  │useAccounts │        │acts        │
  │useDisconnec│        │(properties │
  │t           │        │ 1-6)       │
  └────────────┘        └────────────┘
         │
         ▼
  @midl/executor-react
  ┌──────────────────────────────────┐
  │ 1. useAddTxIntention             │
  │    → encodes buyProperty() or    │
  │      listProperty() calldata     │
  │                                  │
  │ 2. useFinalizeBTCTransaction     │
  │    → constructs BTC PSBT         │
  │                                  │
  │ 3. useSignIntention              │
  │    → Xverse wallet popup         │
  │      signs EVM + BTC tx          │
  │                                  │
  │ 4. publicClient.sendBTCTxs       │
  │    → broadcasts to Midl RPC      │
  │                                  │
  │ 5. useWaitForTransaction         │
  │    → polls for confirmation      │
  │    → updates UI on success       │
  └──────────────────────────────────┘
         │
         ▼
  Midl L2 RPC (https://rpc.staging.midl.xyz)
         │
         ▼
  BitEstate.sol Contract
  0xC2DcED4E47cf45FEEC1b432AeA91ca09Cb830050
```

---

## 📜 Smart Contract

**BitEstate.sol** — Deployed on Midl Regtest L2

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BitEstate {
    struct Property {
        uint256 id;
        address payable owner;
        uint256 price;       // in wei (1 BTC = 1e18 on Midl)
        string metadataURI;  // JSON: { "title": "...", "location": "..." }
        bool isListed;
    }

    mapping(uint256 => Property) public properties;
    uint256 private _nextId = 1;

    event PropertyListed(uint256 indexed propertyId, address indexed owner, uint256 price, string metadataURI);
    event PropertySold(uint256 indexed propertyId, address indexed oldOwner, address indexed newOwner, uint256 price);

    function listProperty(uint256 price, string calldata metadataURI) external returns (uint256);
    function buyProperty(uint256 propertyId) external payable;
}
```

**Contract Address:** `0xC2DcED4E47cf45FEEC1b432AeA91ca09Cb830050`  
**Deploy Tx:** `0x5af04549f84ea0ca6410b0b4544b01655ec26966927fe10c0ac3e7b814cb3c27`  
**BTC Tx:** `166f4bb25d9912b2924d704e3f82f515b9af6848b6b31632147257dbbc0d65ed`

---

## 🔄 Transaction Flow

### Buying a Property

```
User clicks "Buy Now"
  → BuyModal opens (preview + price in BTC/USD)
  → "Confirm & Buy" clicked
  → addTxIntention({ evmTransaction: { to: contract, value: price, data: buyProperty(id) } })
  → [store populated] → finalizeBTCTransaction()
  → Xverse popup: sign EVM tx + BTC PSBT
  → signIntentionAsync() resolves
  → sendBTCTransactions(signedEVM, btcHex) → Midl RPC
  → waitForTransaction() polls
  → ✅ SUCCESS: modal shows tx hash + blockscout link
  → Properties grid refetches, portfolio updates
```

### Listing a Property

```
User clicks "List Property"
  → ListPropertyModal opens (title, location, price form)
  → "List Property" clicked
  → addTxIntention({ evmTransaction: { to: contract, data: listProperty(priceWei, metadataJSON) } })
  → [store populated] → finalizeBTCTransaction()
  → Xverse popup: sign tx
  → broadcast → waitForTransaction()
  → ✅ SUCCESS: modal shows tx hash, marketplace refetches
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- [Xverse Wallet](https://www.xverse.app/) browser extension
- tBTC from [Midl Faucet](https://faucet.regtest.midl.xyz/)

### Installation

```bash
git clone https://github.com/yourusername/bitestate
cd bitestate/frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment

No `.env` required — the app connects to the public Midl staging RPC at `https://rpc.staging.midl.xyz` and uses the already-deployed contract.

### Get Test BTC

1. Install [Xverse](https://www.xverse.app/)
2. Switch to **Regtest** network in Xverse settings
3. Visit [faucet.regtest.midl.xyz](https://faucet.regtest.midl.xyz/) and claim tBTC
4. Connect wallet in BitEstate dashboard

---

## 📁 Project Structure

```
frontend/
├── app/
│   ├── page.tsx              # Landing page — hero, 3D deed card
│   ├── dashboard/
│   │   └── page.tsx          # Main dApp — marketplace, portfolio, activity
│   ├── layout.tsx            # Root layout with Providers
│   ├── providers.tsx         # WagmiProvider + QueryClient + MidlProvider
│   └── globals.css
├── lib/
│   ├── contracts.ts          # BitEstate ABI + address
│   ├── wagmiConfig.ts        # Wagmi config for Midl regtest chain
│   ├── midlConfig.ts         # Midl config with xverseConnector
│   └── queryClient.ts
└── package.json
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v3 |
| Bitcoin Wallet | Xverse via `@midl/connectors` |
| Midl SDK | `@midl/react`, `@midl/core`, `@midl/executor-react` |
| EVM Reads | `wagmi` v2 + `viem` (@midl/viem fork) |
| State | React hooks + TanStack Query |
| Icons | Lucide React |
| Animations | Framer Motion |
| Price Feed | CoinGecko API (BTC/USD) |

---

## 🧪 Verification

### Check Contract On-Chain

```
Blockscout Explorer:
https://blockscout.regtest.midl.xyz/address/0xC2DcED4E47cf45FEEC1b432AeA91ca09Cb830050

Deploy Transaction:
https://blockscout.regtest.midl.xyz/tx/0x5af04549f84ea0ca6410b0b4544b01655ec26966927fe10c0ac3e7b814cb3c27

BTC Transaction (Mempool):
https://mempool.regtest.midl.xyz/tx/166f4bb25d9912b2924d704e3f82f515b9af6848b6b31632147257dbbc0d65ed
```

### Run Contract Reads Locally

```typescript
import { createPublicClient, http } from '@midl/viem'
import { midlRegtest } from '@midl/executor'

const client = createPublicClient({
  chain: midlRegtest,
  transport: http('https://rpc.staging.midl.xyz')
})

// Read property #1
const prop = await client.readContract({
  address: '0xC2DcED4E47cf45FEEC1b432AeA91ca09Cb830050',
  abi: BitEstateABI,
  functionName: 'properties',
  args: [1n]
})
```

---

## 💡 Key Technical Decisions

### Why the `txIntentionsRef` pattern?

`signIntentionAsync` from `@midl/executor-react` works by **mutating a reactive store** (not returning the signed data in its promise). React's closure snapshot means `txIntentions` in an `async` callback won't reflect post-sign values. The solution: a ref kept in sync with the latest store value, read after all signing completes + a 150ms tick to allow store propagation.

### Why no `useWriteContract`?

Wagmi's `useWriteContract` injects an EVM provider into `window`, causing a `Cannot redefine property: StacksProvider` conflict with the Xverse extension. All contract writes go through the Midl executor pipeline instead.

### Why reactive `useEffect` for finalize?

`finalizeBTCTransaction()` must only be called after `addTxIntention()` has registered the intention in the store. A `setTimeout` is a race condition. We use `useEffect(() => { ... }, [txIntentions.length])` to trigger finalize reactively, guaranteed after the store update.

---

## ✅ Judging Criteria Checklist

| Requirement | Status | Details |
|---|---|---|
| Proper front-end design (no AI slop) | ✅ | Dark luxury real estate aesthetic, custom animations, orange Bitcoin accent system |
| Xverse wallet connection | ✅ | Full `@midl/react` + `xverseConnector` integration |
| User triggers action in UI | ✅ | Buy Property + List Property modals with step-by-step flow |
| Action hits Midl RPC/SDK → Solidity | ✅ | `useAddTxIntention` → `useFinalizeBTCTransaction` → `useSignIntention` → broadcast |
| Tx appears on-chain with hash | ✅ | Real tx hash with blockscout explorer link shown on success |
| UI updates to reflect new state | ✅ | `useReadContracts` refetch after each tx; portfolio + activity log update live |

---

## 🤖 Built With AI

This dApp was built using **Claude (Anthropic)** as the primary development co-pilot. The entire stack — from Solidity contract design to the React transaction flow to the UI components — was vibe-coded in a focused sprint, demonstrating that Bitcoin-native dApps are now accessible to any developer with the right tools.

---

## 📄 License

MIT

---
