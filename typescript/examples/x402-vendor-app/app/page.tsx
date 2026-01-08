"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { CreateItemForm } from "@/components/CreateItemForm"
import { ItemList } from "@/components/ItemList"
import { TemplateItems } from "@/components/TemplateItems"
import type { VendorItem } from "@/types/item"

export default function Home() {
  const { address, isConnected } = useAccount()
  const [items, setItems] = useState<VendorItem[]>([])
  const [activeTab, setActiveTab] = useState<"list" | "create">("list")
  const [web3ModalHook, setWeb3ModalHook] = useState<(() => { open: () => void }) | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [defaultPayToAddress, setDefaultPayToAddress] = useState<string>("")

  // Fix hydration mismatch by only showing wallet state after mount
  useEffect(() => {
    setIsMounted(true)
    
    // Fetch default pay-to address from API (reads AGENT_PAY_TO_ADDRESS from server)
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.defaultPayToAddress) {
          setDefaultPayToAddress(data.defaultPayToAddress)
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch default pay-to address:", err)
      })
  }, [])

  // Load Web3Modal hook only on client side
  useEffect(() => {
    const loadWeb3Modal = async () => {
      try {
        const { useWeb3Modal } = await import("@web3modal/wagmi/react")
        // Try to use the hook - it will throw if Web3Modal wasn't initialized
        const modal = useWeb3Modal()
        setWeb3ModalHook(() => () => modal)
      } catch (error) {
        // Web3Modal not initialized (missing project ID)
        console.warn("Web3Modal not available:", error)
      }
    }
    loadWeb3Modal()
  }, [])

  useEffect(() => {
    // Load items on mount
    const loadItems = () => {
      if (typeof window === "undefined") return
      const stored = localStorage.getItem("x402-vendor-items")
      if (stored) {
        try {
          setItems(JSON.parse(stored))
        } catch {
          // Ignore parse errors
        }
      }
    }
    loadItems()
  }, [])

  const handleItemCreated = (item: VendorItem) => {
    setItems([...items, item])
    setActiveTab("list")
  }

  const handleOpenWallet = () => {
    try {
      if (web3ModalHook) {
        const modal = web3ModalHook()
        modal.open()
      } else {
        alert("Please set NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID in your .env file to use WalletConnect")
      }
    } catch (error) {
      console.error("Error opening wallet modal:", error)
      alert("Please set NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID in your .env file to use WalletConnect")
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🛒 x402 Vendor App</h1>
        <div className="header-actions">
          {!isMounted ? (
            // Show placeholder during SSR to prevent hydration mismatch
            <div className="wallet-info" style={{ opacity: 0 }}>
              <span className="wallet-address">Loading...</span>
            </div>
          ) : isConnected ? (
            <div className="wallet-info">
              <span className="wallet-address">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <button onClick={handleOpenWallet} className="wallet-button">
                Wallet
              </button>
            </div>
          ) : (
            <button onClick={handleOpenWallet} className="connect-button">
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={activeTab === "list" ? "active" : ""}
          onClick={() => setActiveTab("list")}
        >
          Browse Items
        </button>
        <button
          className={activeTab === "create" ? "active" : ""}
          onClick={() => setActiveTab("create")}
        >
          Create Item
        </button>
      </nav>

      <main className="app-main">
        {activeTab === "list" ? (
          <ItemList />
        ) : (
          <div>
            <TemplateItems 
              onItemAdded={handleItemCreated} 
              defaultPayToAddress={defaultPayToAddress || undefined}
            />
            <div style={{ marginTop: "3rem" }}>
              <CreateItemForm 
                onItemCreated={handleItemCreated} 
                defaultPayToAddress={defaultPayToAddress || undefined}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

