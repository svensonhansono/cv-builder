"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900/20 via-background to-blue-900/20 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center space-y-8">
          {/* Logo/Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center glass">
                <FileText className="w-10 h-10 text-purple-400" />
              </div>
            </div>
          </motion.div>

          {/* Main Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            <h1 className="text-5xl md:text-7xl font-bold gradient-text leading-tight">
              Dein perfekter Lebenslauf
              <br />
              in Minuten
            </h1>
            <p className="text-xl md:text-2xl text-foreground/70 max-w-3xl mx-auto">
              Erstelle professionelle Lebensläufe mit Live-Vorschau, 3 modernen Layouts
              und automatischer Cloud-Speicherung
            </p>
          </motion.div>

          {/* Feature Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6 text-sm md:text-base text-foreground/60"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>3 Premium Layouts</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>PDF Export</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>Auto-Speicherung</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>100% Kostenlos</span>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 pointer-events-auto"
            style={{ pointerEvents: 'auto' }}
          >
            <a href="/register" className="pointer-events-auto">
              <Button size="lg" className="text-lg px-8 py-6 group pointer-events-auto">
                Jetzt kostenlos starten
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <a href="/login" className="pointer-events-auto">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 glass border-purple-500/20 hover:border-purple-500/40 pointer-events-auto"
              >
                Anmelden
              </Button>
            </a>
          </motion.div>

          {/* Social Proof / Trust Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="pt-8 text-sm text-foreground/50"
          >
            <p>Keine Kreditkarte erforderlich • Sofort loslegen • Premium-Vorlagen für 1,99€/Monat</p>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2 text-foreground/40">
          <span className="text-sm">Mehr erfahren</span>
          <div className="w-6 h-10 rounded-full border-2 border-foreground/20 flex items-start justify-center p-2">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-foreground/40"
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
