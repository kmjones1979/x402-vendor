// Server-side API route to submit payments via x402 facilitator
import { NextRequest, NextResponse } from "next/server"
import { useFacilitator } from "x402/verify"
import { getFacilitatorConfig } from "@/utils/payment"
import type { PaymentIntent, Payment, PaymentPayload, UnsignedPaymentPayload } from "x402/types"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      paymentIntent, 
      signature, 
      signedPaymentPayload 
    }: { 
      paymentIntent: PaymentIntent & { unsignedPaymentPayload?: UnsignedPaymentPayload }
      signature: string
      signedPaymentPayload?: PaymentPayload
    } = body

    if (!paymentIntent || !signature) {
      return NextResponse.json(
        { error: "Missing paymentIntent or signature" },
        { status: 400 }
      )
    }

    // Validate payment intent structure
    if (!paymentIntent.requirements || !paymentIntent.payer) {
      return NextResponse.json(
        { error: "Invalid payment intent structure" },
        { status: 400 }
      )
    }

    // Use the signed payload from the client if provided (preferred - ensures exact SDK structure)
    // Otherwise, reconstruct it from the unsigned payload and signature
    let paymentPayload: PaymentPayload
    
    if (signedPaymentPayload) {
      // Use the exact signed payload from the SDK
      console.log("Using signed payment payload from client (SDK-generated)")
      console.log("Signed payload structure:", {
        x402Version: signedPaymentPayload.x402Version,
        scheme: signedPaymentPayload.scheme,
        network: signedPaymentPayload.network,
        hasPayload: !!signedPaymentPayload.payload,
        hasAuthorization: !!signedPaymentPayload.payload?.authorization,
        hasSignature: !!signedPaymentPayload.payload?.signature,
      })
      
      // Validate the signed payload structure
      if (!signedPaymentPayload.payload || !signedPaymentPayload.payload.authorization || !signedPaymentPayload.payload.signature) {
        console.error("Invalid signedPaymentPayload structure:", {
          hasPayload: !!signedPaymentPayload.payload,
          hasAuthorization: !!signedPaymentPayload.payload?.authorization,
          hasSignature: !!signedPaymentPayload.payload?.signature,
          payloadKeys: Object.keys(signedPaymentPayload.payload || {}),
        })
        throw new Error("Invalid signedPaymentPayload: missing payload, authorization, or signature")
      }
      
      paymentPayload = signedPaymentPayload
    } else {
      // Fallback: reconstruct from unsigned payload and signature
      if (!paymentIntent.unsignedPaymentPayload) {
        throw new Error("unsignedPaymentPayload is required when signedPaymentPayload is not provided")
      }
      
      const unsigned = paymentIntent.unsignedPaymentPayload
      
      // Validate the unsigned payload structure
      if (!unsigned.payload || !unsigned.payload.authorization) {
        console.error("Invalid unsigned payload structure:", {
          hasPayload: !!unsigned.payload,
          hasAuthorization: !!(unsigned.payload?.authorization),
          unsignedKeys: Object.keys(unsigned),
        })
        throw new Error("Invalid unsignedPaymentPayload structure: missing payload.authorization")
      }
      
      // Reconstruct the signed PaymentPayload
      // For x402 v1, we use friendly network names (e.g., "base") as per CDP facilitator documentation
      console.log("Reconstructing payment payload from unsigned payload and signature")
      paymentPayload = {
        x402Version: unsigned.x402Version, // Should be 1 for x402 v1
        scheme: unsigned.scheme,
        network: unsigned.network, // Friendly network name (e.g., "base")
        payload: {
          authorization: {
            from: unsigned.payload.authorization.from,
            to: unsigned.payload.authorization.to,
            value: unsigned.payload.authorization.value,
            validAfter: unsigned.payload.authorization.validAfter,
            validBefore: unsigned.payload.authorization.validBefore,
            nonce: unsigned.payload.authorization.nonce,
          },
          signature,
        },
      } as PaymentPayload
    }
    
    console.log("Constructed payment payload:", {
      x402Version: paymentPayload.x402Version,
      scheme: paymentPayload.scheme,
      network: paymentPayload.network,
      hasAuthorization: !!paymentPayload.payload?.authorization,
      hasSignature: !!paymentPayload.payload?.signature,
      requirementsExtra: paymentIntent.requirements.extra,
    })
    
    // Log authorization details for debugging
    if (paymentPayload.payload?.authorization) {
      const auth = paymentPayload.payload.authorization
      const now = Math.floor(Date.now() / 1000)
      console.log("Authorization details:", {
        from: auth.from,
        to: auth.to,
        value: auth.value,
        validAfter: auth.validAfter,
        validBefore: auth.validBefore,
        nonce: auth.nonce,
        signature: paymentPayload.payload.signature?.substring(0, 20) + "...",
        currentTime: now,
        validAfterTime: typeof auth.validAfter === "string" ? parseInt(auth.validAfter, 10) : auth.validAfter,
        validBeforeTime: typeof auth.validBefore === "string" ? parseInt(auth.validBefore, 10) : auth.validBefore,
        isCurrentlyValid: now >= (typeof auth.validAfter === "string" ? parseInt(auth.validAfter, 10) : auth.validAfter) && 
                          now <= (typeof auth.validBefore === "string" ? parseInt(auth.validBefore, 10) : auth.validBefore),
      })
    }
    
    // Log requirements for debugging
    console.log("Payment requirements:", {
      asset: paymentIntent.requirements.asset,
      network: paymentIntent.requirements.network,
      payTo: paymentIntent.requirements.payTo,
      maxAmountRequired: paymentIntent.requirements.maxAmountRequired,
      extra: paymentIntent.requirements.extra,
    })

    console.log("Settling payment with facilitator:", {
      paymentIntentId: paymentIntent.id,
      payer: paymentIntent.payer,
      requirements: paymentIntent.requirements,
    })

    // Use the facilitator to settle the payment
    const facilitator = useFacilitator(getFacilitatorConfig())
    
    // Check what networks the facilitator supports
    try {
      console.log("Checking facilitator supported networks...")
      const supported = await facilitator.supported()
      console.log("Facilitator supported networks:", JSON.stringify(supported, null, 2))
    } catch (supportedError) {
      console.warn("Could not check facilitator supported networks:", supportedError)
    }
    
    // Log the full payment payload and requirements before settlement
    console.log("Payment payload for settlement:", JSON.stringify(paymentPayload, null, 2))
    console.log("Payment requirements for settlement:", JSON.stringify(paymentIntent.requirements, null, 2))
    
    // Settle the payment via facilitator
    // The settle function expects PaymentPayload directly and will verify automatically
    let settlementTxHash: string
    try {
      // Log the full payment payload structure before settling
      console.log("Full payment payload being sent to facilitator:", JSON.stringify(paymentPayload, null, 2))
      console.log("Payment payload type:", typeof paymentPayload)
      console.log("Payment payload keys:", Object.keys(paymentPayload || {}))
      console.log("Authorization keys:", Object.keys(paymentPayload?.payload?.authorization || {}))
      
      // Verify the payment first to catch signature/authorization issues before attempting settlement
      console.log("Verifying payment with facilitator...")
      
      // Call verify endpoint directly to get detailed error information
      const facilitatorConfig = getFacilitatorConfig()
      const facilitatorUrl = facilitatorConfig.url || "https://api.cdp.coinbase.com/platform/v2/x402"
      
      // Prepare auth headers if using CDP facilitator
      let verifyHeaders: Record<string, string> = { "Content-Type": "application/json" }
      if (facilitatorConfig.createAuthHeaders) {
        const authHeaders = await facilitatorConfig.createAuthHeaders()
        verifyHeaders = { ...verifyHeaders, ...authHeaders.verify }
      }
      
      // Helper to convert values to JSON-safe format (BigInt, etc.)
      const toJsonSafe = (obj: any): any => {
        if (obj === null || obj === undefined) return obj
        if (typeof obj === "bigint") return obj.toString()
        if (Array.isArray(obj)) return obj.map(toJsonSafe)
        if (typeof obj === "object" && !Array.isArray(obj)) {
          return Object.fromEntries(
            Object.entries(obj).map(([key, val]) => [key, toJsonSafe(val)])
          )
        }
        return obj
      }
      
      // Prepare verify request body - the verify endpoint expects { x402Version, paymentPayload, paymentRequirements }
      // Ensure paymentPayload has the correct structure
      const safePaymentPayload = toJsonSafe(paymentPayload)
      
      // Validate paymentPayload structure before sending
      if (!safePaymentPayload.x402Version || !safePaymentPayload.scheme || !safePaymentPayload.network) {
        console.error("Invalid paymentPayload structure:", {
          hasX402Version: !!safePaymentPayload.x402Version,
          hasScheme: !!safePaymentPayload.scheme,
          hasNetwork: !!safePaymentPayload.network,
          payloadKeys: Object.keys(safePaymentPayload),
        })
        throw new Error("Invalid paymentPayload: missing x402Version, scheme, or network")
      }
      
      if (!safePaymentPayload.payload || !safePaymentPayload.payload.authorization || !safePaymentPayload.payload.signature) {
        console.error("Invalid paymentPayload.payload structure:", {
          hasPayload: !!safePaymentPayload.payload,
          hasAuthorization: !!safePaymentPayload.payload?.authorization,
          hasSignature: !!safePaymentPayload.payload?.signature,
          payloadKeys: Object.keys(safePaymentPayload.payload || {}),
        })
        throw new Error("Invalid paymentPayload: missing payload, authorization, or signature")
      }
      
      const verifyRequestBody = {
        x402Version: typeof safePaymentPayload.x402Version === "string" 
          ? parseInt(safePaymentPayload.x402Version, 10) 
          : safePaymentPayload.x402Version,
        paymentPayload: safePaymentPayload,
        paymentRequirements: toJsonSafe(paymentIntent.requirements),
      }
      
      console.log("Verify request body:", JSON.stringify(verifyRequestBody, null, 2))
      console.log("PaymentPayload structure validation:", {
        x402Version: verifyRequestBody.x402Version,
        hasPaymentPayload: !!verifyRequestBody.paymentPayload,
        paymentPayloadKeys: Object.keys(verifyRequestBody.paymentPayload),
        hasPayloadField: !!verifyRequestBody.paymentPayload.payload,
        payloadKeys: Object.keys(verifyRequestBody.paymentPayload.payload || {}),
      })
      
      try {
        const verifyResponse = await fetch(`${facilitatorUrl}/verify`, {
          method: "POST",
          headers: verifyHeaders,
          body: JSON.stringify(verifyRequestBody),
        })
        
        if (!verifyResponse.ok) {
          let errorBody = ""
          try {
            errorBody = await verifyResponse.text()
            console.error("Verify error response body:", errorBody)
            
            // Try to parse as JSON to get structured error
            try {
              const errorJson = JSON.parse(errorBody)
              console.error("Verify error JSON:", JSON.stringify(errorJson, null, 2))
              console.error("Full verify request that failed:", JSON.stringify(verifyRequestBody, null, 2))
              
              // Extract more details from error
              const errorDetails = errorJson.invalidReason || errorJson.errorMessage || errorJson.message || errorBody
              throw new Error(
                `Payment verification failed: ${verifyResponse.status} ${verifyResponse.statusText} - ${errorDetails}`
              )
            } catch (parseError) {
              // Not JSON, use as-is
              throw new Error(
                `Payment verification failed: ${verifyResponse.status} ${verifyResponse.statusText} - ${errorBody}`
              )
            }
          } catch (e) {
            if (e instanceof Error) {
              throw e
            }
            console.error("Could not read verify error response body:", e)
            throw new Error(
              `Payment verification failed: ${verifyResponse.status} ${verifyResponse.statusText}`
            )
          }
        }
        
        const verifyResult = await verifyResponse.json()
        console.log("Payment verification result:", JSON.stringify(verifyResult, null, 2))
        
        // Check both 'valid' and 'isValid' (CDP facilitator uses 'isValid')
        const isValid = verifyResult.valid !== undefined ? verifyResult.valid : verifyResult.isValid
        
        if (!isValid) {
          const errorReason = verifyResult.reason || verifyResult.error || verifyResult.errorMessage || verifyResult.message || JSON.stringify(verifyResult)
          console.error("Payment verification failed:", errorReason)
          console.error("Full verify result:", JSON.stringify(verifyResult, null, 2))
          throw new Error(`Payment verification failed: ${errorReason}`)
        }
        console.log("✓ Payment verification passed")
      } catch (verifyError) {
        console.error("Payment verification error:", verifyError)
        // If verification fails, don't attempt settlement
        if (verifyError instanceof Error) {
          throw new Error(`Payment verification failed: ${verifyError.message}`)
        }
        throw new Error(`Payment verification failed: ${String(verifyError)}`)
      }
      
      // Manually call the facilitator API to capture detailed error messages
      // Prepare auth headers if using CDP facilitator
      let headers: Record<string, string> = { "Content-Type": "application/json" }
      if (facilitatorConfig.createAuthHeaders) {
        const authHeaders = await facilitatorConfig.createAuthHeaders()
        headers = { ...headers, ...authHeaders.settle }
      }
      
      // Prepare the request body exactly as the SDK does
      // Ensure x402Version is a number (not a string)
      const requestBody = {
        x402Version: typeof paymentPayload.x402Version === "string" 
          ? parseInt(paymentPayload.x402Version, 10) 
          : paymentPayload.x402Version,
        paymentPayload: toJsonSafe(paymentPayload),
        paymentRequirements: toJsonSafe(paymentIntent.requirements),
      }
      
      // Log the exact request body being sent with type information
      console.log("Request body being sent to facilitator:", JSON.stringify(requestBody, null, 2))
      console.log("Request body types:", {
        x402Version: typeof requestBody.x402Version,
        paymentPayloadType: typeof requestBody.paymentPayload,
        paymentRequirementsType: typeof requestBody.paymentRequirements,
      })
      console.log("Request body keys:", Object.keys(requestBody))
      console.log("paymentPayload keys:", Object.keys(requestBody.paymentPayload || {}))
      console.log("paymentPayload.payload keys:", Object.keys(requestBody.paymentPayload?.payload || {}))
      console.log("paymentPayload.x402Version type:", typeof requestBody.paymentPayload?.x402Version)
      console.log("paymentPayload.network:", requestBody.paymentPayload?.network)
      console.log("paymentPayload.scheme:", requestBody.paymentPayload?.scheme)
      
      // Make the request manually to capture the actual error response
      const settleResponse = await fetch(`${facilitatorUrl}/settle`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      })
      
      if (!settleResponse.ok) {
        // Try to get the error response body
        let errorBody = ""
        try {
          errorBody = await settleResponse.text()
          console.error("Facilitator settlement error response body:", errorBody)
          
          // Try to parse as JSON to get structured error
          try {
            const errorJson = JSON.parse(errorBody)
            console.error("Settlement error JSON:", JSON.stringify(errorJson, null, 2))
            
            // Log authorization details for debugging settlement failures
            if (paymentPayload.payload?.authorization) {
              const auth = paymentPayload.payload.authorization
              const now = Math.floor(Date.now() / 1000)
              console.error("Authorization at settlement time:", {
                from: auth.from,
                to: auth.to,
                value: auth.value,
                validAfter: auth.validAfter,
                validBefore: auth.validBefore,
                nonce: auth.nonce,
                currentTime: now,
                validAfterTime: typeof auth.validAfter === "string" ? parseInt(auth.validAfter, 10) : auth.validAfter,
                validBeforeTime: typeof auth.validBefore === "string" ? parseInt(auth.validBefore, 10) : auth.validBefore,
                isCurrentlyValid: now >= (typeof auth.validAfter === "string" ? parseInt(auth.validAfter, 10) : auth.validAfter) && 
                                  now <= (typeof auth.validBefore === "string" ? parseInt(auth.validBefore, 10) : auth.validBefore),
                timeUntilValid: (typeof auth.validAfter === "string" ? parseInt(auth.validAfter, 10) : auth.validAfter) - now,
                timeUntilExpired: (typeof auth.validBefore === "string" ? parseInt(auth.validBefore, 10) : auth.validBefore) - now,
              })
            }
            
            throw new Error(
              `Failed to settle payment: ${settleResponse.status} ${settleResponse.statusText} - ${errorJson.errorMessage || errorJson.errorReason || errorJson.message || errorBody}`
            )
          } catch (parseError) {
            // Not JSON, use as-is
            throw new Error(
              `Failed to settle payment: ${settleResponse.status} ${settleResponse.statusText} - ${errorBody}`
            )
          }
        } catch (e) {
          console.error("Could not read error response body:", e)
          throw new Error(
            `Failed to settle payment: ${settleResponse.status} ${settleResponse.statusText}`
          )
        }
      }
      
      const settleData = await settleResponse.json()
      settlementTxHash = settleData.settlementTxHash || settleData.txHash || settleData.hash || settleData.transaction
      
      console.log("Payment settled successfully:", settlementTxHash)
    } catch (settleError) {
      console.error("Facilitator settle error:", settleError)
      console.error("Error stack:", settleError instanceof Error ? settleError.stack : "No stack")
      console.error("Payment payload that failed:", JSON.stringify(paymentPayload, null, 2))
      
      // Try to get more details from the error
      let errorMessage = "Unknown error"
      if (settleError instanceof Error) {
        errorMessage = settleError.message
        // Check if there's a response body with more details
        if (settleError.cause && typeof settleError.cause === "object") {
          console.error("Error cause:", settleError.cause)
        }
      } else {
        errorMessage = String(settleError)
      }
      
      // Provide a more user-friendly error message for settlement failures
      let userFriendlyError = errorMessage
      if (errorMessage.includes("settle_exact_node_failure")) {
        userFriendlyError = "Payment settlement failed on-chain. This could be due to:\n" +
          "1. Insufficient USDC balance in your wallet\n" +
          "2. The authorization nonce has already been used\n" +
          "3. Network congestion or contract execution failure\n\n" +
          `Original error: ${errorMessage}`
      }
      
      throw new Error(`Facilitator settlement failed: ${userFriendlyError}`)
    }

    return NextResponse.json({
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      payload: paymentPayload,
      settlementTxHash,
      status: "settled",
    })
  } catch (error) {
    console.error("Error submitting payment:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to submit payment"
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error("Error details:", { errorMessage, errorStack, error })
    return NextResponse.json(
      { 
        error: `Failed to settle payment: ${errorMessage}`,
        details: errorStack,
      },
      { status: 500 }
    )
  }
}

