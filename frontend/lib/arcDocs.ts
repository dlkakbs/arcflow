export interface ArcDocMatch {
  title: string
  url: string
  score: number
  summary: string
}

interface ArcDocEntry {
  title: string
  url: string
  summary: string
  keywords: string[]
}

const ARC_DOCS: ArcDocEntry[] = [
  {
    title: 'Welcome to Arc',
    url: 'https://docs.arc.network/arc/concepts/welcome-to-arc',
    summary:
      'Arc is an open Layer-1 designed for real-world economic activity. It is EVM-compatible, uses stablecoins as gas starting with USDC, offers deterministic sub-second finality, and is built to support payments, capital markets, FX, and agentic commerce.',
    keywords: [
      'welcome',
      'overview',
      'what is arc',
      'layer 1',
      'l1',
      'economic os',
      'payments',
      'capital markets',
      'fx',
      'agentic commerce',
      'real world',
      'stablecoin gas',
      'sub-second finality',
    ],
  },
  {
    title: 'Connect to Arc',
    url: 'https://docs.arc.network/arc/references/connect-to-arc',
    summary:
      'Arc Testnet network details: RPC https://rpc.testnet.arc.network, WebSocket wss://rpc.testnet.arc.network, Chain ID 5042002, currency USDC, explorer https://testnet.arcscan.app, and faucet https://faucet.circle.com.',
    keywords: [
      'connect',
      'wallet',
      'metamask',
      'rpc',
      'websocket',
      'ws',
      'chain id',
      '5042002',
      'explorer',
      'arcscan',
      'faucet',
      'testnet',
      'network details',
    ],
  },
  {
    title: 'Gas and Fees',
    url: 'https://docs.arc.network/arc/references/gas-and-fees',
    summary:
      'Arc uses USDC as the native gas token. On testnet, the minimum base fee is around 160 Gwei and targets roughly $0.01 per transaction. Docs recommend surfacing gas fees in USDC and setting maxFeePerGas at or above 160 Gwei for timely inclusion.',
    keywords: [
      'gas',
      'fees',
      'base fee',
      '160 gwei',
      'maxfeepergas',
      'pricing',
      'transaction cost',
      '1 cent',
      'cost',
      'usdc gas',
    ],
  },
  {
    title: 'Stable Fee Design',
    url: 'https://docs.arc.network/arc/concepts/stable-fee-design',
    summary:
      'Arc prices gas in USDC and smooths fee changes with an exponentially weighted moving average rather than abrupt block-by-block jumps. The stated goal is predictable, auditable fees around one cent on average.',
    keywords: [
      'stable fee',
      'fee design',
      'ewma',
      'moving average',
      'predictable fees',
      '1 cent 1 second 1 click',
      'eip-1559',
      'smoothing',
    ],
  },
  {
    title: 'EVM Compatibility',
    url: 'https://docs.arc.network/arc/references/evm-compatibility',
    summary:
      'Arc supports Ethereum tooling such as Solidity, Foundry, and Hardhat while changing a few execution assumptions: USDC is the native gas token, finality is immediate, timestamps may repeat, block.prevrandao is always zero, and native USDC uses 18 decimals while the optional ERC-20 interface uses 6 decimals.',
    keywords: [
      'evm',
      'compatibility',
      'solidity',
      'foundry',
      'hardhat',
      'prevrandao',
      'timestamp',
      '18 decimals',
      '6 decimals',
      'erc20',
      'native usdc',
      'finality',
      'ethereum tooling',
    ],
  },
  {
    title: 'System Overview',
    url: 'https://docs.arc.network/arc/concepts/system-overview',
    summary:
      'Arc combines the Malachite consensus layer with the Reth execution layer. The docs describe deterministic finality, irreversibility, Proof-of-Authority style validator operation, and execution modules for stablecoin-native finance.',
    keywords: [
      'system overview',
      'architecture',
      'malachite',
      'reth',
      'consensus',
      'execution layer',
      'proof of authority',
      'bft',
      'irreversible',
      'finality',
    ],
  },
  {
    title: 'Contract Addresses',
    url: 'https://docs.arc.network/arc/references/contract-addresses',
    summary:
      'The docs list official Arc Testnet contract addresses. For USDC, the optional ERC-20 interface address is 0x3600000000000000000000000000000000000000 and interacts with the native USDC balance.',
    keywords: [
      'contract address',
      'addresses',
      'usdc address',
      '0x3600000000000000000000000000000000000000',
      'euroc',
      'cctp',
      'gateway',
      'erc20 interface',
    ],
  },
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((token) => token.length > 1)
}

function scoreEntry(prompt: string, entry: ArcDocEntry): number {
  const normalizedPrompt = normalize(prompt)
  const tokens = tokenize(prompt)

  let score = 0

  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalize(keyword)
    if (normalizedPrompt.includes(normalizedKeyword)) score += normalizedKeyword.includes(' ') ? 6 : 4
  }

  for (const token of tokens) {
    if (entry.title.toLowerCase().includes(token)) score += 2
    if (entry.summary.toLowerCase().includes(token)) score += 1
  }

  if (normalizedPrompt.includes('arc')) score += 1

  return score
}

export function searchArcDocs(prompt: string, limit = 3): ArcDocMatch[] {
  return ARC_DOCS.map((entry) => ({
    ...entry,
    score: scoreEntry(prompt, entry),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function buildAnswerBody(matches: ArcDocMatch[]): string {
  const top = matches[0]
  return `${top.summary} Source: ${top.url}`
}

export function getArcDocsAnswer(prompt: string): { message: string; model: string } | null {
  const matches = searchArcDocs(prompt)
  if (matches.length === 0) return null

  const top = matches[0]
  if (top.score < 3) return null

  const message = buildAnswerBody(matches)

  return {
    message,
    model: 'arc-docs-assistant-v1',
  }
}
