"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/create-listing", label: "Create" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="group inline-flex items-center gap-2">
            <span className="relative text-lg font-semibold tracking-tight">
              <span className="bg-gradient-accent bg-clip-text text-transparent">NeonRent</span>
              <span className="absolute -inset-x-1 -bottom-1 h-px bg-gradient-to-r from-accent-blue/60 via-white/20 to-accent-purple/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-md px-3 py-2 text-sm transition-transform ease-smooth will-change-transform hover:scale-[1.02] ${
                    isActive ? "text-silver-primary" : "text-silver-secondary hover:text-silver-primary"
                  }`}
                >
                  <span className="relative z-10">{item.label}</span>
                  <span className="pointer-events-none absolute inset-0 rounded-md opacity-0 transition-opacity ease-smooth group-hover:opacity-100" style={{
                    background:
                      "linear-gradient(90deg, rgba(0,212,255,0.12), rgba(168,85,247,0.12))",
                  }} />
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button className="relative inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-black transition-transform ease-smooth will-change-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
              <span className="absolute inset-0 rounded-md bg-gradient-accent shadow-neon" />
              <span className="relative">Connect Wallet</span>
            </button>
          </div>

          <button
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-black/40 text-silver-primary"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 bg-black-secondary/80 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 grid gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-silver-secondary hover:text-silver-primary hover:bg-white/5 transition-colors ease-smooth"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <button className="mt-1 relative inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-black">
              <span className="absolute inset-0 rounded-md bg-gradient-accent" />
              <span className="relative">Connect Wallet</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;

