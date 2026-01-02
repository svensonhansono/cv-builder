"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CVForm } from "@/components/cv-form";
import { CVPreview } from "@/components/cv-preview";
import { CVPreviewV2 } from "@/components/cv-preview-v2";
import { CVPreviewV3 } from "@/components/cv-preview-v3";
import { CVPreviewV4 } from "@/components/cv-preview-v4";
import { CVPreviewV5 } from "@/components/cv-preview-v5";
import { CVPreviewV6 } from "@/components/cv-preview-v6";
import { CVPreviewV7 } from "@/components/cv-preview-v7";
import { CoverLetterA1 } from "@/components/cover-letter-a1";
import { CoverLetterA2 } from "@/components/cover-letter-a2";
import { CoverLetterA3 } from "@/components/cover-letter-a3";
import { CoverLetterA4 } from "@/components/cover-letter-a4";
import { CoverLetterA5 } from "@/components/cover-letter-a5";
import { CoverLetterA6 } from "@/components/cover-letter-a6";
import { CoverLetterA7 } from "@/components/cover-letter-a7";
import { CVData } from "@/types/cv";
import { FileText, Sparkles, Edit, Eye, LogOut, User, Cloud, CheckCircle2, Undo, Redo, Mail, Crown, Timer, Briefcase } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const initialData: CVData = {
  personalInfo: {
    firstName: "Anna",
    lastName: "Mustermann",
    email: "anna.mustermann@example.com",
    phone: "+49 151 12345678",
    location: "Berlin, Deutschland",
    title: "Senior Software Entwicklerin",
    summary: "",
    photoUrl: "https://images.unsplash.com/photo-1690444963408-9573a17a8058?w=400&h=400&fit=crop&crop=faces",
    birthDate: "1990-05-15",
    birthPlace: "Hamburg",
    nationality: "deutsch",
    maritalStatus: "ledig",
  },
  experiences: [
    {
      id: "1",
      company: "Tech Solutions GmbH",
      position: "Senior Software Entwicklerin",
      startDate: "2020-03-01",
      endDate: "",
      current: true,
      description: "",
      bulletPoints: [
        "Entwicklung und Wartung von Webanwendungen mit React und Node.js",
        "Leitung eines Teams von 5 Entwicklern",
        "Implementierung von CI/CD-Pipelines und automatisierten Tests",
        "Code-Reviews und Mentoring von Junior-Entwicklern"
      ]
    },
    {
      id: "2",
      company: "Digital Innovations AG",
      position: "Full-Stack Entwicklerin",
      startDate: "2017-06-01",
      endDate: "2020-02-28",
      current: false,
      description: "",
      bulletPoints: [
        "Entwicklung von E-Commerce-Plattformen mit React und Python",
        "Optimierung der Datenbankabfragen für bessere Performance",
        "Integration von Zahlungsdienstleistern und APIs"
      ]
    }
  ],
  education: [
    {
      id: "1",
      institution: "Technische Universität Berlin",
      degree: "Master of Science",
      field: "Informatik",
      startDate: "2013-10-01",
      endDate: "2016-09-30",
      current: false,
    },
    {
      id: "2",
      institution: "Universität Hamburg",
      degree: "Bachelor of Science",
      field: "Informatik",
      startDate: "2010-10-01",
      endDate: "2013-09-30",
      current: false,
    }
  ],
  skills: [
    { id: "1", name: "JavaScript / TypeScript", level: 5 },
    { id: "2", name: "React / Next.js", level: 5 },
    { id: "3", name: "Node.js / Express", level: 4 },
    { id: "4", name: "Python / Django", level: 4 },
    { id: "5", name: "SQL / PostgreSQL", level: 4 },
    { id: "6", name: "Git / GitHub", level: 5 },
    { id: "7", name: "Docker / Kubernetes", level: 3 },
    { id: "8", name: "AWS / Cloud Services", level: 3 }
  ],
  sectionTitles: {
    experience: "Berufserfahrung",
    education: "Ausbildung",
    skills: "Skills",
  },
  spacerBeforeExperience: "",
  spacerBeforeEducation: "",
  spacerBeforeSkills: "",
  fontFamily: "Arial",
  signatureLocation: "Berlin",
  signatureDate: new Date().toISOString().split('T')[0],
  signatureName: "Anna Mustermann",
  signatureFont: "Dancing Script",
  signatureImageUrl: "",
  showSignature: false,
  coverLetter: {
    recipientCompany: "Tech Solutions GmbH",
    recipientName: "Frau Dr. Schmidt",
    recipientPosition: "Personalabteilung",
    recipientStreet: "Musterstraße 123",
    recipientCity: "10115 Berlin",
    subject: "Bewerbung als Senior Software Entwicklerin",
    salutation: "Sehr geehrte Frau Dr. Schmidt",
    introText: "mit großem Interesse habe ich Ihre Stellenausschreibung für die Position als Senior Software Entwicklerin gelesen. Als erfahrene Entwicklerin mit über 8 Jahren Berufserfahrung in der Softwareentwicklung möchte ich mich hiermit bei Ihnen bewerben.",
    mainText: "In meiner aktuellen Position bei Tech Solutions GmbH leite ich ein Team von 5 Entwicklern und verantworte die Entwicklung und Wartung komplexer Webanwendungen. Dabei konnte ich umfangreiche Erfahrungen in der Arbeit mit modernen Technologien wie React, Node.js und Cloud-Services sammeln. Besonders wichtig ist mir dabei stets die Qualität des Codes sowie die enge Zusammenarbeit im Team.\n\nMeine Stärken liegen in der schnellen Einarbeitung in neue Technologien, der strukturierten Arbeitsweise und der Fähigkeit, komplexe technische Zusammenhänge verständlich zu kommunizieren. Diese Fähigkeiten möchte ich gerne in Ihrem Unternehmen einbringen und gemeinsam mit Ihrem Team innovative Lösungen entwickeln.",
    closingText: "Über eine Einladung zu einem persönlichen Gespräch würde ich mich sehr freuen. Für Rückfragen stehe ich Ihnen jederzeit gerne zur Verfügung.",
    closing: "Mit freundlichen Grüßen",
  },
};

export default function Dashboard() {
  const [cvData, setCvData] = useState<CVData>(initialData);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [activeView, setActiveView] = useState<"cv" | "cover">("cv");
  const [cvVersion, setCvVersion] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [coverVersion, setCoverVersion] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "idle">("idle");
  const [history, setHistory] = useState<CVData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const { user, logout, loading, isPremium, isInTrial, getTrialDaysRemaining } = useAuth();
  const router = useRouter();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUndoRedoRef = useRef(false);

  // Auth Guard - Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load CV data from Firestore on mount
  useEffect(() => {
    const loadCVData = async () => {
      if (!user) return;

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.cvData) {
            setCvData(data.cvData);
            // Initialize history with loaded data
            setHistory([data.cvData]);
            setHistoryIndex(0);
          }
        } else {
          // Initialize history with initial data
          setHistory([initialData]);
          setHistoryIndex(0);
        }
      } catch (error) {
        console.error("Fehler beim Laden:", error);
      } finally {
        setMounted(true);
      }
    };

    loadCVData();
  }, [user]);

  // Add to history after changes (debounced)
  useEffect(() => {
    if (!mounted || isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    // Clear previous timeout
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }

    // Debounce: Add to history after 1 second of no changes
    historyTimeoutRef.current = setTimeout(() => {
      setHistory(prev => {
        // Remove any states after current index (if user did undo then made changes)
        const newHistory = prev.slice(0, historyIndex + 1);

        // Add new state
        newHistory.push(cvData);

        // Keep only last 10 states
        if (newHistory.length > 10) {
          newHistory.shift();
          setHistoryIndex(9);
          return newHistory;
        }

        setHistoryIndex(newHistory.length - 1);
        return newHistory;
      });
    }, 1000);

    return () => {
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current);
      }
    };
  }, [cvData, mounted, historyIndex]);

  // Auto-save to Firestore with debouncing
  useEffect(() => {
    if (!mounted || !user) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus("saving");

    // Debounce: Save after 2 seconds of no changes
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        await setDoc(docRef, {
          cvData,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        setSaveStatus("saved");

        // Reset to idle after 2 seconds
        setTimeout(() => {
          setSaveStatus("idle");
        }, 2000);
      } catch (error) {
        console.error("Fehler beim Speichern:", error);
        setSaveStatus("idle");
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [cvData, mounted, user]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoRef.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCvData(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoRef.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCvData(history[newIndex]);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);


  // Show loading while checking auth
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 animate-pulse">
            <FileText className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-foreground/60">Wird geladen...</p>
        </div>
      </div>
    );
  }

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

            <div className="flex items-center gap-4">
              {/* Stellenangebote Button */}
              <Link href="/jobs">
                <Button
                  size="sm"
                  variant="outline"
                  className="glass border-green-500/30 hover:border-green-500/50 hover:bg-green-500/10 transition-colors"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Stellenangebote</span>
                </Button>
              </Link>

              {/* Save Status Indicator */}
              {saveStatus !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-white/10"
                >
                  {saveStatus === "saving" ? (
                    <>
                      <Cloud className="w-4 h-4 text-blue-400 animate-pulse" />
                      <span className="text-xs text-foreground/60">Wird gespeichert...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-green-400">Gespeichert</span>
                    </>
                  )}
                </motion.div>
              )}

              {/* Premium Badge / Upgrade Button */}
              {isPremium() ? (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/50">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-semibold text-yellow-400">
                    {isInTrial() ? `Testphase (${getTrialDaysRemaining()}d)` : 'Premium'}
                  </span>
                </div>
              ) : (
                <Link href="/upgrade">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-semibold"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Upgrade</span>
                  </Button>
                </Link>
              )}

              {/* User Info */}
              <div className="hidden md:flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-lg border border-white/10">
                <User className="w-4 h-4 text-foreground/60" />
                <span className="text-sm text-foreground/60">{user?.email}</span>
              </div>

              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="glass border-white/10 hover:border-red-500/40 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Abmelden</span>
              </Button>

              {/* Undo/Redo Buttons */}
              <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg border border-white/10">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className={`p-2 rounded transition-all duration-200 ${
                    historyIndex <= 0
                      ? "text-foreground/30 cursor-not-allowed"
                      : "text-foreground/60 hover:text-foreground hover:bg-white/10"
                  }`}
                  title="Rückgängig (Strg+Z)"
                >
                  <Undo className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className={`p-2 rounded transition-all duration-200 ${
                    historyIndex >= history.length - 1
                      ? "text-foreground/30 cursor-not-allowed"
                      : "text-foreground/60 hover:text-foreground hover:bg-white/10"
                  }`}
                  title="Wiederherstellen (Strg+Y)"
                >
                  <Redo className="w-4 h-4" />
                </button>
              </div>

              {/* Version Switcher - 2 Rows */}
              <div className="flex flex-col gap-2">
                {/* Lebenslauf Row */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">Lebenslauf</span>
                  <div className="flex gap-2 bg-slate-900/50 p-1 rounded-lg border border-white/10">
                    {[1, 2, 3, 4, 5, 6, 7].map((version) => (
                      <button
                        key={version}
                        onClick={() => {
                          setCvVersion(version as 1 | 2 | 3 | 4 | 5 | 6 | 7);
                          setActiveView("cv");
                        }}
                        className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${
                          activeView === "cv" && cvVersion === version
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-500/50"
                            : "text-foreground/60 hover:text-foreground/80"
                        }`}
                      >
                        L{version}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Anschreiben Row */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground/70 whitespace-nowrap">Anschreiben</span>
                  <div className="flex gap-2 bg-slate-900/50 p-1 rounded-lg border border-white/10">
                    {[1, 2, 3, 4, 5, 6, 7].map((version) => (
                      <button
                        key={version}
                        onClick={() => {
                          setCoverVersion(version as 1 | 2 | 3 | 4 | 5 | 6 | 7);
                          setActiveView("cover");
                        }}
                        className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${
                          activeView === "cover" && coverVersion === version
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-500/50"
                            : "text-foreground/60 hover:text-foreground/80"
                        }`}
                      >
                        A{version}
                      </button>
                    ))}
                  </div>
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

      {/* Trial Banner */}
      {isInTrial() && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative z-10 border-b border-white/10"
        >
          <div className="container mx-auto px-4 py-4">
            <div className="glass rounded-xl p-4 border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-purple-500/20">
                    <Timer className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-purple-300 flex items-center gap-2 text-sm lg:text-base">
                      <Sparkles className="w-4 h-4" />
                      Testphase aktiv
                    </h3>
                    <p className="text-xs lg:text-sm text-foreground/60 mt-0.5">
                      Noch <span className="font-bold text-purple-400">{getTrialDaysRemaining()} Tage</span> kostenlos.
                      Danach automatisch 1,99€/Monat.
                    </p>
                  </div>
                </div>
                <Link href="/subscription">
                  <Button variant="outline" size="sm" className="border-purple-500/30 hover:bg-purple-500/10">
                    Verwalten
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

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
            {activeView === "cv" ? (
              <>
                {cvVersion === 1 && <CVPreview data={cvData} onChange={setCvData} />}
                {cvVersion === 2 && <CVPreviewV2 data={cvData} onChange={setCvData} />}
                {cvVersion === 3 && <CVPreviewV3 data={cvData} onChange={setCvData} />}
                {cvVersion === 4 && <CVPreviewV4 data={cvData} onChange={setCvData} />}
                {cvVersion === 5 && <CVPreviewV5 data={cvData} onChange={setCvData} />}
                {cvVersion === 6 && <CVPreviewV6 data={cvData} onChange={setCvData} />}
                {cvVersion === 7 && <CVPreviewV7 data={cvData} onChange={setCvData} />}
              </>
            ) : (
              <>
                {coverVersion === 1 && <CoverLetterA1 data={cvData} onChange={setCvData} />}
                {coverVersion === 2 && <CoverLetterA2 data={cvData} onChange={setCvData} />}
                {coverVersion === 3 && <CoverLetterA3 data={cvData} onChange={setCvData} />}
                {coverVersion === 4 && <CoverLetterA4 data={cvData} onChange={setCvData} />}
                {coverVersion === 5 && <CoverLetterA5 data={cvData} onChange={setCvData} />}
                {coverVersion === 6 && <CoverLetterA6 data={cvData} onChange={setCvData} />}
                {coverVersion === 7 && <CoverLetterA7 data={cvData} onChange={setCvData} />}
              </>
            )}
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
                {activeView === "cv" ? (
                  <>
                    {cvVersion === 1 && <CVPreview data={cvData} onChange={setCvData} />}
                    {cvVersion === 2 && <CVPreviewV2 data={cvData} onChange={setCvData} />}
                    {cvVersion === 3 && <CVPreviewV3 data={cvData} onChange={setCvData} />}
                    {cvVersion === 4 && <CVPreviewV4 data={cvData} onChange={setCvData} />}
                    {cvVersion === 5 && <CVPreviewV5 data={cvData} onChange={setCvData} />}
                    {cvVersion === 6 && <CVPreviewV6 data={cvData} onChange={setCvData} />}
                    {cvVersion === 7 && <CVPreviewV7 data={cvData} onChange={setCvData} />}
                  </>
                ) : (
                  <>
                    {coverVersion === 1 && <CoverLetterA1 data={cvData} onChange={setCvData} />}
                    {coverVersion === 2 && <CoverLetterA2 data={cvData} onChange={setCvData} />}
                    {coverVersion === 3 && <CoverLetterA3 data={cvData} onChange={setCvData} />}
                    {coverVersion === 4 && <CoverLetterA4 data={cvData} onChange={setCvData} />}
                    {coverVersion === 5 && <CoverLetterA5 data={cvData} onChange={setCvData} />}
                    {coverVersion === 6 && <CoverLetterA6 data={cvData} onChange={setCvData} />}
                    {coverVersion === 7 && <CoverLetterA7 data={cvData} onChange={setCvData} />}
                  </>
                )}
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
