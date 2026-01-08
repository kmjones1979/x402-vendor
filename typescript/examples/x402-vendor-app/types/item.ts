import type { PaymentRequirements } from "x402/types"

export interface VendorItem {
  id: string
  name: string
  description: string
  price: string // Amount in smallest unit (e.g., wei for ETH, 6 decimals for USDC)
  paymentRequirements: PaymentRequirements
  createdAt: number
  imageUrl?: string
}

export interface CreateItemFormData {
  name: string
  description: string
  price: string
  network: string
  asset: string
  assetName?: string
  payTo: string
  imageUrl?: string
}

