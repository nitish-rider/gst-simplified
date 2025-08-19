import type React from "react"
import type {Metadata} from "next"
import {GeistSans} from "geist/font/sans"
import {GeistMono} from "geist/font/mono"
import "./globals.css"
import {Navigation} from "@/components/navigation"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
    title: "GST Simplified",
    description: "Simplify your GST and Bank reconciliation with Excel processing",
    generator: "v0.app",
}

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
        <head>
            <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
        </head>
        <body>
        <Navigation/>
        <main className="container mx-auto px-4 py-8">{children}</main>
        <Toaster />
        </body>
        </html>
    )
}
