import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Magisserie · Clube de fidelidade', description: 'Uma pitada de magia em cada compra.' };
export default function RootLayout({children}: {children:React.ReactNode}) {return <html lang="pt-BR"><body>{children}</body></html>}
