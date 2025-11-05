import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { PanelProvider } from '@/features/solar-panels/context/PanelContext'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { Toaster } from 'sonner'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FinestCloud Solar',
  description: 'Solar panel analysis and configuration tool',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <AuthProvider>
          <PanelProvider>
            {children}
          </PanelProvider>
        </AuthProvider>
        <Toaster position="top-right" richColors />
        {/* Google Maps API */}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places&loading=async`}
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}