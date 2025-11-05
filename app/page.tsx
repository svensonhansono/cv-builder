"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CVForm } from "@/components/cv-form";
import { CVPreview } from "@/components/cv-preview";
import { CVData } from "@/types/cv";
import { FileText, Sparkles, Edit, Eye } from "lucide-react";

const initialData: CVData = {
  personalInfo: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    title: "",
    summary: "",
    photoUrl: "",
  },
  experiences: [],
  education: [],
  skills: [],
  sectionTitles: {
    experience: "Berufserfahrung",
    education: "Ausbildung",
    skills: "Skills",
  },
  fontFamily: "Arial",
  signatureLocation: "",
  signatureDate: new Date().toISOString().split('T')[0], // Heutiges Datum
  signatureName: "",
  signatureFont: "Dancing Script",
};

export default function Home() {
  const [cvData, setCvData] = useState<CVData>(initialData);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");

  useEffect(() => {
    setMounted(true);
    // Load from localStorage if exists
    const saved = localStorage.getItem("cvData");
    if (saved) {
      try {
        setCvData(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading saved data:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      // Save to localStorage
      try {
        localStorage.setItem("cvData", JSON.stringify(cvData));
      } catch (e) {
        // LocalStorage quota exceeded
        console.error("Fehler beim Speichern:", e);
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          // Try to save without photo
          const dataWithoutPhoto = {
            ...cvData,
            personalInfo: { ...cvData.personalInfo, photoUrl: "" }
          };
          try {
            localStorage.setItem("cvData", JSON.stringify(dataWithoutPhoto));
            alert("Das Bild ist zu groß für den Browser-Speicher. Bitte verwende ein kleineres Bild oder eine URL.");
          } catch {
            alert("Speicher voll! Deine Änderungen können nicht gespeichert werden.");
          }
        }
      }
    }
  }, [cvData, mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 via-transparent to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-500/10 via-transparent to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl"
      >
        <div className="container mx-auto px-4 py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="p-1.5 lg:p-2 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-purple-500/30">
                <FileText className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg lg:text-2xl font-bold gradient-text">CV Builder</h1>
                <p className="text-xs lg:text-sm text-foreground/60 hidden sm:block">
                  Dein professioneller Lebenslauf in Minuten
                </p>
              </div>
            </div>

            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="hidden sm:block"
            >
              <Sparkles className="w-6 h-6 lg:w-8 lg:h-8 text-purple-400" />
            </motion.div>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden border-t border-white/10">
          <div className="container mx-auto px-4">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("form")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all duration-300 border-b-2 ${
                  activeTab === "form"
                    ? "border-purple-500 text-purple-400"
                    : "border-transparent text-foreground/60 hover:text-foreground/80"
                }`}
              >
                <Edit className="w-4 h-4" />
                Bearbeiten
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all duration-300 border-b-2 ${
                  activeTab === "preview"
                    ? "border-purple-500 text-purple-400"
                    : "border-transparent text-foreground/60 hover:text-foreground/80"
                }`}
              >
                <Eye className="w-4 h-4" />
                Vorschau
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content - Responsive Layout */}
      <div className="relative z-10">
        {/* Desktop: Split Screen */}
        <div className="hidden lg:flex h-[calc(100vh-88px)]">
          {/* Left Side - Form */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-1/2 border-r border-white/10 bg-slate-950/30 backdrop-blur-sm"
          >
            <CVForm data={cvData} onChange={setCvData} />
          </motion.div>

          {/* Right Side - Preview */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="w-1/2 bg-slate-900/30 backdrop-blur-sm"
          >
            <CVPreview data={cvData} />
          </motion.div>
        </div>

        {/* Mobile: Tabbed View */}
        <div className="lg:hidden min-h-[calc(100vh-144px)]">
          <AnimatePresence mode="wait">
            {activeTab === "form" ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-slate-950/30 backdrop-blur-sm"
              >
                <CVForm data={cvData} onChange={setCvData} />
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="bg-slate-900/30 backdrop-blur-sm"
              >
                <CVPreview data={cvData} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating particles effect */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </main>
  );
}
