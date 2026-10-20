"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationMenuProps = {
  fidelidadeHref: string;
};

const navigationItems = [
  { label: "Início", href: "/", key: "inicio" },
  { label: "Cardápio", href: "/cardapio", key: "cardapio" },
  { label: "Fazer pedido", href: "/pedir", key: "pedido" },
] as const;

export default function NavigationMenu({ fidelidadeHref }: NavigationMenuProps) {
  const pathname = usePathname();

  return (
    <header className="magisserie-nav">
      <div className="magisserie-nav__inner">
        <Link className="magisserie-nav__brand" href="/" aria-label="Magisserie — Início">
          Magisserie
        </Link>

        <nav className="magisserie-nav__desktop" aria-label="Navegação principal">
          {navigationItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                className={`magisserie-nav__link${active ? " is-active" : ""}`}
                href={item.href}
                key={item.key}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
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
          const active = pathname === item.href;

          return (
            <Link
              className={`magisserie-nav__mobile-link${active ? " is-active" : ""}`}
              href={item.href}
              key={item.key}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
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
