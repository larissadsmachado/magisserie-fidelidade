import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
export const metadata: Metadata = { title: 'Magisserie · Clube de fidelidade', description: 'Uma pitada de magia em cada compra.', icons: { icon: { url: '/favicon.ico', type: 'image/x-icon' } } };
const nunito = Nunito({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-nunito' });
export default function RootLayout({children}: {children:React.ReactNode}) {return <html lang="pt-BR"><body className={nunito.variable}>{children}</body></html>}
