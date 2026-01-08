"use client"

import { useState, useEffect } from "react"
import { useAccount, useWalletClient, useWaitForTransactionReceipt, useChainId, useSwitchChain } from "wagmi"
import { base, baseSepolia, mainnet } from "wagmi/chains"
import { exact } from "x402/schemes"
import type { VendorItem } from "@/types/item"
import { formatPrice } from "@/utils/formatting"
import { createPaymentIntent, submitPayment } from "@/utils/payment"
import type { PaymentIntent, Payment, PaymentPayload } from "x402/types"

interface PurchaseModalProps {
  item: VendorItem
  onClose: () => void
  onComplete: () => void
}

// Helper function to extract chain ID from network (supports both friendly names and CAIP-2 format)
function getChainIdFromNetwork(network: string): number | null {
  // Handle CAIP-2 format: eip155:8453
  if (network.startsWith("eip155:")) {
    const chainId = parseInt(network.split(":")[1], 10)
    if (!isNaN(chainId)) {
      return chainId
    }
  }
  
  // Handle friendly names
  const networkMap: Record<string, number> = {
    "base-sepolia": baseSepolia.id,
    "base": base.id,
    "mainnet": mainnet.id,
    "ethereum": mainnet.id,
  }
  
  return networkMap[network] || null
}

export function PurchaseModal({
  item,
  onClose,
  onComplete,
}: PurchaseModalProps) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [settlementTxHash, setSettlementTxHash] = useState<string | null>(null)

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: settlementTxHash as `0x${string}` | undefined,
    enabled: !!settlementTxHash,
  })

  // Note: Settlement happens immediately via the facilitator API
  // The settlementTxHash is returned directly in the submitPayment response
  // No need to poll - the hash is set immediately when payment is submitted

  // Handle transaction confirmation - don't auto-close, let user close manually
  useEffect(() => {
    if (isConfirmed && settlementTxHash) {
      // Call onComplete to update parent state, but don't close modal
      // The modal will stay open until user manually closes it
      onComplete()
    }
  }, [isConfirmed, settlementTxHash, onComplete])

  const handlePurchase = async () => {
    if (!isConnected || !walletClient || !address) {
      setError("Please connect your wallet first")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const requirements = item.paymentRequirements

      // Step 0: Switch to the correct network if needed
      const requiredChainId = getChainIdFromNetwork(requirements.network)
      if (requiredChainId && chainId !== requiredChainId) {
        try {
          await switchChain({ chainId: requiredChainId })
          // Wait a bit for the chain switch to complete
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } catch (switchError) {
          throw new Error(
            `Please switch to ${requirements.network} network in your wallet`
          )
        }
      }

      // Step 1: Create payment intent via x402 facilitator
      // Ensure extra.name is "USD Coin" for USDC (not "USDC") to match the contract's EIP-712 domain
      const signingRequirements = {
        ...requirements,
        extra: requirements.extra
          ? {
              ...requirements.extra,
              // Convert "USDC" to "USD Coin" for the EIP-712 domain (required for USDC contract on Base)
              name:
                (requirements.extra as { name?: string })?.name === "USDC"
                  ? "USD Coin"
                  : (requirements.extra as { name?: string })?.name || undefined,
            }
          : undefined,
      }
      
      const intent = await createPaymentIntent(signingRequirements, address)
      setPaymentIntent(intent)

      if (!intent.unsignedPaymentPayload) {
        throw new Error("Payment intent missing unsigned payment payload")
      }

      // Step 2: Sign the payment using EIP-712
      // For x402 v1 with friendly network names, we can use the SDK's signPaymentHeader
      // Use signingRequirements (with corrected "USD Coin") instead of original requirements
      const signedPaymentPayload = await exact.evm.signPaymentHeader(
        walletClient,
        signingRequirements,
        intent.unsignedPaymentPayload
      )

      // Step 3: Submit the signed payment to the facilitator
      // Send the full signed payload to ensure we use exactly what the SDK created
      const signature = signedPaymentPayload.payload.signature
      const submittedPayment = await submitPayment(intent, signature, signedPaymentPayload)
      setPayment(submittedPayment)

      // Step 4: The facilitator settles the payment immediately
      // Extract the settlement transaction hash from the response
      if (submittedPayment.settlementTxHash) {
        setSettlementTxHash(submittedPayment.settlementTxHash)
        setIsProcessing(false)
        onComplete()
      } else {
        // If no hash yet, the payment might still be processing
        setIsProcessing(false)
      }
    } catch (err) {
      console.error("Payment error:", err)
      setError(
        err instanceof Error ? err.message : "Payment failed. Please try again."
      )
      setIsProcessing(false)
      setPaymentIntent(null)
      setPayment(null)
    }
  }

  // Prevent closing on overlay click when transaction is confirmed
  const handleOverlayClick = () => {
    // Only allow closing if transaction is not confirmed
    // This prevents accidental closing after successful purchase
    if (!isConfirmed) {
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Purchase {item.name}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p>{item.description}</p>
          <div className="purchase-details">
            <div className="detail-row">
              <span>Price:</span>
              <strong>{formatPrice(item.price, item.paymentRequirements)}</strong>
            </div>
            <div className="detail-row">
              <span>Network:</span>
              <span>{item.paymentRequirements.network}</span>
            </div>
            <div className="detail-row">
              <span>Asset:</span>
              <span>{item.paymentRequirements.asset}</span>
            </div>
            <div className="detail-row">
              <span>Pay To:</span>
              <span>{item.paymentRequirements.payTo}</span>
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>
        <div className="modal-footer">
          <button 
            onClick={onClose} 
            disabled={isProcessing || isConfirming}
          >
            {isConfirmed ? "Close" : "Cancel"}
          </button>
          {!isConfirmed && (
            <button
              onClick={handlePurchase}
              disabled={isProcessing || isConfirming || !isConnected}
              className="purchase-button"
            >
              {isProcessing || isConfirming
                ? "Processing..."
                : "Confirm Purchase"}
            </button>
          )}
        </div>
        {paymentIntent && (
          <div className="transaction-status">
            <div className="transaction-header">
              <div className="transaction-status-indicator">
                {isConfirmed ? (
                  <div className="status-icon success">✓</div>
                ) : payment ? (
                  <div className="status-icon pending">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <div className="status-icon pending">⏳</div>
                )}
                <span className="status-text">
                  {isConfirmed
                    ? "Payment Settled"
                    : payment
                      ? "Waiting for Settlement"
                      : "Payment Intent Created"}
                </span>
              </div>
            </div>
            <div className="transaction-details">
              {paymentIntent && (
                <div className="payment-info">
                  <p className="info-label">Payment Intent ID:</p>
                  <code className="info-value">{paymentIntent.id}</code>
                </div>
              )}
              {payment && (
                <div className="payment-info">
                  <p className="info-label">Payment ID:</p>
                  <code className="info-value">{payment.id}</code>
                </div>
              )}
              {settlementTxHash && (
                <div className="transaction-hash">
                  <span className="hash-label">Settlement Transaction Hash:</span>
                  <div className="hash-value">
                    <code>{settlementTxHash}</code>
                    <button
                      className="copy-button"
                      onClick={() => {
                        navigator.clipboard.writeText(settlementTxHash)
                        alert("Transaction hash copied to clipboard!")
                      }}
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  </div>
                </div>
              )}
              {payment && !settlementTxHash && (
                <div className="transaction-progress">
                  <p>Waiting for facilitator to settle payment...</p>
                  <div className="progress-bar">
                    <div className="progress-fill"></div>
                  </div>
                </div>
              )}
              {isConfirming && settlementTxHash && (
                <div className="transaction-progress">
                  <p>Confirming settlement transaction...</p>
                  <div className="progress-bar">
                    <div className="progress-fill"></div>
                  </div>
                </div>
              )}
              {isConfirmed && (
                <div className="transaction-success">
                  <p>✅ Payment successful! Your purchase is complete.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

