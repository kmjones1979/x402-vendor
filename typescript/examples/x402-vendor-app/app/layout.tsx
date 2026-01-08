import { Providers } from "./providers"
import "./globals.css"

export const metadata = {
  title: 'x402 Vendor App',
  description: 'Sell items over x402',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
