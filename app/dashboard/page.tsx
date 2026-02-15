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
import { FileText, Sparkles, Edit, Eye, LogOut, User, Cloud, CheckCircle2, Undo, Redo, Mail, Crown, Timer, Briefcase, Download, ChevronLeft, ChevronRight, SpellCheck, Loader2 } from "lucide-react";
import { useSpellCheck, SpellError } from "@/hooks/use-spell-check";
import { SpellErrorPanel, applySuggestionToData } from "@/components/spell-error-panel";
import { useAuth } from "@/components/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { JobsPanel } from "@/components/jobs-panel";
import { doc, setDoc, getDoc } from "firebase/firestore";

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
    birthDate: "",
    birthPlace: "",
    nationality: "",
    maritalStatus: "",
  },
  experiences: [],
  education: [],
  skills: [],
  sectionTitles: {
    experience: "Berufserfahrung",
    education: "Ausbildung",
    skills: "Skills",
  },
  spacerBeforeExperience: "",
  spacerBeforeEducation: "",
  spacerBeforeSkills: "",
  fontFamily: "Montserrat",
  signatureLocation: "",
  signatureDate: "",
  signatureName: "",
  signatureFont: "Dancing Script",
  signatureImageUrl: "",
  showSignature: false,
  coverLetter: {
    recipientCompany: "",
    recipientName: "",
    recipientPosition: "",
    recipientStreet: "",
    recipientCity: "",
    subject: "",
    salutation: "",
    introText: "",
    mainText: "",
    closingText: "",
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
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showJobsPanel, setShowJobsPanel] = useState(false);
  const [ignoredSpellWords, setIgnoredSpellWords] = useState<string[]>([]);
  const previewRef = useRef<{ handleDownload: () => Promise<void> } | null>(null);
  const { user, logout, loading, isPremium, isInTrial, getTrialDaysRemaining } = useAuth();
  const { errors: spellErrors, isChecking, apiError: spellApiError, checkAllTexts, ignoreWord, setIgnoredWordsList, clearErrors, removeError, setErrors } = useSpellCheck(ignoredSpellWords);
  const [showSpellPanel, setShowSpellPanel] = useState(false);
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
          // Load ignored spell words
          if (data.ignoredSpellWords && Array.isArray(data.ignoredSpellWords)) {
            setIgnoredSpellWords(data.ignoredSpellWords);
            setIgnoredWordsList(data.ignoredSpellWords);
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

  // Spell check function
  const handleSpellCheck = async () => {
    clearErrors();
    const textsToCheck: { text: string; fieldId: string }[] = [];

    if (activeView === "cv") {
      // Gather CV texts
      textsToCheck.push(
        { text: cvData.personalInfo.firstName, fieldId: "personalInfo.firstName" },
        { text: cvData.personalInfo.lastName, fieldId: "personalInfo.lastName" },
        { text: cvData.personalInfo.title, fieldId: "personalInfo.title" },
        { text: cvData.personalInfo.summary, fieldId: "personalInfo.summary" },
        { text: cvData.personalInfo.location, fieldId: "personalInfo.location" },
      );
      cvData.experiences.forEach((exp, i) => {
        textsToCheck.push(
          { text: exp.company, fieldId: `experience.${i}.company` },
          { text: exp.position, fieldId: `experience.${i}.position` },
          { text: exp.description, fieldId: `experience.${i}.description` },
        );
        exp.bulletPoints.forEach((bp, j) => {
          textsToCheck.push({ text: bp, fieldId: `experience.${i}.bulletPoint.${j}` });
        });
      });
      cvData.education.forEach((edu, i) => {
        textsToCheck.push(
          { text: edu.institution, fieldId: `education.${i}.institution` },
          { text: edu.degree, fieldId: `education.${i}.degree` },
          { text: edu.field, fieldId: `education.${i}.field` },
        );
      });
      cvData.skills.forEach((skill, i) => {
        textsToCheck.push({ text: skill.name, fieldId: `skill.${i}.name` });
      });
    } else {
      // Gather cover letter texts
      const cl = cvData.coverLetter;
      // Add comma to salutation for spell check (it's added in the template anyway)
      const salutationWithComma = (cl.salutation || "").trim();
      const salutationToCheck = salutationWithComma && !salutationWithComma.endsWith(",")
        ? salutationWithComma + ","
        : salutationWithComma;
      textsToCheck.push(
        { text: cl.recipientCompany || "", fieldId: "coverLetter.recipientCompany" },
        { text: cl.recipientName || "", fieldId: "coverLetter.recipientName" },
        { text: cl.recipientPosition || "", fieldId: "coverLetter.recipientPosition" },
        { text: cl.subject || "", fieldId: "coverLetter.subject" },
        { text: salutationToCheck, fieldId: "coverLetter.salutation" },
        { text: cl.introText || "", fieldId: "coverLetter.introText" },
        { text: cl.mainText || "", fieldId: "coverLetter.mainText" },
        { text: cl.closingText || "", fieldId: "coverLetter.closingText" },
        { text: cl.closing || "", fieldId: "coverLetter.closing" },
      );
    }

    await checkAllTexts(textsToCheck.filter(t => t.text.length > 0));
    setShowSpellPanel(true);
  };

  // Handle applying a spell suggestion
  const handleApplySuggestion = (error: SpellError, suggestion: string) => {
    const newData = applySuggestionToData(cvData, error, suggestion);
    setCvData(newData);
    removeError(error);
  };

  // Handle ignoring a word permanently (saved to Firestore)
  const handleIgnoreWord = async (word: string) => {
    const newIgnoredWords = ignoreWord(word);
    setIgnoredSpellWords(newIgnoredWords);

    // Save to Firestore
    if (user) {
      try {
        const docRef = doc(db, "users", user.uid);
        await setDoc(docRef, {
          ignoredSpellWords: newIgnoredWords,
        }, { merge: true });
      } catch (error) {
        console.error("Fehler beim Speichern der ignorierten Wörter:", error);
      }
    }
  };

  // Handle clicking on an error to scroll to it in the preview
  const handleScrollToError = (error: SpellError) => {
    // Find all contentEditable elements (they're only in the preview area)
    const editableElements = document.querySelectorAll('[contenteditable="true"]');

    // Search for the element containing the error word
    for (const element of editableElements) {
      const text = element.textContent || '';
      if (text.includes(error.word)) {
        // Scroll to the element
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Add highlight effect
        const el = element as HTMLElement;
        const originalBg = el.style.backgroundColor;
        const originalTransition = el.style.transition;
        el.style.transition = 'background-color 0.3s ease';
        el.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';

        // Focus the element
        el.focus();

        // Try to select the specific word
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          const textNode = el.firstChild;
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const wordIndex = text.indexOf(error.word);
            if (wordIndex !== -1) {
              try {
                range.setStart(textNode, wordIndex);
                range.setEnd(textNode, wordIndex + error.word.length);
                selection.removeAllRanges();
                selection.addRange(range);
              } catch {
                // Fallback: just focus the element
              }
            }
          }
        }

        // Remove highlight after delay
        setTimeout(() => {
          el.style.backgroundColor = originalBg;
          el.style.transition = originalTransition;
        }, 2000);

        break;
      }
    }
  };

  // Auto-close spell panel when no errors left
  useEffect(() => {
    if (spellErrors.length === 0 && showSpellPanel && !isChecking) {
      // Keep it open briefly to show "no errors" message
      const timer = setTimeout(() => {
        setShowSpellPanel(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [spellErrors.length, showSpellPanel, isChecking]);

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
    <main className="h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
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
        className={`relative z-10 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl ${showJobsPanel ? 'cursor-pointer' : ''}`}
        onClick={(e) => {
          if (showJobsPanel && (e.target as HTMLElement).closest('button') === null) {
            setShowJobsPanel(false);
          }
        }}
      >
        <div className="container mx-auto px-2 py-2">
          <div className="hidden xl:flex items-center gap-4">
            {/* Left: Logo - mit extra Abstand nach links */}
            <div className="flex items-center gap-2 ml-8">
              <img src="/lebenslauf-24icon.png?v=5" alt="Lebenslauf-24" className="w-10 h-10" />
              <div>
                <h1 className="text-lg font-bold gradient-text">Lebenslauf-24</h1>
                <p className="text-xs text-foreground/60">Dein professioneller Lebenslauf in Minuten</p>
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* User Info & Stellenangebote */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1 rounded-lg border border-white/10">
                <User className="w-3 h-3 text-foreground/60" />
                <span className="text-xs text-foreground/60">{user?.email}</span>
              </div>
              <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowJobsPanel(!showJobsPanel)}
                  className={`w-full h-7 text-xs glass ${
                    showJobsPanel
                      ? 'border-purple-500/50 bg-purple-500/20 text-purple-300'
                      : 'border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10'
                  }`}
                >
                  <Briefcase className="w-3 h-3 mr-1" />
                  Stellenangebote
                </Button>
            </div>

            {/* Version Switcher - 2 Rows */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground/70 w-20">Lebenslauf</span>
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg border border-white/10">
                  {[1, 2, 3, 4, 5, 6, 7].map((version) => (
                    <button
                      key={version}
                      onClick={() => { setCvVersion(version as 1 | 2 | 3 | 4 | 5 | 6 | 7); setActiveView("cv"); setCurrentPage(0); }}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${activeView === "cv" && cvVersion === version ? "bg-purple-600 text-white" : "text-foreground/60 hover:text-foreground/80"}`}
                    >
                      L{version}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground/70 w-20">Anschreiben</span>
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg border border-white/10">
                  {[1, 2, 3, 4, 5, 6, 7].map((version) => (
                    <button
                      key={version}
                      onClick={() => { setCoverVersion(version as 1 | 2 | 3 | 4 | 5 | 6 | 7); setActiveView("cover"); setCurrentPage(0); }}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${activeView === "cover" && coverVersion === version ? "bg-purple-600 text-white" : "text-foreground/60 hover:text-foreground/80"}`}
                    >
                      A{version}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: PDF Export - mit extra Abstand nach rechts */}
            <div className="flex flex-col gap-1 mr-8">
              <Button
                onClick={() => previewRef.current?.handleDownload()}
                disabled={isGeneratingPdf}
                size="sm"
                className="h-7 gap-1 text-xs"
              >
                <Download className={`w-3 h-3 ${isGeneratingPdf ? 'animate-bounce' : ''}`} />
                PDF Export
              </Button>
            </div>
          </div>

          {/* Smaller screens - simplified header */}
          <div className="xl:hidden flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/lebenslauf-24icon.png?v=5" alt="Lebenslauf-24" className="w-8 h-8" />
              <h1 className="text-lg font-bold gradient-text">Lebenslauf-24</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleLogout} variant="outline" size="sm" className="glass border-white/10">
                <LogOut className="w-4 h-4" />
              </Button>
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

      {/* Jobs Panel Overlay */}
      {showJobsPanel && (
        <div className="fixed inset-0 top-[74px] z-50">
          <JobsPanel isOpen={showJobsPanel} onClose={() => setShowJobsPanel(false)} />
        </div>
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
            className="w-1/2 bg-slate-900/30 backdrop-blur-sm overflow-y-auto relative"
          >
            {/* Undo/Redo + Page Navigation - kleines Feld links oben */}
            <div className="sticky top-9 left-0 ml-3 z-10 flex flex-col gap-1 float-left">
              {/* Undo/Redo */}
              <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-slate-900/80 border border-white/10 backdrop-blur-sm">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className={`p-0.5 rounded transition-all ${historyIndex <= 0 ? "text-foreground/30 cursor-not-allowed" : "text-foreground/60 hover:text-foreground hover:bg-white/10"}`}
                  title="Rückgängig (Strg+Z)"
                >
                  <Undo className="w-3 h-3" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className={`p-0.5 rounded transition-all ${historyIndex >= history.length - 1 ? "text-foreground/30 cursor-not-allowed" : "text-foreground/60 hover:text-foreground hover:bg-white/10"}`}
                  title="Wiederherstellen (Strg+Y)"
                >
                  <Redo className="w-3 h-3" />
                </button>
              </div>
              {/* Page Navigation */}
              {activeView === "cv" && totalPages > 1 && (
                <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-slate-900/80 border border-white/10 backdrop-blur-sm">
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className={`p-0.5 rounded transition-all ${currentPage === 0 ? "text-foreground/30 cursor-not-allowed" : "text-foreground/60 hover:text-foreground hover:bg-white/10"}`}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <span className="text-[10px] text-foreground/60">
                    {currentPage + 1}/{totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className={`p-0.5 rounded transition-all ${currentPage >= totalPages - 1 ? "text-foreground/30 cursor-not-allowed" : "text-foreground/60 hover:text-foreground hover:bg-white/10"}`}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
              {/* Color Scheme Selector for L1 and A1 */}
              {((activeView === "cv" && cvVersion === 1) || (activeView === "cover" && coverVersion === 1)) && (
                <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-slate-900/80 border border-white/10 backdrop-blur-sm">
                  <button
                    onClick={() => setCvData(prev => ({ ...prev, colorScheme: 'dark' }))}
                    className={`w-5 h-5 rounded-full bg-[#10172b] border-2 transition-all ${(!cvData.colorScheme || cvData.colorScheme === 'dark') ? 'border-purple-500 scale-110' : 'border-white/30 hover:border-white/50'}`}
                    title="Dunkles Farbschema"
                  />
                  <button
                    onClick={() => setCvData(prev => ({ ...prev, colorScheme: 'light' }))}
                    className={`w-5 h-5 rounded-full bg-white border-2 transition-all ${cvData.colorScheme === 'light' ? 'border-purple-500 scale-110' : 'border-white/30 hover:border-white/50'}`}
                    title="Helles Farbschema"
                  />
                </div>
              )}
              {/* Spell Check Button */}
              <div className="relative flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-slate-900/80 border border-white/10 backdrop-blur-sm">
                <button
                  onClick={() => {
                    if (spellErrors.length > 0) {
                      setShowSpellPanel(!showSpellPanel);
                    } else {
                      handleSpellCheck();
                    }
                  }}
                  disabled={isChecking}
                  className={`p-0.5 rounded transition-all ${isChecking ? 'text-purple-400' : spellErrors.length > 0 ? 'text-red-400' : 'text-foreground/60 hover:text-foreground hover:bg-white/10'}`}
                  title={spellErrors.length > 0 ? `${spellErrors.length} Fehler gefunden - Klicken zum Anzeigen` : "Rechtschreibprüfung starten"}
                >
                  {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <SpellCheck className="w-4 h-4" />}
                </button>
                {spellErrors.length > 0 && (
                  <span className="text-[10px] text-red-400 font-medium cursor-pointer" onClick={() => setShowSpellPanel(!showSpellPanel)}>{spellErrors.length}</span>
                )}
              </div>
            </div>
            {activeView === "cv" ? (
              <>
                {cvVersion === 1 && <CVPreviewV2 ref={previewRef} data={cvData} onChange={setCvData} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} setTotalPages={setTotalPages} setIsGenerating={setIsGeneratingPdf} />}
                {cvVersion === 2 && <CVPreview ref={previewRef} data={cvData} onChange={setCvData} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} setTotalPages={setTotalPages} setIsGenerating={setIsGeneratingPdf} />}
                {cvVersion === 3 && <CVPreviewV3 ref={previewRef} data={cvData} onChange={setCvData} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} setTotalPages={setTotalPages} setIsGenerating={setIsGeneratingPdf} />}
                {cvVersion === 4 && <CVPreviewV4 ref={previewRef} data={cvData} onChange={setCvData} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} setTotalPages={setTotalPages} setIsGenerating={setIsGeneratingPdf} />}
                {cvVersion === 5 && <CVPreviewV5 ref={previewRef} data={cvData} onChange={setCvData} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} setTotalPages={setTotalPages} setIsGenerating={setIsGeneratingPdf} />}
                {cvVersion === 6 && <CVPreviewV6 ref={previewRef} data={cvData} onChange={setCvData} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} setTotalPages={setTotalPages} setIsGenerating={setIsGeneratingPdf} />}
                {cvVersion === 7 && <CVPreviewV7 ref={previewRef} data={cvData} onChange={setCvData} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} setTotalPages={setTotalPages} setIsGenerating={setIsGeneratingPdf} />}
              </>
            ) : (
              <>
                {coverVersion === 1 && <CoverLetterA2 ref={previewRef} data={cvData} onChange={setCvData} setIsGenerating={setIsGeneratingPdf} />}
                {coverVersion === 2 && <CoverLetterA1 ref={previewRef} data={cvData} onChange={setCvData} setIsGenerating={setIsGeneratingPdf} />}
                {coverVersion === 3 && <CoverLetterA3 ref={previewRef} data={cvData} onChange={setCvData} setIsGenerating={setIsGeneratingPdf} />}
                {coverVersion === 4 && <CoverLetterA4 ref={previewRef} data={cvData} onChange={setCvData} setIsGenerating={setIsGeneratingPdf} />}
                {coverVersion === 5 && <CoverLetterA5 ref={previewRef} data={cvData} onChange={setCvData} setIsGenerating={setIsGeneratingPdf} />}
                {coverVersion === 6 && <CoverLetterA6 ref={previewRef} data={cvData} onChange={setCvData} setIsGenerating={setIsGeneratingPdf} />}
                {coverVersion === 7 && <CoverLetterA7 ref={previewRef} data={cvData} onChange={setCvData} setIsGenerating={setIsGeneratingPdf} />}
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
                className="bg-slate-900/30 backdrop-blur-sm overflow-hidden"
              >
                {/* Page Navigation - mobile */}
                {activeView === "cv" && totalPages > 1 && (
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50">
                    <button
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className={`p-1 rounded transition-all ${currentPage === 0 ? "text-foreground/30 cursor-not-allowed" : "text-foreground/60 hover:text-foreground hover:bg-white/10"}`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-foreground/60 min-w-[40px] text-center">
                      {currentPage + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                      disabled={currentPage >= totalPages - 1}
                      className={`p-1 rounded transition-all ${currentPage >= totalPages - 1 ? "text-foreground/30 cursor-not-allowed" : "text-foreground/60 hover:text-foreground hover:bg-white/10"}`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {activeView === "cv" ? (
                  <>
                    {cvVersion === 1 && <CVPreview ref={previewRef} data={cvData} onChange={setCvData} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} setTotalPages={setTotalPages} setIsGenerating={setIsGeneratingPdf} />}
                    {cvVersion === 2 && <CVPreviewV2 ref={previewRef} data={cvData} onChange={setCvData} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} setTotalPages={setTotalPages} setIsGenerating={setIsGeneratingPdf} />}
                    {cvVersion === 3 && <CVPreviewV3 ref={previewRef} data={cvData} onChange={setCvData} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} setTotalPages={setTotalPages} setIsGenerating={setIsGeneratingPdf} />}
                    {cvVersion === 4 && <CVPreviewV4 ref={previewRef} data={cvData} onChange={setCvData} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} setTotalPages={setTotalPages} setIsGenerating={setIsGeneratingPdf} />}
                    {cvVersion === 5 && <CVPreviewV5 ref={previewRef} data={cvData} onChange={setCvData} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} setTotalPages={setTotalPages} setIsGenerating={setIsGeneratingPdf} />}
                    {cvVersion === 6 && <CVPreviewV6 ref={previewRef} data={cvData} onChange={setCvData} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} setTotalPages={setTotalPages} setIsGenerating={setIsGeneratingPdf} />}
                    {cvVersion === 7 && <CVPreviewV7 ref={previewRef} data={cvData} onChange={setCvData} currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} setTotalPages={setTotalPages} setIsGenerating={setIsGeneratingPdf} />}
                  </>
                ) : (
                  <>
                    {coverVersion === 1 && <CoverLetterA1 ref={previewRef} data={cvData} onChange={setCvData} setIsGenerating={setIsGeneratingPdf} />}
                    {coverVersion === 2 && <CoverLetterA2 ref={previewRef} data={cvData} onChange={setCvData} setIsGenerating={setIsGeneratingPdf} />}
                    {coverVersion === 3 && <CoverLetterA3 ref={previewRef} data={cvData} onChange={setCvData} setIsGenerating={setIsGeneratingPdf} />}
                    {coverVersion === 4 && <CoverLetterA4 ref={previewRef} data={cvData} onChange={setCvData} setIsGenerating={setIsGeneratingPdf} />}
                    {coverVersion === 5 && <CoverLetterA5 ref={previewRef} data={cvData} onChange={setCvData} setIsGenerating={setIsGeneratingPdf} />}
                    {coverVersion === 6 && <CoverLetterA6 ref={previewRef} data={cvData} onChange={setCvData} setIsGenerating={setIsGeneratingPdf} />}
                    {coverVersion === 7 && <CoverLetterA7 ref={previewRef} data={cvData} onChange={setCvData} setIsGenerating={setIsGeneratingPdf} />}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Spell Error Panel - rendered at top level to avoid stacking context issues */}
      {showSpellPanel && (
        <SpellErrorPanel
          errors={spellErrors}
          apiError={spellApiError}
          onApplySuggestion={handleApplySuggestion}
          onIgnoreWord={handleIgnoreWord}
          onClose={() => setShowSpellPanel(false)}
          onClickError={handleScrollToError}
        />
      )}

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
