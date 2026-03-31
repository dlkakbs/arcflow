# ArcFlow

**Payment infrastructure for the Arc ecosystem — streaming, invoicing, and paywalls powered by native USDC.**

Live demo: [flowonarc.vercel.app](https://flowonarc.vercel.app)

---

## What is ArcFlow?

ArcFlow is the payment layer for Arc Testnet. Think Stripe, but on-chain — no intermediaries, no chargebacks, instant settlement in native USDC. It ships three composable payment primitives:

| Module | What it does |
|--------|-------------|
| **Stream** | Per-second salary, subscription, or vesting payments |
| **Invoice** | Create & pay USDC invoices with shareable IDs |
| **Paywall** | Deposit credits, gate API calls at sub-cent rates per request |

---

## Built on Arc

ArcFlow is deployed on Arc and it's designed around what Arc uniquely makes possible.

### Native USDC as Gas

Arc makes USDC the native gas token of the network. Every transaction fee is paid in USDC — the same asset users are already transacting with. This eliminates a fundamental problem in traditional blockchain payments: you need a volatile asset (ETH, MATIC) just to move a stable one.

For ArcFlow this means:
- Users deposit USDC and consume credits — no separate gas wallet required
- Per-request costs are predictable in dollar terms, not subject to gas market swings
- Enterprises can budget API access like a SaaS subscription: a fixed dollar amount, expensed like any operating cost

Arc achieves this through a dual USDC interface: as the native gas token it uses 18 decimals internally for metering; as an ERC-20 it uses the standard 6 decimals. A precompiled contract synchronizes both representations automatically. ArcFlow uses the 6-decimal ERC-20 interface consistently throughout.

### Sub-Cent Transaction Costs

Arc's fee design uses an exponentially weighted moving average of block utilization instead of block-by-block price jumps. Combined with bounded base fees and high throughput (~3,000 TPS at <350ms finality with 20 validators), fees stay consistently low and don't spike under demand.

This is the technical prerequisite that makes ArcFlow's paywall model viable. At Ethereum gas prices, a `0.001 USDC` API call would cost more in gas than the payment itself — the economics don't work. On Arc, micropayments are real.

ArcFlow's batch settlement pattern is built around this: clients sign each request off-chain (zero gas), and the owner submits up to 50 payments in a single `redeemBatch` transaction. Gas is amortized across the batch, driving per-request overhead toward zero.

### Deterministic Sub-Second Finality

Arc uses Malachite — a high-performance BFT consensus protocol based on Tendermint. Once 2/3 of validators commit a block, the transaction is immediately and irreversibly final. There is no probabilistic finality, no reorg risk, no "wait 12 confirmations."

This matters for payment infrastructure: a stream withdrawal, invoice payment, or paywall deposit is settled the moment it lands in a block. ArcFlow's frontend can show confirmed state without artificial delays or optimistic assumptions.

Malachite's design also delivers exceptional throughput: ~10,000 TPS with <100ms finality on commodity hardware with 4 validators, with planned enhancements targeting another 10x increase. ArcFlow is ready to scale with the network.

### Circle Ecosystem Integration

Arc is built by Circle and is natively integrated into Circle's full-stack platform: USDC issuance, CCTP (Cross-Chain Transfer Protocol), Circle Gateway, and institutional on/off-ramps. Arc's USDC is the canonical version — not a bridge wrapper or a synthetic.

ArcFlow inherits this: the USDC flowing through Stream, Invoice, and Paywall is the same USDC that settles across Circle's institutional network, trusted by Visa, HSBC, BlackRock, and Fireblocks. When ArcFlow processes a payment, it settles in the same asset that institutional treasuries hold.

### EVM Compatibility

Arc is fully EVM-compatible. ArcFlow's contracts are standard Solidity, built with Foundry, and verifiable on [ArcScan](https://testnet.arcscan.app) — the same toolchain any Ethereum developer already knows. No new languages, no new paradigms, no migration cost.

---

## Deployed Contracts (Arc Testnet)

| Contract | Address |
|----------|---------|
| ArcStream | [`0xAB78614fED57bB451b70EE194fC4043CADCC39eF`](https://testnet.arcscan.app/address/0xAB78614fED57bB451b70EE194fC4043CADCC39eF) |
| ArcInvoice | [`0x8d533a6DF78ef01F6E4E998588D3Ccb21F668486`](https://testnet.arcscan.app/address/0x8d533a6DF78ef01F6E4E998588D3Ccb21F668486) |
| ArcPaywall | [`0xb1f95F4d86C743cbe1797C931A9680dF5766633A`](https://testnet.arcscan.app/address/0xb1f95F4d86C743cbe1797C931A9680dF5766633A) |

- **Network:** Arc Testnet
- **Chain ID:** 5042002
- **Explorer:** [testnet.arcscan.app](https://testnet.arcscan.app)

---

## How It Works

### Stream

Create a USDC stream to any address with a monthly rate. The contract converts this to a per-second rate and begins accruing immediately. The recipient can withdraw at any time — they don't wait for a payment cycle. Senders see their active outgoing streams; recipients see incoming streams — the UI auto-detects your role.

> **Note:** Rate precision is limited by integer division (`monthlyUsdc / 2_592_000`). Small monthly amounts may truncate slightly — the frontend warns you when this happens.

### Invoice

Generate a USDC invoice and share the numeric ID with your client. The client pays directly on-chain; both parties can track status in real time. No email, no bank transfer, no intermediary — the payment and the receipt are the same transaction.

### Paywall

Deposit USDC credits once. Each API request is signed off-chain (no gas) and queued. The contract deployer (owner) batches up to 50 signatures into a single `redeemBatch` transaction — payments flow from the contract to the owner only at that point, not per request.

The frontend includes a live demo so you can see the signing flow and credits deducted in real time.

**Security model:**
- **Domain separation:** every signature commits to `address(this)` + `chainId`, preventing replay across contracts or chains
- **Monotonic nonce:** signatures are strictly ordered per user, preventing replay within the same contract
- **Deadline:** each signature expires after 10 minutes, eliminating stale pending payments
- **Max deposit cap:** limits custody exposure per user
- **Normal withdraw:** users can withdraw their unused deposit at any time, no conditions
- **Escape path:** if the owner is inactive for 7 days, users can emergency-withdraw their full deposit directly from the contract — even if the frontend is down

---

## Tech Stack

**Smart Contracts**
- Solidity + [Foundry](https://book.getfoundry.sh/)
- Arc Testnet (EVM-compatible, Chain ID 5042002)

**Frontend**
- Next.js 16
- wagmi v2 + viem
- Tailwind CSS + Framer Motion

**Backend**
- Next.js API Routes (serverless)
- Upstash Redis — atomic nonce reservation, idempotency keys, ordered settlement queue

---

## Local Development

### Contracts

```shell
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Build
forge build

# Test
forge test

# Deploy to Arc Testnet
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.testnet.arc.network \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### Frontend

```shell
cd frontend
npm install
npm run dev
```

Create a `.env.local`:

```env
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
OWNER_PRIVATE_KEY=0x...
```

### Tests

```shell
cd frontend
npm test
```

13 edge case tests covering concurrent nonce requests, duplicate request idempotency, expired reservation handling, out-of-order batch settlement, and crash recovery.

---

## License

MIT
