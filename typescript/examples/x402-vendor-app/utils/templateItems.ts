import type { VendorItem } from "@/types/item"
import { createPaymentRequirements } from "./payment"
import { getDefaultPayToAddress } from "./config"

const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
const defaultPayTo = getDefaultPayToAddress()

export const templateItems: Omit<VendorItem, "id" | "createdAt">[] = [
  {
    name: "Digital Art NFT - Abstract #1",
    description: "A beautiful abstract digital art piece perfect for collectors. High resolution, unique design.",
    price: "50000", // $0.05 USDC (6 decimals: 50000 = 0.05)
    paymentRequirements: createPaymentRequirements(
      {
        name: "Digital Art NFT - Abstract #1",
        description: "A beautiful abstract digital art piece perfect for collectors. High resolution, unique design.",
        price: "50000",
        network: "base", // Using Base mainnet with x402 v2
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet USDC
        assetName: "USDC",
        payTo: defaultPayTo || "0x0000000000000000000000000000000000000000", // Will use defaultPayTo or be replaced with user's address
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400",
      },
      `${baseUrl}/api/item/digital-art-1`
    ),
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400",
  },
  {
    name: "Premium API Access - 1 Month",
    description: "Full access to our premium API endpoints for one month. Includes 10,000 requests and priority support.",
    price: "1000000", // $1.00 USDC
    paymentRequirements: createPaymentRequirements(
      {
        name: "Premium API Access - 1 Month",
        description: "Full access to our premium API endpoints for one month. Includes 10,000 requests and priority support.",
        price: "1000000",
        network: "base", // Using Base mainnet with x402 v2
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet USDC
        assetName: "USDC",
        payTo: "0x0000000000000000000000000000000000000000",
        imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400",
      },
      `${baseUrl}/api/item/api-access-1month`
    ),
    imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400",
  },
  {
    name: "E-Book: Web3 Development Guide",
    description: "Comprehensive guide to Web3 development covering smart contracts, DeFi, and blockchain integration. PDF format, 300+ pages.",
    price: "250000", // $0.25 USDC
    paymentRequirements: createPaymentRequirements(
      {
        name: "E-Book: Web3 Development Guide",
        description: "Comprehensive guide to Web3 development covering smart contracts, DeFi, and blockchain integration. PDF format, 300+ pages.",
        price: "250000",
        network: "base", // Using Base mainnet with x402 v2
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet USDC
        assetName: "USDC",
        payTo: "0x0000000000000000000000000000000000000000",
        imageUrl: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400",
      },
      `${baseUrl}/api/item/ebook-web3-guide`
    ),
    imageUrl: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400",
  },
  {
    name: "Custom Logo Design",
    description: "Professional logo design service. Includes 3 initial concepts, 2 rounds of revisions, and final files in multiple formats.",
    price: "100000", // $0.10 USDC
    paymentRequirements: createPaymentRequirements(
      {
        name: "Custom Logo Design",
        description: "Professional logo design service. Includes 3 initial concepts, 2 rounds of revisions, and final files in multiple formats.",
        price: "100000",
        network: "base", // Using Base mainnet with x402 v2
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet USDC
        assetName: "USDC",
        payTo: "0x0000000000000000000000000000000000000000",
        imageUrl: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400",
      },
      `${baseUrl}/api/item/logo-design`
    ),
    imageUrl: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400",
  },
  {
    name: "Premium Course: Solidity Mastery",
    description: "Complete Solidity programming course with 50+ hours of video content, coding exercises, and certificate of completion.",
    price: "750000", // $0.75 USDC
    paymentRequirements: createPaymentRequirements(
      {
        name: "Premium Course: Solidity Mastery",
        description: "Complete Solidity programming course with 50+ hours of video content, coding exercises, and certificate of completion.",
        price: "750000",
        network: "base", // Using Base mainnet with x402 v2
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet USDC
        assetName: "USDC",
        payTo: "0x0000000000000000000000000000000000000000",
        imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400",
      },
      `${baseUrl}/api/item/solidity-course`
    ),
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400",
  },
]

export function createItemFromTemplate(
  template: Omit<VendorItem, "id" | "createdAt">,
  payToAddress: string
): VendorItem {
  // Use provided address, or fall back to default from env, or use the template's default
  const finalPayTo = payToAddress || defaultPayTo || template.paymentRequirements.payTo
  
  return {
    ...template,
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
    paymentRequirements: {
      ...template.paymentRequirements,
      payTo: finalPayTo,
    },
  }
}

