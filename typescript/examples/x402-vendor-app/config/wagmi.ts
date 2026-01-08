"use client"

import { createConfig, http, type Config } from "wagmi"
import { base, baseSepolia, mainnet } from "wagmi/chains"
import { coinbaseWallet, walletConnect } from "wagmi/connectors"

// Get projectId from https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || ""

if (!projectId) {
  console.warn(
    "NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID not set. WalletConnect will not work. Get one at https://cloud.walletconnect.com"
  )
}

// Create wagmi config
export const config: Config = createConfig({
  chains: [base, baseSepolia, mainnet],
  connectors: [
    ...(projectId ? [walletConnect({ projectId })] : []),
    coinbaseWallet({ appName: "x402 Vendor App" }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [mainnet.id]: http(),
  },
})

// Initialize Web3Modal only once on client side
let web3ModalInitialized = false

export function initializeWeb3Modal() {
  // Ensure we're in a browser environment and not during SSR
  if (typeof window === "undefined" || web3ModalInitialized || !projectId) {
    return
  }

  try {
    const { createWeb3Modal } = require("@web3modal/wagmi/react")
    createWeb3Modal({
      wagmiConfig: config,
      projectId,
      enableAnalytics: true,
    })
    web3ModalInitialized = true
  } catch (error) {
    console.warn("Failed to initialize Web3Modal:", error)
  }
}

