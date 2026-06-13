import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Situation Center 2.0',
  description: 'Городская платформа управления инцидентами',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${montserrat.className} bg-white text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  )
}
