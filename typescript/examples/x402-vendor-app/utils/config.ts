// Get the default payment address from environment variable
// In Next.js, client-side env vars need NEXT_PUBLIC_ prefix
// This function can be called from both server and client components
export function getDefaultPayToAddress(): string {
  // Check NEXT_PUBLIC_ first (available on both server and client)
  // Then check server-only AGENT_PAY_TO_ADDRESS (only available on server)
  if (typeof window === "undefined") {
    // Server-side: can access any env var
    return process.env.NEXT_PUBLIC_AGENT_PAY_TO_ADDRESS || process.env.AGENT_PAY_TO_ADDRESS || ""
  } else {
    // Client-side: only NEXT_PUBLIC_ prefixed vars are available
    // If NEXT_PUBLIC_AGENT_PAY_TO_ADDRESS is not set, we can't access AGENT_PAY_TO_ADDRESS
    // The user should set NEXT_PUBLIC_AGENT_PAY_TO_ADDRESS for client-side access
    return process.env.NEXT_PUBLIC_AGENT_PAY_TO_ADDRESS || ""
  }
}

// Server-side only function to get the address
// This can read AGENT_PAY_TO_ADDRESS without NEXT_PUBLIC_ prefix
export function getServerDefaultPayToAddress(): string {
  if (typeof window !== "undefined") {
    throw new Error("getServerDefaultPayToAddress can only be called on the server")
  }
  return process.env.NEXT_PUBLIC_AGENT_PAY_TO_ADDRESS || process.env.AGENT_PAY_TO_ADDRESS || ""
}

