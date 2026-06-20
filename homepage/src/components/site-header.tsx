"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { toolLinks } from "@/config/tool-links";

const navItems = [
  { href: "/", label: "首頁" },
  { href: toolLinks.buyerBudget, label: "自備款試算" },
  { href: toolLinks.sellerNet, label: "房地合一稅" },
  { href: "/#about", label: "關於試算" },
];

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <Link href="/" aria-label="房產試算首頁">
          <Brand />
        </Link>
        <nav className="desktop-nav" aria-label="主要導覽">
          {navItems.map((item) => (
            <Link className="nav-link" href={item.href} key={item.label}>
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          className="menu-button"
          type="button"
          aria-label={isOpen ? "關閉導覽選單" : "開啟導覽選單"}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>
      {isOpen && (
        <nav id="mobile-navigation" className="mobile-nav" aria-label="行動版主要導覽">
          {navItems.map((item) => (
            <Link
              className="nav-link"
              href={item.href}
              key={item.label}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
