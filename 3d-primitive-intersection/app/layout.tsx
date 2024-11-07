import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Heart } from "lucide-react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "intersect (boolean)",
  description: "Interactive 3D primitive intersection demo",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full relative`}>
        <main className="h-full w-full flex items-center justify-center pb-16">
          <div className="max-w-7xl w-full">
            {children}
          </div>
        </main>
        <footer className="fixed bottom-0 left-0 right-0 p-4 text-center text-sm text-muted-foreground bg-background/80 backdrop-blur-sm border-t">
          <p className="flex items-center justify-center gap-1">
            made by{" "}
            <a
              href="https://iverfinne.no"
              className="underline hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              @iverfinne
            </a>{" "}
            with <Heart className="h-4 w-4 text-red-500" aria-hidden="true" />
          </p>
        </footer>
      </body>
    </html>
  )
}