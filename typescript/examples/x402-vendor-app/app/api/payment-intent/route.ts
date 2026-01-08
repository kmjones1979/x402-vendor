// Server-side API route to create payment intents via x402 facilitator
import { NextRequest, NextResponse } from "next/server"
import { exact } from "x402/schemes"
import type { PaymentRequirements, UnsignedPaymentPayload, PaymentPayload } from "x402/types"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requirements, payer }: { requirements: PaymentRequirements; payer: string } = body

    if (!requirements || !payer) {
      return NextResponse.json(
        { error: "Missing requirements or payer" },
        { status: 400 }
      )
    }

    // Use x402 v1 with friendly network names (as per CDP facilitator documentation)
    // The CDP facilitator supports Base mainnet with x402 v1 and network: "base"
    const unsignedPaymentPayload = exact.evm.preparePaymentHeader(
      payer as `0x${string}`,
      1, // x402 version 1 (as per CDP facilitator documentation)
      requirements // Use friendly network names (e.g., "base")
    )

    // Create a temporary PaymentPayload with undefined signature to encode it
    // The message to sign is the encoded payment payload
    const tempPayload: PaymentPayload = {
      ...unsignedPaymentPayload,
      payload: {
        ...unsignedPaymentPayload.payload,
        signature: "", // Temporary, will be replaced after signing
      },
    }
    
    // Encode the payment to get the message to sign
    // Actually, we need to sign the authorization object, not the encoded payment
    // For EVM, the message to sign is typically the EIP-712 structured data
    // Let's use the authorization object directly
    const messageToSign = JSON.stringify(unsignedPaymentPayload.payload.authorization)

    const paymentIntent = {
      id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requirements, // Use original requirements with friendly network names for v1
      payer,
      messageToSign,
      unsignedPaymentPayload, // Include the full unsigned payload for proper payment construction
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json(paymentIntent)
  } catch (error) {
    console.error("Error creating payment intent:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payment intent" },
      { status: 500 }
    )
  }
}

