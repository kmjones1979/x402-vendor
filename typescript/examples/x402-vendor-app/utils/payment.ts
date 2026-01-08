import type { PaymentRequirements, PaymentIntent, Payment, PaymentPayload, FacilitatorConfig } from "x402/types"
import { facilitator } from "@coinbase/x402"
import { FACILITATOR_URL } from "./constants"
import type { CreateItemFormData } from "@/types/item"
import type { Hash } from "viem"

export function createPaymentRequirements(
  formData: CreateItemFormData,
  resource: string
): PaymentRequirements {
  // Use x402 v1 with friendly network names (as per CDP facilitator documentation)
  // The CDP facilitator supports Base mainnet with x402 v1 and network: "base"
  return {
    asset: formData.asset,
    scheme: "exact",
    network: formData.network, // Use friendly network names (e.g., "base")
    payTo: formData.payTo,
    description: formData.description,
    maxAmountRequired: formData.price,
    resource,
    mimeType: "application/json",
    maxTimeoutSeconds: 300,
    extra: formData.assetName
      ? {
          // For USDC on Base mainnet, the EIP-712 domain name is "USD Coin" (not "USDC")
          // The domain version is "2" (the contract version, not the x402 version)
          name: formData.assetName === "USDC" ? "USD Coin" : formData.assetName,
          version: "2", // EIP-712 domain version for USDC contract (not x402 version)
        }
      : undefined,
  }
}

export function getFacilitatorConfig(): FacilitatorConfig {
  // If CDP API keys are provided, use the CDP facilitator helper
  // which automatically handles authentication
  const cdpApiKeyId = process.env.CDP_API_KEY_ID
  const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET
  
  // Note: CDP facilitator might only support x402 v2
  // For x402 v1, we should use the testnet facilitator
  // Check if we're using v1 by checking the facilitator URL
  const facilitatorUrl = process.env.NEXT_PUBLIC_FACILITATOR_URL || process.env.FACILITATOR_URL || FACILITATOR_URL
  const isCDPFacilitator = facilitatorUrl.includes("api.cdp.coinbase.com")
  
  if (cdpApiKeyId && cdpApiKeySecret && isCDPFacilitator) {
    // Use the facilitator from @coinbase/x402 which handles CDP auth automatically
    // It reads CDP_API_KEY_ID and CDP_API_KEY_SECRET from environment
    return facilitator
  }
  
  // Otherwise, use the configured facilitator URL without auth
  // This will use the testnet facilitator for x402 v1
  return { url: FACILITATOR_URL }
}

/**
 * Create a payment intent via the x402 facilitator (via Next.js API route)
 */
export async function createPaymentIntent(
  requirements: PaymentRequirements,
  payerAddress: string
): Promise<PaymentIntent> {
  const response = await fetch("/api/payment-intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requirements,
      payer: payerAddress,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create payment intent: ${error}`)
  }

  return response.json()
}

/**
 * Submit a signed payment to the facilitator for settlement (via Next.js API route)
 */
export async function submitPayment(
  paymentIntent: PaymentIntent,
  signature: string,
  signedPaymentPayload?: PaymentPayload
): Promise<Payment & { settlementTxHash?: string; status?: string }> {
  const response = await fetch("/api/payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentIntent,
      signature,
      signedPaymentPayload, // Include the full signed payload from SDK
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to submit payment: ${error}`)
  }

  return response.json()
}

/**
 * Get payment status - payments are settled immediately, so we return the payment status
 * This is a simplified version - in production, you might want to track payment status in a database
 */
export async function getPaymentStatus(paymentId: string): Promise<{
  status: string
  settlementTxHash?: Hash
}> {
  // Since payments are settled immediately via the API route,
  // we don't need to poll. This is kept for API compatibility.
  // In a real implementation, you might store payment status in a database.
  return {
    status: "settled",
  }
}

