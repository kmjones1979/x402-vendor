# x402 Vendor App

A production-ready example application for selling items over x402. This app demonstrates a complete x402 payment integration using wagmi, viem, WalletConnect, and the CDP facilitator for Base mainnet.

## Features

- 🛒 Create items for sale with configurable payment details
- 💰 Configure payment networks, assets, and amounts
- 🔗 Wallet integration with WalletConnect and Coinbase Wallet
- 💳 Complete x402 v1 payment flow with CDP facilitator
- 🔐 EIP-712 compliant signing for USDC on Base mainnet
- 📱 Responsive, modern UI with transaction status tracking
- ✅ Payment verification and settlement tracking

## Prerequisites

- Node.js 18+
- npm, pnpm, or yarn
- A WalletConnect Project ID (get one at [cloud.walletconnect.com](https://cloud.walletconnect.com))
- CDP API Keys for Base mainnet (get from [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com))

## SDK

Key packages used:
- `x402` - x402 protocol SDK
- `@coinbase/x402` - CDP facilitator helper
- `wagmi` - React Hooks for Ethereum
- `viem` - TypeScript interface for Ethereum
- `@web3modal/wagmi` - WalletConnect integration

## Setup

1. **Install dependencies:**

```bash
cd typescript/examples/x402-vendor-app
npm install
# or
pnpm install
```

2. **Configure environment variables:**

Create a `.env` file in the `x402-vendor-app` directory:

```bash
# WalletConnect Configuration (required)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id

# x402 Facilitator Configuration
# For CDP facilitator (Base mainnet): https://api.cdp.coinbase.com/platform/v2/x402
# For testnet facilitator: https://x402.org/facilitator
NEXT_PUBLIC_FACILITATOR_URL=https://api.cdp.coinbase.com/platform/v2/x402

# CDP API Keys (required for CDP facilitator on Base mainnet)
# Get your API keys from https://portal.cdp.coinbase.com
CDP_API_KEY_ID=your_cdp_api_key_id
CDP_API_KEY_SECRET=your_cdp_api_key_secret

# Default payment address (optional)
# Used as default for all items if not specified
AGENT_PAY_TO_ADDRESS=0x0000000000000000000000000000000000000000
```

**Required:**
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - Get from [cloud.walletconnect.com](https://cloud.walletconnect.com)

**For CDP Facilitator (Base mainnet):**
- `CDP_API_KEY_ID` - Get from [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)
- `CDP_API_KEY_SECRET` - Get from [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)
- `NEXT_PUBLIC_FACILITATOR_URL=https://api.cdp.coinbase.com/platform/v2/x402`

**For Testnet Facilitator (Base Sepolia):**
- `NEXT_PUBLIC_FACILITATOR_URL=https://x402.org/facilitator` (no API keys needed)

**Note**: The `.env` file should be in the `x402-vendor-app` directory (where `next.config.js` is located), not in the repository root.

3. **Run the development server:**

```bash
npm run dev
# or
pnpm dev
```

The app will run on `http://localhost:3010` (configured in `package.json`).

## Architecture

### Project Structure

```
x402-vendor-app/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Main page component
│   ├── providers.tsx           # Wagmi/React Query providers
│   ├── globals.css             # Global styles
│   └── api/
│       ├── config/
│       │   └── route.ts        # API route for config (exposes AGENT_PAY_TO_ADDRESS)
│       ├── payment-intent/
│       │   └── route.ts        # Creates payment intents
│       └── payment/
│           └── route.ts        # Submits and settles payments
├── components/
│   ├── CreateItemForm.tsx      # Form for creating items
│   ├── ItemList.tsx            # List of items for sale
│   ├── ItemCard.tsx            # Individual item card
│   ├── ItemDetailsModal.tsx    # Detailed item information
│   ├── PurchaseModal.tsx       # Purchase flow modal
│   └── TemplateItems.tsx       # Template items for quick setup
├── config/
│   └── wagmi.ts                # Wagmi configuration
├── types/
│   └── item.ts                 # TypeScript types
├── utils/
│   ├── payment.ts              # Payment utilities
│   ├── itemStorage.ts          # LocalStorage management
│   ├── formatting.ts           # Price/address formatting
│   ├── constants.ts             # Network/asset constants
│   ├── config.ts                # Config utilities
│   └── templateItems.ts        # Template item definitions
├── package.json
├── next.config.js              # Next.js configuration
└── tsconfig.json               # TypeScript configuration
```

### Core Components

#### Payment Flow Architecture

The app implements a complete x402 v1 payment flow with the following steps:

1. **Payment Intent Creation** (`/api/payment-intent`)
2. **EIP-712 Signing** (client-side with wagmi/viem)
3. **Payment Verification** (`/api/payment` → facilitator `/verify`)
4. **Payment Settlement** (`/api/payment` → facilitator `/settle`)

## Technical Deep Dive

### x402 Payment Flow

The complete payment flow is implemented as follows:

#### 1. Creating Payment Requirements

Payment requirements are created using the `createPaymentRequirements` function:

```typescript
// utils/payment.ts
export function createPaymentRequirements(
  formData: CreateItemFormData,
  resource: string
): PaymentRequirements {
  return {
    asset: formData.asset,                    // Token contract address
    scheme: "exact",                          // Payment scheme
    network: formData.network,                // Network (e.g., "base")
    payTo: formData.payTo,                    // Vendor address
    description: formData.description,
    maxAmountRequired: formData.price,        // Amount in smallest unit
    resource,                                  // Resource URL
    mimeType: "application/json",
    maxTimeoutSeconds: 300,
    extra: formData.assetName
      ? {
          // Critical: USDC on Base uses "USD Coin" as EIP-712 domain name
          name: formData.assetName === "USDC" ? "USD Coin" : formData.assetName,
          version: "2", // EIP-712 domain version for USDC contract
        }
      : undefined,
  }
}
```

**Key Points:**
- Uses x402 v1 with friendly network names ("base" not "eip155:8453")
- For USDC on Base mainnet, `extra.name` must be "USD Coin" (not "USDC")
- `extra.version` is "2" (the USDC contract's EIP-712 domain version, not x402 version)

#### 2. Payment Intent Creation

Payment intents are created server-side via `/api/payment-intent`:

```typescript
// app/api/payment-intent/route.ts
export async function POST(request: NextRequest) {
  const { requirements, payer } = await request.json()
  
  // Create unsigned payment payload using x402 SDK
  const unsignedPaymentPayload = exact.evm.preparePaymentHeader(
    payer as `0x${string}`,
    1, // x402 version 1
    requirements
  )
  
  return NextResponse.json({
    id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    requirements,
    payer,
    unsignedPaymentPayload, // Full unsigned payload for signing
    createdAt: new Date().toISOString(),
  })
}
```

**What happens:**
- `exact.evm.preparePaymentHeader` creates an unsigned payment authorization
- The authorization includes: `from`, `to`, `value`, `validAfter`, `validBefore`, `nonce`
- This is sent to the client for signing

#### 3. EIP-712 Signing (Client-Side)

The client signs the payment using EIP-712 structured data:

```typescript
// components/PurchaseModal.tsx
const handlePurchase = async () => {
  // Step 1: Create payment intent
  const intent = await createPaymentIntent(signingRequirements, address)
  
  // Step 2: Ensure correct EIP-712 domain name
  const signingRequirements = {
    ...requirements,
    extra: {
      ...requirements.extra,
      // Convert "USDC" to "USD Coin" for EIP-712 domain
      name: requirements.extra?.name === "USDC" ? "USD Coin" : requirements.extra?.name,
    },
  }
  
  // Step 3: Sign using SDK (handles EIP-712 automatically)
  const signedPaymentPayload = await exact.evm.signPaymentHeader(
    walletClient,
    signingRequirements,
    intent.unsignedPaymentPayload
  )
  
  // Step 4: Submit to facilitator
  const submittedPayment = await submitPayment(intent, signature, signedPaymentPayload)
  
  // Step 5: Extract settlement transaction hash
  if (submittedPayment.settlementTxHash) {
    setSettlementTxHash(submittedPayment.settlementTxHash)
  }
}
```

**EIP-712 Domain Structure:**

For USDC on Base mainnet, the EIP-712 domain is:

```json
{
  "name": "USD Coin",
  "version": "2",
  "chainId": 8453,
  "verifyingContract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
}
```

**EIP-712 Message Structure:**

```json
{
  "from": "0x...",
  "to": "0x...",
  "value": "50000",
  "validAfter": "1767880158",
  "validBefore": "1767881058",
  "nonce": "0x..."
}
```

#### 4. Payment Verification

Before settlement, the payment is verified:

```typescript
// app/api/payment/route.ts
// Verify the payment first
const verifyRequestBody = {
  x402Version: 1,
  paymentPayload: toJsonSafe(paymentPayload),
  paymentRequirements: toJsonSafe(paymentIntent.requirements),
}

const verifyResponse = await fetch(`${facilitatorUrl}/verify`, {
  method: "POST",
  headers: verifyHeaders,
  body: JSON.stringify(verifyRequestBody),
})

const verifyResult = await verifyResponse.json()
// Response: { "isValid": true, "payer": "0x..." }
```

**Verification checks:**
- Signature validity
- Authorization parameter validity
- Timestamp validity
- Nonce uniqueness

#### 5. Payment Settlement

After verification passes, the payment is settled:

```typescript
// app/api/payment/route.ts
const requestBody = {
  x402Version: 1,
  paymentPayload: toJsonSafe(paymentPayload),
  paymentRequirements: toJsonSafe(paymentIntent.requirements),
}

const settleResponse = await fetch(`${facilitatorUrl}/settle`, {
  method: "POST",
  headers: settleHeaders,
  body: JSON.stringify(requestBody),
})

const settleData = await settleResponse.json()
// Response: { "settlementTxHash": "0x..." }
```

**Settlement process:**
1. Facilitator calls `transferWithAuthorization` on the USDC contract
2. Contract verifies the EIP-712 signature
3. Transfers USDC from payer to vendor
4. Returns the transaction hash

### CDP Facilitator Integration

The app uses the CDP facilitator for Base mainnet, which requires API key authentication:

```typescript
// utils/payment.ts
import { facilitator } from "@coinbase/x402"

export function getFacilitatorConfig(): FacilitatorConfig {
  const cdpApiKeyId = process.env.CDP_API_KEY_ID
  const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET
  const facilitatorUrl = process.env.NEXT_PUBLIC_FACILITATOR_URL
  
  const isCDPFacilitator = facilitatorUrl?.includes("api.cdp.coinbase.com")
  
  if (cdpApiKeyId && cdpApiKeySecret && isCDPFacilitator) {
    // Use CDP facilitator helper (handles auth automatically)
    return facilitator
  }
  
  // Fallback to testnet facilitator
  return { url: FACILITATOR_URL }
}
```

**Authentication:**
- The `@coinbase/x402` package's `facilitator` helper automatically reads `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` from environment variables
- Creates Basic Auth headers for `/verify` and `/settle` endpoints
- No manual header construction needed

### Network Configuration

The app supports Base mainnet with x402 v1:

```typescript
// config/wagmi.ts
import { base } from "wagmi/chains"

export const config = createConfig({
  chains: [base], // Base mainnet (chainId: 8453)
  transports: {
    [base.id]: http(),
  },
  connectors: [
    walletConnect({ projectId }),
    coinbaseWallet({ appName: "x402 Vendor" }),
    injected(),
  ],
})
```

**Network Details:**
- **Base Mainnet**: Chain ID 8453
- **USDC Contract**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **x402 Version**: v1 (with friendly network names)
- **Network Format**: "base" (not "eip155:8453" for v1)

### API Routes

#### `/api/payment-intent` (POST)

Creates a payment intent with an unsigned payment payload.

**Request:**
```json
{
  "requirements": {
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "scheme": "exact",
    "network": "base",
    "payTo": "0x...",
    "maxAmountRequired": "50000",
    "extra": { "name": "USD Coin", "version": "2" }
  },
  "payer": "0x..."
}
```

**Response:**
```json
{
  "id": "pi_...",
  "requirements": { ... },
  "payer": "0x...",
  "unsignedPaymentPayload": {
    "x402Version": 1,
    "scheme": "exact",
    "network": "base",
    "payload": {
      "authorization": {
        "from": "0x...",
        "to": "0x...",
        "value": "50000",
        "validAfter": "1767880158",
        "validBefore": "1767881058",
        "nonce": "0x..."
      }
    }
  }
}
```

#### `/api/payment` (POST)

Submits a signed payment for verification and settlement.

**Request:**
```json
{
  "paymentIntent": { ... },
  "signature": "0x...",
  "signedPaymentPayload": {
    "x402Version": 1,
    "scheme": "exact",
    "network": "base",
    "payload": {
      "authorization": { ... },
      "signature": "0x..."
    }
  }
}
```

**Response:**
```json
{
  "id": "pay_...",
  "payload": { ... },
  "settlementTxHash": "0x...",
  "status": "settled"
}
```

**Process:**
1. Verifies payment with facilitator `/verify` endpoint
2. Settles payment with facilitator `/settle` endpoint
3. Returns settlement transaction hash

### Error Handling

The app includes comprehensive error handling:

```typescript
// Example error handling in PurchaseModal
try {
  const submittedPayment = await submitPayment(intent, signature, signedPaymentPayload)
  if (submittedPayment.settlementTxHash) {
    setSettlementTxHash(submittedPayment.settlementTxHash)
  }
} catch (err) {
  // Handle specific error types
  if (err.message.includes("settle_exact_node_failure")) {
    setError("Payment settlement failed. Check your USDC balance and try again.")
  } else {
    setError(err.message)
  }
}
```

**Common Errors:**
- `settle_exact_node_failure`: On-chain transaction failed (insufficient balance, invalid nonce, etc.)
- `Payment verification failed`: Signature or authorization invalid
- `Network mismatch`: Wallet on wrong network

## Usage

### Creating Items

1. Connect your wallet
2. Navigate to "Create Item" tab
3. Fill in item details:
   - **Item Name**: Product name
   - **Description**: Detailed description
   - **Price**: Amount in smallest unit (e.g., `50000` = 0.05 USDC)
   - **Network**: "base" (Base mainnet)
   - **Asset Address**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (Base USDC)
   - **Asset Name**: "USDC" (automatically converted to "USD Coin" for EIP-712)
   - **Payment Address**: Your vendor address (or use `AGENT_PAY_TO_ADDRESS`)
4. Click "Create Item"

### Purchasing Items

1. Browse items in "Browse Items" tab
2. Click "Purchase" on an item
3. Review payment details in modal
4. Click "Confirm Purchase"
5. Approve EIP-712 signature in wallet
6. Wait for settlement (transaction hash displayed)

### Template Items

The app includes template items for quick setup:

```typescript
// utils/templateItems.ts
export const templateItems = [
  {
    name: "Digital Art NFT - Abstract #1",
    price: "50000", // $0.05 USDC
    network: "base",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    // ...
  },
  // More templates...
]
```

Click "Add Template Items" to quickly populate your store.

## Payment Configuration

### Networks

- **Base Mainnet**: Chain ID 8453, Network: "base"
- **Base Sepolia** (testnet): Chain ID 84532, Network: "base-sepolia"
- **Ethereum Mainnet**: Chain ID 1, Network: "mainnet"

### Assets

**Base Mainnet USDC:**
- Address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Decimals: 6
- EIP-712 Domain Name: "USD Coin" (not "USDC")
- EIP-712 Domain Version: "2"

**Base Sepolia USDC:**
- Address: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Decimals: 6

### Price Format

Prices are entered in the smallest unit:
- **USDC** (6 decimals): `50000` = 0.05 USDC, `1000000` = 1 USDC
- **ETH** (18 decimals): `1000000000000000000` = 1 ETH

## Development

### Building for Production

```bash
npm run build
npm start
```

The app runs on port 3010 by default (configured in `package.json`).

### Key Implementation Details

#### EIP-712 Domain Correction

**Critical**: The USDC contract on Base mainnet uses "USD Coin" as its EIP-712 domain name, not "USDC". The app automatically converts this:

```typescript
// components/PurchaseModal.tsx
const signingRequirements = {
  ...requirements,
  extra: {
    ...requirements.extra,
    name: requirements.extra?.name === "USDC" ? "USD Coin" : requirements.extra?.name,
  },
}
```

#### Network Switching

The app automatically switches the wallet network if needed:

```typescript
const requiredChainId = getChainIdFromNetwork(requirements.network)
if (requiredChainId && chainId !== requiredChainId) {
  await switchChain({ chainId: requiredChainId })
}
```

#### Transaction Status Tracking

The purchase modal tracks the complete payment flow:

```typescript
{paymentIntent && (
  <div>Payment Intent Created: {paymentIntent.id}</div>
)}
{payment && (
  <div>Payment Submitted: {payment.id}</div>
)}
{settlementTxHash && (
  <div>Transaction: {settlementTxHash}</div>
)}
```

## Troubleshooting

### Payment Verification Fails

**Error**: `Payment verification failed: Invalid signature`

**Solutions:**
- Ensure `extra.name` is "USD Coin" (not "USDC") for Base USDC
- Check that authorization timestamps are valid
- Verify the wallet is on the correct network

### Settlement Fails

**Error**: `settle_exact_node_failure`

**Common Causes:**
1. **Insufficient USDC balance** - Ensure payer has enough USDC
2. **Nonce already used** - Create a new payment intent
3. **Invalid authorization timestamps** - Check `validAfter`/`validBefore`

**Debug Steps:**
1. Check server logs for authorization details
2. Verify USDC balance on BaseScan
3. Check if nonce has been used before
4. Verify timestamps are within valid range

### Wallet Connection Issues

**Error**: Wallet not connecting

**Solutions:**
- Verify `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` is set
- Check browser console for errors
- Try a different wallet provider
- Restart dev server after changing env vars

### Network Mismatch

**Error**: `Provided chainId "84532" must match the active chainId "8453"`

**Solution:**
- The app automatically switches networks, but user must approve
- Ensure wallet supports Base mainnet

## API Reference

### Facilitator Endpoints

#### POST `/verify`

Verifies a payment signature and authorization.

**Request:**
```json
{
  "x402Version": 1,
  "paymentPayload": { ... },
  "paymentRequirements": { ... }
}
```

**Response:**
```json
{
  "isValid": true,
  "payer": "0x..."
}
```

#### POST `/settle`

Settles a verified payment on-chain.

**Request:**
```json
{
  "x402Version": 1,
  "paymentPayload": { ... },
  "paymentRequirements": { ... }
}
```

**Response:**
```json
{
  "settlementTxHash": "0x...",
  "success": true
}
```

## License

See the main repository license.
