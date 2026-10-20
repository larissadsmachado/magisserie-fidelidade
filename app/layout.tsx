import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Magisserie · Clube de fidelidade', description: 'Uma pitada de magia em cada compra.', icons: { icon: { url: '/favicon.ico', type: 'image/x-icon' } } };
export default function RootLayout({children}: {children:React.ReactNode}) {return <html lang="pt-BR"><body>{children}</body></html>}
