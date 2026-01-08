// API route to expose server-side environment variables to client
import { NextResponse } from "next/server"
import { getServerDefaultPayToAddress } from "@/utils/config"

export async function GET() {
  // This runs on the server, so it can access AGENT_PAY_TO_ADDRESS
  const defaultPayToAddress = getServerDefaultPayToAddress()
  
  return NextResponse.json({
    defaultPayToAddress,
  })
}


