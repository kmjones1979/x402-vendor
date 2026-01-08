"use client"

import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { config, initializeWeb3Modal } from "@/config/wagmi"
import { useState, useEffect } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  // Initialize Web3Modal only after component is fully mounted and hydrated
  // Using setTimeout with a small delay ensures React hydration is complete
  // before Web3Modal initializes, preventing "Cannot update during render" errors
  useEffect(() => {
    // Use a small delay to ensure hydration is complete
    // This prevents state updates during the Hydrate phase
    const timer = setTimeout(() => {
      initializeWeb3Modal()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

