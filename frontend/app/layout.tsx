import type { Metadata } from 'next'
import Script from 'next/script'
import '@/styles/globals.css'
import { PanelProvider } from '@/features/solar-panels/context/PanelContext'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { Toaster } from 'sonner'

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
    <html lang="en">
      <head>
        {/* Inter Font - Modern Typography */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Font Awesome */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
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
        {/* html2canvas for screenshots */}
        <Script
          src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}