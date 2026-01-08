"use client"

import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { config, initializeWeb3Modal } from "@/config/wagmi"
import { useState, useEffect } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  // Initialize Web3Modal only after component is mounted (after hydration)
  // Use setTimeout to defer initialization until after React hydration is complete
  useEffect(() => {
    const timer = setTimeout(() => {
      initializeWeb3Modal()
    }, 0)
    
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

