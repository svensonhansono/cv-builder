"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Building2, Calendar, ExternalLink, ArrowLeft, Search, Loader2, X, ChevronRight, Check, CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";
import { jobCategories, JobCategory } from "./categories";
import { AlphabetFilter } from "./alphabet-filter";
import { JobDetailsSection } from "./job-details-section";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit as firestoreLimit } from "firebase/firestore";

interface Job {
  refnr: string;  // Note: API returns lowercase 'refnr'
  titel: string;
  arbeitgeber: string;
  arbeitsort?: {
    ort?: string;
    plz?: string;
    region?: string;
    land?: string;
    entfernung?: string;
  };
  aktuelleVeroeffentlichungsdatum: string;
  arbeitszeit?: string;
  befristung?: string;
  externeUrl?: string;
}

interface JobDetails extends Job {
  stellenbeschreibung?: string;
  arbeitgeberdarstellung?: string;
  anforderungen?: string;
  angeboteneLeistungen?: string;
  verguetung?: string;
  beruf?: string;
  arbeitszeitdetails?: {
    arbeitszeit?: string;
    schichtmodell?: string;
  };
  standort?: {
    strasse?: string;
    plz?: string;
    ort?: string;
  };
  kontaktdaten?: {
    name?: string;
    telefon?: string;
    email?: string;
  };
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [viewMode, setViewMode] = useState<"categories" | "search">("categories");
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | null>(null);
  const [clickedCategory, setClickedCategory] = useState<JobCategory | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Search params
  const [searchTerm, setSearchTerm] = useState(""); // Berufsfeld/Stichwort (was)
  const [location, setLocation] = useState(""); // PLZ/Ort/Bundesland (wo)
  const [radius, setRadius] = useState("25"); // Umkreis in km
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [captchaSolution, setCaptchaSolution] = useState("");
  const [contactInfo, setContactInfo] = useState<any>(null);
  const [captchaImageUrl, setCaptchaImageUrl] = useState<string>("");
  const [captchaSessionId, setCaptchaSessionId] = useState<string>("");
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobDetails | null>(null);
  const [autoFoundContacts, setAutoFoundContacts] = useState<any>(null);
  const [loadingAutoContacts, setLoadingAutoContacts] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Auth Guard
  if (!authLoading && !user) {
    router.push('/login');
    return null;
  }

  // Helper function to check if text contains contact information
  const hasContactInfo = (text: string) => {
    if (!text) return false;

    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const urlPattern = /((?:www\.|https?:\/\/)[^\s]+)/g;
    const phonePattern = /(\d{2,5}[\s\/.-]?\d{3,}[\s\/.-]?\d{3,})/g;

    return emailPattern.test(text) || urlPattern.test(text) || phonePattern.test(text);
  };

  // Helper function to highlight contact information
  const highlightContactInfo = (text: string) => {
    if (!text) return text;

    // Regex patterns for emails, URLs, and phone numbers
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const urlPattern = /((?:www\.|https?:\/\/)[^\s]+)/g;
    const phonePattern = /(\d{2,5}[\s\/.-]?\d{3,}[\s\/.-]?\d{3,})/g;

    // Split text and highlight matches
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Find all matches
    const matches: Array<{index: number, length: number, text: string, type: string}> = [];

    text.replace(emailPattern, (match, p1, offset) => {
      matches.push({index: offset, length: match.length, text: match, type: 'email'});
      return match;
    });

    text.replace(urlPattern, (match, p1, offset) => {
      matches.push({index: offset, length: match.length, text: match, type: 'url'});
      return match;
    });

    text.replace(phonePattern, (match, p1, offset) => {
      matches.push({index: offset, length: match.length, text: match, type: 'phone'});
      return match;
    });

    // Sort matches by position
    matches.sort((a, b) => a.index - b.index);

    // Build result with highlighted parts
    matches.forEach((match, i) => {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add highlighted match
      parts.push(
        <span
          key={`highlight-${i}`}
          className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded font-semibold border border-green-500/40"
        >
          {match.text}
        </span>
      );

      lastIndex = match.index + match.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const handleViewJobDetails = async (job: Job) => {
    if (!job.refnr) {
      setSelectedJob(job as JobDetails);
      return;
    }

    setLoadingDetails(true);
    setSelectedJob(job as JobDetails);
    setJobDetails(null);
    setContactInfo(null);
    setAutoFoundContacts(null);
    setCaptchaSolution("");
    setCaptchaImageUrl("");
    setCaptchaSessionId("");

    try {
      // Lade Job-Details
      const detailsResponse = await fetch(
        `https://us-central1-lebenslauf-24.cloudfunctions.net/getJobDetails?refNr=${job.refnr}`
      );

      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();

        if (detailsData.success && detailsData.jobDetails) {
          console.log('✅ Job-Details von Cloud Function geladen:', detailsData.jobDetails);

          const stellenbeschreibung = detailsData.jobDetails.stellenbeschreibung || '';

          setJobDetails({
            stellenbeschreibung: stellenbeschreibung,
            fertigkeiten: detailsData.jobDetails.fertigkeiten || [],
            verguetung: detailsData.jobDetails.verguetung,
          });

          setSelectedJob({
            ...job,
            stellenbeschreibung: stellenbeschreibung,
            fertigkeiten: detailsData.jobDetails.fertigkeiten,
            verguetung: detailsData.jobDetails.verguetung,
            beruf: detailsData.jobDetails.beruf,
          } as JobDetails);

          // Check if description contains contact info
          if (!hasContactInfo(stellenbeschreibung)) {
            console.log('⚠️ Keine Kontaktdaten in der Beschreibung gefunden. Suche automatisch...');
            // Automatically search for contact information
            searchForContactInfo(job.arbeitgeber, job.arbeitsort);
          }
        }
      }

    } catch (error) {
      console.error('Failed to load job details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const searchForContactInfo = async (company: string, location: any) => {
    if (!company) return;

    setLoadingAutoContacts(true);
    try {
      const locationString = location?.ort
        ? `${location.plz || ''} ${location.ort}`.trim()
        : '';

      const response = await fetch(
        `https://us-central1-lebenslauf-24.cloudfunctions.net/searchCompanyContact?company=${encodeURIComponent(company)}&location=${encodeURIComponent(locationString)}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.contacts) {
          console.log('✅ Automatisch gefundene Kontaktdaten:', data.contacts);
          setAutoFoundContacts(data.contacts);
        }
      }
    } catch (error) {
      console.error('Failed to auto-search contact info:', error);
    } finally {
      setLoadingAutoContacts(false);
    }
  };

  const handleSolveCaptcha = async () => {
    if (!selectedJob?.refnr || !captchaSolution.trim() || !captchaSessionId) {
      alert("Bitte CAPTCHA-Lösung eingeben");
      return;
    }

    setLoadingCaptcha(true);
    try {
      const response = await fetch(
        `https://us-central1-lebenslauf-24.cloudfunctions.net/submitContactCaptcha`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refNr: selectedJob.refnr,
            sessionId: captchaSessionId,
            captchaSolution: captchaSolution
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setContactInfo(data.kontaktdaten);
        setCaptchaImageUrl("");
        setCaptchaSolution("");
        setCaptchaSessionId("");
        setShowCaptchaModal(false);
      } else {
        alert("CAPTCHA falsch oder abgelaufen.");
      }
    } catch (error) {
      alert("Fehler beim Laden der Kontaktdaten");
    } finally {
      setLoadingCaptcha(false);
    }
  };

  const handleSearch = async (page = 1, berufsfeld?: string) => {
    setLoading(true);
    setCurrentPage(page);
    setViewMode("search");

    try {
      console.log('🔍 Searching Arbeitsagentur API for jobs...');

      // Baue Suchbegriff: verwende berufsfeld ODER searchTerm ODER ausgewählte Kategorien
      const searchTermToUse = berufsfeld || searchTerm || selectedCategories.join(' ');

      console.log('Search params:', {
        was: searchTermToUse,
        wo: location,
        umkreis: radius,
        page,
      });

      // Rufe die Cloud Function auf, die die Arbeitsagentur API abfragt
      const params = new URLSearchParams({
        page: page.toString(),
        size: '50',
      });

      if (searchTermToUse) params.append('was', searchTermToUse);
      if (location) params.append('wo', location);
      if (radius) params.append('umkreis', radius);

      const response = await fetch(
        `https://us-central1-lebenslauf-24.cloudfunctions.net/searchJobs?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      console.log(`✅ API Response:`, data);

      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }

      // Transformiere API-Daten zu unserem Format
      const allJobs = (data.stellenangebote || []).map((job: any) => ({
        refnr: job.refnr,
        titel: job.titel || 'Stellenangebot',
        arbeitgeber: job.arbeitgeber || 'Unbekannt',
        arbeitsort: job.arbeitsort || {},
        aktuelleVeroeffentlichungsdatum: job.aktuelleVeroeffentlichungsdatum || new Date().toISOString(),
        arbeitszeit: job.arbeitszeit,
        befristung: job.befristung,
        externeUrl: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.refnr}`,
      }));

      console.log(`✅ Found ${allJobs.length} jobs from API`);

      setJobs(allJobs);
      setTotalResults(data.maxErgebnisse || allJobs.length);
      setSearchPerformed(true);

    } catch (error) {
      console.error('❌ Job search error:', error);
      setJobs([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category: JobCategory, event: React.MouseEvent<HTMLButtonElement>) => {
    // Toggle dropdown on/off
    if (clickedCategory?.id === category.id) {
      setClickedCategory(null);
    } else {
      try {
        const rect = event.currentTarget.getBoundingClientRect();
        const dropdownWidth = 350;

        // Position directly under the tile - ALWAYS below
        let left = rect.left;
        let top = rect.bottom + 8;

        // Adjust left position if dropdown would go off-screen to the right
        if (left + dropdownWidth > window.innerWidth - 20) {
          // Align right edge of dropdown with right edge of button
          left = rect.right - dropdownWidth;
        }

        // Ensure dropdown doesn't go off the left edge
        if (left < 20) {
          left = 20;
        }

        setDropdownPosition({
          top: top,
          left: left
        });
        setClickedCategory(category);
      } catch (error) {
        console.error('Error positioning dropdown:', error);
      }
    }
  };

  const handleSubcategoryClick = (subcategory: string) => {
    // Add to selected categories (like alphabet filter)
    if (selectedCategories.includes(subcategory)) {
      setSelectedCategories(selectedCategories.filter(c => c !== subcategory));
    } else {
      setSelectedCategories([...selectedCategories, subcategory]);
    }
    // Don't close dropdown, let user select multiple
  };

  const handleBackToCategories = () => {
    setViewMode("categories");
    setSelectedCategory(null);
    setJobs([]);
    setSearchPerformed(false);
    setTotalResults(0);
    setSearchTerm("");
    setLocation("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(1);
    }
  };

  const totalPages = Math.ceil(totalResults / 50);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 animate-pulse">
            <Briefcase className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-foreground/60">Wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      {/* Animated background */}
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
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="glass border-white/10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Zurück
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 shadow-lg shadow-green-500/30">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold gradient-text">Stellensuche</h1>
                  <p className="text-sm text-foreground/60">
                    {totalResults > 0
                      ? `${totalResults.toLocaleString('de-DE')} Stellen gefunden`
                      : "Arbeitsagentur Jobbörse"}
                  </p>
                </div>
              </div>
            </div>
            {viewMode === "search" && (
              <Button
                onClick={handleBackToCategories}
                variant="outline"
                size="sm"
                className="glass border-purple-500/30"
              >
                <X className="w-4 h-4 mr-2" />
                Kategorien
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Search Form - Always visible */}
      <div className="relative z-40 border-b border-white/10 bg-slate-900/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="glass rounded-xl p-6 border border-purple-500/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Berufsfeld / Stichwort */}
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-2">
                  Beruf, Stichwort oder Firma
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="z.B. Entwickler, Krankenpfleger, Vertrieb..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>

              {/* Ort / PLZ / Bundesland */}
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-2">
                  Ort, PLZ oder Bundesland
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="z.B. Berlin, 10115, Bayern, Deutschland..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>

              {/* Umkreis */}
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-2">
                  Umkreis
                </label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:border-purple-500/50"
                >
                  <option value="5">5 km</option>
                  <option value="10">10 km</option>
                  <option value="15">15 km</option>
                  <option value="20">20 km</option>
                  <option value="25">25 km</option>
                  <option value="30">30 km</option>
                  <option value="50">50 km</option>
                  <option value="100">100 km</option>
                  <option value="200">200 km</option>
                </select>
              </div>
            </div>

            {/* Search Button */}
            <Button
              onClick={() => handleSearch(1)}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Suche läuft...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Stellenangebote suchen
                </>
              )}
            </Button>

            {/* Ausgewählte Kategorien */}
            {selectedCategories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <span className="text-sm text-foreground/70">Ausgewählt ({selectedCategories.length}):</span>
                {selectedCategories.map(category => (
                  <motion.div
                    key={category}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-sm text-green-300 flex items-center gap-2"
                  >
                    <span>{category}</span>
                    <button
                      onClick={() => {
                        setSelectedCategories(selectedCategories.filter(c => c !== category));
                      }}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
                <button
                  onClick={() => setSelectedCategories([])}
                  className="text-xs px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-colors"
                >
                  Alle entfernen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {viewMode === "categories" && !selectedCategory && (
            <motion.div
              key="categories"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="relative">
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {jobCategories.map((category, index) => (
                    <motion.button
                      key={category.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={(e) => handleCategoryClick(category, e)}
                      className={`glass rounded-lg p-3 border transition-all hover:shadow-lg flex flex-col items-center gap-2 text-center group ${
                        clickedCategory?.id === category.id
                          ? 'border-purple-500/50 shadow-purple-500/20'
                          : 'border-white/10 hover:border-green-500/30 hover:shadow-green-500/10'
                      }`}
                    >
                      <div className="text-3xl group-hover:scale-110 transition-transform" style={{
                        filter: 'drop-shadow(0 0 1px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 2px rgba(255, 255, 255, 0.6))'
                      }}>
                        {category.icon}
                      </div>
                      <span className="text-xs font-medium text-foreground group-hover:text-green-400 transition-colors">
                        {category.name}
                      </span>
                    </motion.button>
                  ))}
                </div>

                {/* Click Dropdown for Subcategories */}
                <AnimatePresence>
                  {clickedCategory && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="fixed w-[350px]"
                      style={{
                        zIndex: 9999,
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`
                      }}
                    >
                      <div className="glass rounded-lg p-4 border border-purple-500/30 shadow-2xl max-h-[400px] overflow-y-auto bg-slate-900/95 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{clickedCategory.icon}</span>
                            <h3 className="font-semibold text-purple-300">{clickedCategory.name}</h3>
                          </div>
                          <button
                            onClick={() => setClickedCategory(null)}
                            className="text-foreground/50 hover:text-red-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs text-foreground/50 mb-2">
                          {clickedCategory.subcategories.length} Unterkategorien
                        </div>
                        <div className="space-y-1">
                          {clickedCategory.subcategories.map(subcategory => (
                            <button
                              key={subcategory}
                              onClick={() => handleSubcategoryClick(subcategory)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between gap-2 ${
                                selectedCategories.includes(subcategory)
                                  ? "bg-green-500/20 border border-green-500/40 text-green-300"
                                  : "hover:bg-slate-700/50 text-foreground/80 hover:text-green-400"
                              }`}
                            >
                              <span className="flex-1">{subcategory}</span>
                              {selectedCategories.includes(subcategory) && (
                                <Check className="w-4 h-4 text-green-400" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {viewMode === "search" && (
            <motion.div
              key="search-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                    <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                  </div>
                  <p className="text-foreground/60">Suche nach Stellenangeboten...</p>
                </div>
              ) : !searchPerformed ? (
                <div className="text-center py-12">
                  <Briefcase className="w-16 h-16 text-foreground/20 mx-auto mb-4" />
                  <p className="text-foreground/60 text-lg">Gib deine Suchkriterien ein und klicke auf "Stellenangebote suchen"</p>
                  <p className="text-foreground/40 text-sm mt-2">
                    Oder wähle eine Kategorie aus
                  </p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="w-16 h-16 text-foreground/20 mx-auto mb-4" />
                  <p className="text-foreground/60 text-lg">Keine Stellenangebote gefunden</p>
                  <p className="text-foreground/40 text-sm mt-2">
                    Versuche es mit anderen Suchbegriffen oder wähle eine Kategorie
                  </p>
                </div>
              ) : (
                <>
                  {/* Results Header */}
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-foreground/60">
                      {totalResults.toLocaleString('de-DE')} Stellenangebote gefunden
                      {searchTerm && ` für "${searchTerm}"`}
                      {location && ` in ${location}`}
                    </p>
                    <p className="text-sm text-foreground/50">
                      Seite {currentPage} von {totalPages}
                    </p>
                  </div>

                  {/* Job Listings */}
                  <div className="grid gap-4 mb-8">
                    {jobs.filter(job => job).map((job, index) => {
                      // Safe date parsing
                      let formattedDate = 'N/A';
                      try {
                        if (job.aktuelleVeroeffentlichungsdatum) {
                          formattedDate = new Date(job.aktuelleVeroeffentlichungsdatum).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          });
                        }
                      } catch (e) {
                        console.error('Error formatting date:', e);
                      }

                      return (
                        <motion.div
                          key={job.refnr || `job-${index}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.03 }}
                          className="glass rounded-xl p-6 border border-white/10 hover:border-green-500/30 transition-all hover:shadow-lg hover:shadow-green-500/10"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-semibold text-foreground mb-2">
                                {job.titel || 'Stellenangebot'}
                              </h3>

                              <div className="flex flex-wrap gap-4 text-sm text-foreground/70 mb-3">
                                {job.arbeitgeber && (
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    <span>{job.arbeitgeber}</span>
                                  </div>
                                )}

                                {job.arbeitsort?.ort && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    <span>
                                      {job.arbeitsort.plz && `${job.arbeitsort.plz} `}
                                      {job.arbeitsort.ort}
                                      {job.arbeitsort.region && `, ${job.arbeitsort.region}`}
                                      {job.arbeitsort.entfernung && (
                                        <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                                          {job.arbeitsort.entfernung} km
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>{formattedDate}</span>
                                </div>
                              </div>

                              {job.arbeitszeit && (
                                <div className="inline-block px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-300 mb-3">
                                  {job.arbeitszeit}
                                </div>
                              )}
                            </div>

                            <Button
                              onClick={() => handleViewJobDetails(job)}
                              className="shrink-0 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                            >
                              <ChevronRight className="w-4 h-4 mr-2" />
                              Details
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={() => handleSearch(currentPage - 1, searchTerm)}
                        disabled={currentPage === 1 || loading}
                        variant="outline"
                        className="glass border-white/10"
                      >
                        ← Zurück
                      </Button>

                      <div className="flex items-center gap-2">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              onClick={() => handleSearch(pageNum, searchTerm)}
                              disabled={loading}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              className={currentPage === pageNum ? "bg-green-600" : "glass border-white/10"}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        onClick={() => handleSearch(currentPage + 1, searchTerm)}
                        disabled={currentPage === totalPages || loading}
                        variant="outline"
                        className="glass border-white/10"
                      >
                        Weiter →
                      </Button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Job Details Modal/Overlay */}
      <AnimatePresence>
        {selectedJob && (
          <>
            {/* Overlay Background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedJob(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            />

            {/* Right-side Modal */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full md:w-[600px] lg:w-[700px] bg-slate-900 shadow-2xl z-[9999] overflow-y-auto"
            >
              <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold gradient-text">Stellendetails</h2>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-6 h-6 text-foreground/70 hover:text-red-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Loading Indicator */}
                {loadingDetails && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    <span className="ml-2 text-sm text-foreground/70">Lade vollständige Details...</span>
                  </div>
                )}

                {/* Job Title */}
                <div>
                  <h3 className="text-3xl font-bold text-foreground mb-2">
                    {selectedJob.titel || 'Stellenangebot'}
                  </h3>
                  {selectedJob.beruf && (
                    <p className="text-sm text-foreground/60">Berufsbezeichnung: {selectedJob.beruf}</p>
                  )}
                </div>

                {/* Company and Location */}
                <div className="glass rounded-xl p-4 border border-purple-500/20 space-y-3">
                  {selectedJob.arbeitgeber && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Building2 className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-foreground/50">Arbeitgeber</p>
                        <p className="text-lg font-semibold text-foreground">{selectedJob.arbeitgeber}</p>
                      </div>
                    </div>
                  )}

                  {selectedJob.arbeitsort?.ort && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <MapPin className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-foreground/50">Arbeitsort</p>
                        <p className="text-lg font-semibold text-foreground">
                          {selectedJob.arbeitsort.plz && `${selectedJob.arbeitsort.plz} `}
                          {selectedJob.arbeitsort.ort}
                          {selectedJob.arbeitsort.region && `, ${selectedJob.arbeitsort.region}`}
                        </p>
                        {selectedJob.arbeitsort.entfernung && (
                          <p className="text-sm text-foreground/60 mt-1">
                            Entfernung: {selectedJob.arbeitsort.entfernung} km
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Calendar className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-foreground/50">Veröffentlicht</p>
                      <p className="text-lg font-semibold text-foreground">
                        {(() => {
                          try {
                            if (selectedJob.aktuelleVeroeffentlichungsdatum) {
                              return new Date(selectedJob.aktuelleVeroeffentlichungsdatum).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              });
                            }
                            return 'N/A';
                          } catch (e) {
                            return 'N/A';
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Erweiterte Job-Details */}
                <div className="space-y-4 mt-6">
                  {/* Stellenbeschreibung */}
                  {jobDetails?.stellenbeschreibung && (
                    <div className="glass rounded-lg p-5 border border-purple-500/20">
                      <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">
                        Stellenbeschreibung
                      </h4>
                      <div className="text-foreground/90 text-sm whitespace-pre-wrap">
                        {highlightContactInfo(jobDetails.stellenbeschreibung)}
                      </div>
                    </div>
                  )}

                  {/* Weitere verfügbare Infos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedJob.beruf && (
                      <div className="glass rounded-lg p-4 border border-purple-500/20">
                        <h5 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
                          Berufsfeld
                        </h5>
                        <p className="text-foreground/80 text-sm">{selectedJob.beruf}</p>
                      </div>
                    )}

                    {selectedJob.arbeitszeit && (
                      <div className="glass rounded-lg p-4 border border-purple-500/20">
                        <h5 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
                          Arbeitszeit
                        </h5>
                        <p className="text-foreground/80 text-sm">{selectedJob.arbeitszeit}</p>
                      </div>
                    )}

                    {selectedJob.eintrittsdatum && (
                      <div className="glass rounded-lg p-4 border border-purple-500/20">
                        <h5 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
                          Eintrittsdatum
                        </h5>
                        <p className="text-foreground/80 text-sm">{selectedJob.eintrittsdatum}</p>
                      </div>
                    )}

                    {selectedJob.befristung && (
                      <div className="glass rounded-lg p-4 border border-purple-500/20">
                        <h5 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
                          Befristung
                        </h5>
                        <p className="text-foreground/80 text-sm">{selectedJob.befristung}</p>
                      </div>
                    )}
                  </div>

                  {/* Arbeitsagentur-Seite als Spiegel */}
                  {selectedJob.refnr && (
                    <div className="space-y-3">
                      {loadingDetails && (
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            Vollständige Details & Kontakt
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-foreground/50">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Lädt...</span>
                          </div>
                        </div>
                      )}

                      {/* Native Job-Details von API */}
                      {jobDetails && (
                        <div className="space-y-6">
                          {/* Anforderungen */}
                          {jobDetails.fertigkeiten && jobDetails.fertigkeiten.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
                                Anforderungen
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {jobDetails.fertigkeiten.map((skill: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300"
                                  >
                                    {skill.auspraegung || skill.hierarchie || skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Vergütung */}
                          {jobDetails.verguetung && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
                                Vergütung
                              </h4>
                              <p className="text-foreground/80">{jobDetails.verguetung}</p>
                            </div>
                          )}

                          {/* Automatisch gefundene Kontaktdaten */}
                          {(loadingAutoContacts || autoFoundContacts) && (
                            <div className="pt-4 border-t border-white/10 space-y-3">
                              <h4 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                                Gefundene Kontaktinformationen
                              </h4>

                              {loadingAutoContacts && (
                                <div className="flex items-center gap-2 text-sm text-foreground/60">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Suche nach Kontaktdaten...</span>
                                </div>
                              )}

                              {autoFoundContacts && (
                                <div className="glass rounded-lg p-4 border border-blue-500/30 space-y-3">
                                  {autoFoundContacts.phone && (
                                    <div>
                                      <p className="text-xs text-foreground/50 uppercase tracking-wider mb-2">Telefon</p>
                                      <a
                                        href={`tel:${autoFoundContacts.phone}`}
                                        className="text-green-400 hover:underline text-lg font-semibold"
                                      >
                                        {autoFoundContacts.phone}
                                      </a>
                                    </div>
                                  )}

                                  {autoFoundContacts.website && (
                                    <div>
                                      <p className="text-xs text-foreground/50 uppercase tracking-wider mb-2">Website</p>
                                      <a
                                        href={autoFoundContacts.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:underline"
                                      >
                                        {autoFoundContacts.website}
                                      </a>
                                    </div>
                                  )}

                                  {!autoFoundContacts.phone && !autoFoundContacts.website && (
                                    <p className="text-sm text-foreground/50">
                                      Keine Kontaktdaten gefunden.
                                    </p>
                                  )}

                                  <p className="text-xs text-foreground/40 mt-2">
                                    Automatisch gefunden
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  )}


                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </main>
  );
}
