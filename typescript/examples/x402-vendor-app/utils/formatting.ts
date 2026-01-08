import type { PaymentRequirements } from "x402/types"

export function formatPrice(
  price: string,
  requirements: PaymentRequirements
): string {
  const amount = BigInt(price)
  const decimals = 6 // Default for USDC, could be made configurable
  const divisor = BigInt(10 ** decimals)
  const whole = amount / divisor
  const fractional = amount % divisor

  const assetName =
    (requirements.extra as { name?: string })?.name || "Tokens"

  if (fractional === BigInt(0)) {
    return `${whole} ${assetName}`
  }

  const fractionalStr = fractional.toString().padStart(decimals, "0")
  const trimmed = fractionalStr.replace(/0+$/, "")
  return `${whole}.${trimmed} ${assetName}`
}

export function formatAddress(address: string): string {
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

