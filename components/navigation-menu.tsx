"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";

type NavigationMenuProps = {
  fidelidadeHref: string;
};

const navigationItems = [
  { label: "Início", href: "https://magisserie.vercel.app/", pathname: "/", key: "inicio" },
  { label: "Cardápio", href: "https://magisserie.vercel.app/cardapio", pathname: "/cardapio", key: "cardapio" },
  { label: "Fazer pedido", href: "https://magisserie.vercel.app/pedir", pathname: "/pedir", key: "pedido" },
] as const;

export default function NavigationMenu({ fidelidadeHref }: NavigationMenuProps) {
  const pathname = usePathname();

  return (
    <header className="magisserie-nav">
      <div className="magisserie-nav__inner">
        <a className="magisserie-nav__brand" href="https://magisserie.vercel.app/" aria-label="Magisserie — Início">
          <Image src="/brand/nome.png" width={1000} height={300} alt="Magisserie" priority />
        </a>

        <nav className="magisserie-nav__desktop" aria-label="Navegação principal">
          {navigationItems.map((item) => {
            const active = pathname === item.pathname;

            return (
              <a
                className={`magisserie-nav__link${active ? " is-active" : ""}`}
                href={item.href}
                key={item.key}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </a>
            );
          })}
          <a
            className={`magisserie-nav__link${pathname === "/cartao" ? " is-active" : ""}`}
            href={fidelidadeHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-current={pathname === "/cartao" ? "page" : undefined}
          >
            Fidelidade
          </a>
        </nav>

        <a
          className="magisserie-nav__instagram"
          href="https://www.instagram.com/magisserie.atelie/"
          target="_blank"
          rel="noopener noreferrer"
        >
          @magisserie.atelie
        </a>
      </div>

      <nav className="magisserie-nav__mobile" aria-label="Navegação principal">
        {navigationItems.map((item) => {
          const active = pathname === item.pathname;

          return (
            <a
              className={`magisserie-nav__mobile-link${active ? " is-active" : ""}`}
              href={item.href}
              key={item.key}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </a>
          );
        })}
        <a
          className={`magisserie-nav__mobile-link${pathname === "/cartao" ? " is-active" : ""}`}
          href={fidelidadeHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-current={pathname === "/cartao" ? "page" : undefined}
        >
          Fidelidade
        </a>
      </nav>
    </header>
  );
}
