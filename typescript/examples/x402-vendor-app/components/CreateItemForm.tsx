"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { NETWORKS } from "@/utils/constants"
import { createPaymentRequirements } from "@/utils/payment"
import { saveItem } from "@/utils/itemStorage"
import { getDefaultPayToAddress } from "@/utils/config"
import type { VendorItem } from "@/types/item"

interface CreateItemFormProps {
  onItemCreated: (item: VendorItem) => void
  defaultPayToAddress?: string // Pass from server component
}

export function CreateItemForm({ onItemCreated, defaultPayToAddress }: CreateItemFormProps) {
  const { address } = useAccount()
  // Use passed prop first, then fall back to client-side env var
  const defaultPayTo = defaultPayToAddress || getDefaultPayToAddress()
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    network: "base", // Using Base mainnet with x402 v2
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet USDC
    assetName: "USDC",
    payTo: defaultPayTo || address || "",
    imageUrl: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update payTo when address changes, but prefer defaultPayTo
  useEffect(() => {
    if (defaultPayTo) {
      setFormData((prev) => ({ ...prev, payTo: defaultPayTo }))
    } else if (address) {
      setFormData((prev) => ({ ...prev, payTo: address }))
    }
  }, [address, defaultPayTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) {
      alert("Please connect your wallet first")
      return
    }

    setIsSubmitting(true)
    try {
      const resource = typeof window !== "undefined" 
        ? `${window.location.origin}/api/item/${Date.now()}`
        : `/api/item/${Date.now()}`
      const paymentRequirements = createPaymentRequirements(formData, resource)

      const item: VendorItem = {
        id: `item-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        price: formData.price,
        paymentRequirements,
        createdAt: Date.now(),
        ...(formData.imageUrl && { imageUrl: formData.imageUrl }),
      }

      saveItem(item)
      onItemCreated(item)

      // Reset form
      setFormData({
        name: "",
        description: "",
        price: "",
        network: "base",
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        assetName: "USDC",
        payTo: defaultPayTo || address || "",
        imageUrl: "",
      })
    } catch (error) {
      console.error("Error creating item:", error)
      alert("Failed to create item. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="create-item-form">
      <h2>Create New Item for Sale</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Item Name</label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Digital Art NFT"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            required
            placeholder="Describe your item..."
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="price">Price (in smallest unit)</label>
          <input
            id="price"
            type="text"
            value={formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value })
            }
            required
            placeholder="e.g., 1000000 (for 1 USDC with 6 decimals)"
          />
          <small>
            For USDC (6 decimals), enter amount × 1,000,000. For ETH (18
            decimals), enter amount × 10^18
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="network">Network</label>
          <select
            id="network"
            value={formData.network}
            onChange={(e) =>
              setFormData({ ...formData, network: e.target.value })
            }
            required
          >
            {Object.values(NETWORKS).map((network) => (
              <option key={network.id} value={network.id}>
                {network.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="asset">Asset Address</label>
          <input
            id="asset"
            type="text"
            value={formData.asset}
            onChange={(e) =>
              setFormData({ ...formData, asset: e.target.value })
            }
            required
            placeholder="0x..."
          />
          <small>
            Common assets: USDC on Base Sepolia: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="assetName">Asset Name (optional)</label>
          <input
            id="assetName"
            type="text"
            value={formData.assetName}
            onChange={(e) =>
              setFormData({ ...formData, assetName: e.target.value })
            }
            placeholder="e.g., USDC"
          />
        </div>

        <div className="form-group">
          <label htmlFor="payTo">Payment Address</label>
          <input
            id="payTo"
            type="text"
            value={formData.payTo}
            onChange={(e) =>
              setFormData({ ...formData, payTo: e.target.value })
            }
            required
            placeholder="0x..."
          />
          <small>Address where payments will be sent</small>
        </div>

        <div className="form-group">
          <label htmlFor="imageUrl">Image URL (optional)</label>
          <input
            id="imageUrl"
            type="url"
            value={formData.imageUrl}
            onChange={(e) =>
              setFormData({ ...formData, imageUrl: e.target.value })
            }
            placeholder="https://..."
          />
        </div>

        <button type="submit" disabled={isSubmitting || !address}>
          {isSubmitting ? "Creating..." : "Create Item"}
        </button>
      </form>
    </div>
  )
}

