// Common network configurations
export const NETWORKS = {
  "base-sepolia": {
    name: "Base Sepolia",
    id: "base-sepolia",
    chainId: 84532,
  },
  "base": {
    name: "Base",
    id: "base",
    chainId: 8453,
  },
  "ethereum": {
    name: "Ethereum",
    id: "ethereum",
    chainId: 1,
  },
} as const

// Common asset configurations
export const ASSETS = {
  // Base Sepolia USDC
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e": {
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    name: "USDC",
    decimals: 6,
    network: "base-sepolia",
  },
  // Base Mainnet USDC
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    name: "USDC",
    decimals: 6,
    network: "base",
  },
  // Add more assets as needed
} as const

// Facilitator URL - can be overridden via environment variable
// For CDP facilitator: https://api.cdp.coinbase.com/platform/v2/x402
// For testnet facilitator: https://x402.org/facilitator
export const FACILITATOR_URL = 
  process.env.NEXT_PUBLIC_FACILITATOR_URL || 
  process.env.FACILITATOR_URL || 
  "https://x402.org/facilitator"

