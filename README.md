# ArcFlow

**Payment infrastructure for the Arc ecosystem — streaming, invoicing, and paywalls powered by native USDC.**

Live demo: [flowonarc.vercel.app](https://flowonarc.vercel.app)

---

## What is ArcFlow?

ArcFlow is the payment layer for Arc Testnet. Think Stripe, but on-chain — no intermediaries, no chargebacks, instant settlement in USDC. It ships three composable payment primitives:

| Module | What it does |
|--------|-------------|
| **Stream** | Per-second salary, subscription, or vesting payments |
| **Invoice** | Create & pay USDC invoices with shareable IDs |
| **Paywall** | Deposit credits, gate API calls at sub-cent rates per request |

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
Create a USDC stream to any address with a monthly rate. The recipient can withdraw accrued funds at any time. Senders see their active streams; recipients see incoming streams — the UI auto-detects your role.

> **Note:** Rate precision is limited by integer division (`monthlyUsdc / 2_592_000`). Small monthly amounts may truncate slightly — the frontend warns you when this happens.

### Invoice
Generate a USDC invoice and share the numeric ID with your client. The client pays directly on-chain; both parties can track status in real time.

### Paywall
Deposit USDC credits to gate API access at `0.001 USDC/request`. The frontend includes a live demo so you can see credits deducted in real time.

---

## Tech Stack

**Smart Contracts**
- Solidity + [Foundry](https://book.getfoundry.sh/)
- Arc Testnet (EVM-compatible)

**Frontend**
- Next.js 14
- wagmi v2 + viem
- Tailwind CSS + Framer Motion

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
  --rpc-url https://testnet-rpc.arc.network \
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
NEXT_PUBLIC_CHAIN_ID=5042002
NEXT_PUBLIC_ARC_FLOW=0xAB78614fED57bB451b70EE194fC4043CADCC39eF
NEXT_PUBLIC_ARC_INVOICE=0x8d533a6DF78ef01F6E4E998588D3Ccb21F668486
NEXT_PUBLIC_ARC_PAYWALL=0xb1f95F4d86C743cbe1797C931A9680dF5766633A
```

---

## License

MIT
