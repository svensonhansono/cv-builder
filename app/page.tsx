"use client";

import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Demo } from "@/components/landing/demo";
import { Pricing } from "@/components/landing/pricing";
import { FileText, Mail, Github, Twitter } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <Features />

      {/* Demo Section */}
      <Demo />

      {/* Pricing Section */}
      <Pricing />

      {/* Footer */}
      <footer className="relative border-t border-white/10 bg-slate-950/50 backdrop-blur-xl py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold gradient-text">Lebenslauf-24.de</span>
              </div>
              <p className="text-sm text-foreground/60">
                Dein professioneller CV Builder für perfekte Lebensläufe in Minuten.
              </p>
            </div>

            {/* Product */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Produkt</h3>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li>
                  <Link href="/register" className="hover:text-foreground/80 transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-foreground/80 transition-colors">
                    Preise
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-foreground/80 transition-colors">
                    Vorlagen
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Unternehmen</h3>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li>
                  <a href="#" className="hover:text-foreground/80 transition-colors">
                    Über uns
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground/80 transition-colors">
                    Datenschutz
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground/80 transition-colors">
                    Impressum
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Support</h3>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li>
                  <a href="#" className="hover:text-foreground/80 transition-colors">
                    Hilfe
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground/80 transition-colors">
                    Kontakt
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground/80 transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-foreground/50">
              © 2025 Lebenslauf-24.de. Alle Rechte vorbehalten.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
                aria-label="Email"
              >
                <Mail className="w-4 h-4 text-foreground/60" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4 text-foreground/60" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4 text-foreground/60" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
