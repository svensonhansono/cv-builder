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
  const [publishedSince, setPublishedSince] = useState(""); // Veröffentlicht seit X Tagen
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
  const [sortingJobs, setSortingJobs] = useState(false);
  const [jobsWithContactInfo, setJobsWithContactInfo] = useState<Set<string>>(new Set());

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Auto-search on page load
  useEffect(() => {
    if (!authLoading && user) {
      handleSearch(1);
    }
  }, [authLoading, user]);

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

  // Helper function to highlight search terms in text
  const highlightSearchTerm = (text: string, term: string): React.ReactNode => {
    if (!text || !term) return text;

    // Split term by spaces AND commas to highlight each word
    const terms = term.split(/[\s,;]+/).filter(t => t.length > 1);
    if (terms.length === 0) return text;

    // Create regex pattern for all terms (case insensitive)
    const pattern = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(pattern);

    return parts.map((part, i) => {
      const isMatch = terms.some(t => part.toLowerCase() === t.toLowerCase());
      if (isMatch) {
        return (
          <span key={i} className="bg-yellow-500/30 text-yellow-200 px-1 rounded font-semibold">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Helper function to highlight contact information AND search terms
  const highlightContactInfo = (text: string, searchTermToHighlight?: string) => {
    if (!text) return text;

    // Regex patterns for emails, URLs, and phone numbers
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const urlPattern = /((?:www\.|https?:\/\/)[^\s]+)/g;
    const phonePattern = /(\d{2,5}[\s\/.-]?\d{3,}[\s\/.-]?\d{3,})/g;

    // Search term pattern - split by spaces AND commas
    let searchTerms: string[] = [];
    if (searchTermToHighlight) {
      searchTerms = searchTermToHighlight.split(/[\s,;]+/).filter(t => t.length > 1);
    }

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

    // Find search term matches
    if (searchTerms.length > 0) {
      const searchPattern = new RegExp(`(${searchTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
      let searchMatch;
      while ((searchMatch = searchPattern.exec(text)) !== null) {
        // Check if this position is not already covered by a contact match
        const overlapsWithContact = matches.some(m =>
          (searchMatch!.index >= m.index && searchMatch!.index < m.index + m.length) ||
          (searchMatch!.index + searchMatch![0].length > m.index && searchMatch!.index + searchMatch![0].length <= m.index + m.length)
        );
        if (!overlapsWithContact) {
          matches.push({
            index: searchMatch.index,
            length: searchMatch[0].length,
            text: searchMatch[0],
            type: 'search'
          });
        }
      }
    }

    // Sort matches by position
    matches.sort((a, b) => a.index - b.index);

    // Remove overlapping matches (keep contact info priority)
    const filteredMatches: typeof matches = [];
    let lastEnd = 0;
    for (const match of matches) {
      if (match.index >= lastEnd) {
        filteredMatches.push(match);
        lastEnd = match.index + match.length;
      }
    }

    // Build result with highlighted parts
    filteredMatches.forEach((match, i) => {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add highlighted match with different styles for contact vs search
      if (match.type === 'search') {
        parts.push(
          <span
            key={`highlight-${i}`}
            className="bg-yellow-500/30 text-yellow-200 px-1 rounded font-semibold"
          >
            {match.text}
          </span>
        );
      } else {
        parts.push(
          <span
            key={`highlight-${i}`}
            className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded font-semibold border border-green-500/40"
          >
            {match.text}
          </span>
        );
      }

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

        }
      }

    } catch (error) {
      console.error('Failed to load job details:', error);
    } finally {
      setLoadingDetails(false);
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
      console.log('Search state:', { searchTerm, location, radius, publishedSince, selectedCategories });

      // Wenn mehrere Kategorien ausgewählt sind, führe mehrere Suchen parallel aus
      const categoriesToSearch = selectedCategories.length > 0 ? selectedCategories : [];
      const mainSearchTerm = berufsfeld || searchTerm;

      let allJobs: Job[] = [];
      let totalMax = 0;

      // Check if location is a German state (Bundesland) - for all searches
      // Map to central cities for better API coverage (API doesn't support Bundesland filter natively)
      const bundeslaenderMap: { [key: string]: { name: string; city: string } } = {
        'baden-württemberg': { name: 'Baden-Württemberg', city: 'Stuttgart' },
        'bayern': { name: 'Bayern', city: 'München' },
        'berlin': { name: 'Berlin', city: 'Berlin' },
        'brandenburg': { name: 'Brandenburg', city: 'Potsdam' },
        'bremen': { name: 'Bremen', city: 'Bremen' },
        'hamburg': { name: 'Hamburg', city: 'Hamburg' },
        'hessen': { name: 'Hessen', city: 'Frankfurt am Main' },
        'mecklenburg-vorpommern': { name: 'Mecklenburg-Vorpommern', city: 'Rostock' },
        'niedersachsen': { name: 'Niedersachsen', city: 'Hannover' },
        'nordrhein-westfalen': { name: 'Nordrhein-Westfalen', city: 'Düsseldorf' },
        'rheinland-pfalz': { name: 'Rheinland-Pfalz', city: 'Mainz' },
        'saarland': { name: 'Saarland', city: 'Saarbrücken' },
        'sachsen': { name: 'Sachsen', city: 'Dresden' },
        'sachsen-anhalt': { name: 'Sachsen-Anhalt', city: 'Magdeburg' },
        'schleswig-holstein': { name: 'Schleswig-Holstein', city: 'Kiel' },
        'thüringen': { name: 'Thüringen', city: 'Erfurt' }
      };

      let searchLocation = location;
      let bundeslandName = '';
      let isBundesland = false;
      const bundeslandData = location ? bundeslaenderMap[location.toLowerCase().trim()] : null;
      if (bundeslandData) {
        bundeslandName = bundeslandData.name;
        searchLocation = bundeslandData.city; // Use central city for search
        isBundesland = true;
      }

      // Wenn Kategorien ausgewählt sind, suche nach jeder Kategorie separat
      if (categoriesToSearch.length > 0 && !mainSearchTerm) {
        console.log(`Searching for ${categoriesToSearch.length} categories in parallel...`);

        const searchPromises = categoriesToSearch.map(async (category) => {
          const params = new URLSearchParams({
            page: page.toString(),
            size: '25', // Kleinere Anzahl pro Kategorie
          });

          params.append('was', category);
          if (searchLocation) params.append('wo', searchLocation);
          // For Bundesland search, use large radius to cover the whole state
          if (isBundesland) {
            params.append('umkreis', '200');
          } else if (radius) {
            params.append('umkreis', radius);
          }
          if (publishedSince) params.append('veroeffentlichtseit', publishedSince);

          try {
            const response = await fetch(
              `https://us-central1-lebenslauf-24.cloudfunctions.net/searchJobs?${params.toString()}`
            );

            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                return {
                  jobs: data.stellenangebote || [],
                  max: data.maxErgebnisse || 0
                };
              }
            }
          } catch (err) {
            console.error(`Error searching for ${category}:`, err);
          }
          return { jobs: [], max: 0 };
        });

        const results = await Promise.all(searchPromises);

        // Kombiniere Ergebnisse und entferne Duplikate basierend auf refnr
        const seenRefnrs = new Set<string>();
        results.forEach(result => {
          result.jobs.forEach((job: any) => {
            if (!seenRefnrs.has(job.refnr)) {
              seenRefnrs.add(job.refnr);
              allJobs.push({
                refnr: job.refnr,
                titel: job.titel || 'Stellenangebot',
                arbeitgeber: job.arbeitgeber || 'Unbekannt',
                arbeitsort: job.arbeitsort || {},
                aktuelleVeroeffentlichungsdatum: job.aktuelleVeroeffentlichungsdatum || new Date().toISOString(),
                arbeitszeit: job.arbeitszeit,
                befristung: job.befristung,
                externeUrl: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.refnr}`,
              });
            }
          });
          totalMax += result.max;
        });

        console.log(`✅ Found ${allJobs.length} unique jobs from ${categoriesToSearch.length} category searches`);
      } else {
        // Normale Suche mit Suchbegriff an API
        const searchTermToUse = mainSearchTerm || categoriesToSearch.join(' ');

        // Prüfe ob mehrere Suchbegriffe mit Komma getrennt sind
        const searchTerms = searchTermToUse
          ? searchTermToUse.split(/[,;]+/).map((t: string) => t.trim()).filter((t: string) => t.length > 0)
          : [];

        console.log('Search params:', {
          was: searchTermToUse,
          terms: searchTerms,
          wo: searchLocation,
          umkreis: radius,
          page,
        });

        // Wenn mehrere Suchbegriffe, suche für jeden parallel
        if (searchTerms.length > 1) {
          console.log(`🔍 Searching for ${searchTerms.length} terms in parallel: ${searchTerms.join(', ')}`);

          const searchPromises = searchTerms.map(async (term: string) => {
            const params = new URLSearchParams({
              page: page.toString(),
              size: '50',
            });

            params.append('was', term);
            if (searchLocation) params.append('wo', searchLocation);
            if (isBundesland) {
              params.append('umkreis', '200');
            } else if (radius) {
              params.append('umkreis', radius);
            }
            if (publishedSince) params.append('veroeffentlichtseit', publishedSince);

            try {
              const response = await fetch(
                `https://us-central1-lebenslauf-24.cloudfunctions.net/searchJobs?${params.toString()}`
              );

              if (response.ok) {
                const data = await response.json();
                if (data.success) {
                  return {
                    jobs: data.stellenangebote || [],
                    max: data.maxErgebnisse || 0
                  };
                }
              }
            } catch (err) {
              console.error(`Error searching for "${term}":`, err);
            }
            return { jobs: [], max: 0 };
          });

          const results = await Promise.all(searchPromises);

          // Kombiniere Ergebnisse und entferne Duplikate basierend auf refnr
          const seenRefnrs = new Set<string>();
          results.forEach(result => {
            result.jobs.forEach((job: any) => {
              if (!seenRefnrs.has(job.refnr)) {
                seenRefnrs.add(job.refnr);
                allJobs.push({
                  refnr: job.refnr,
                  titel: job.titel || 'Stellenangebot',
                  arbeitgeber: job.arbeitgeber || 'Unbekannt',
                  arbeitsort: job.arbeitsort || {},
                  aktuelleVeroeffentlichungsdatum: job.aktuelleVeroeffentlichungsdatum || new Date().toISOString(),
                  arbeitszeit: job.arbeitszeit,
                  befristung: job.befristung,
                  externeUrl: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.refnr}`,
                });
              }
            });
            totalMax += result.max;
          });

          console.log(`✅ Found ${allJobs.length} unique jobs from ${searchTerms.length} search terms`);
        } else {
          // Einzelner Suchbegriff - normale Suche
          const params = new URLSearchParams({
            page: page.toString(),
            size: '50',
          });

          if (searchTermToUse) params.append('was', searchTermToUse);
          if (searchLocation) params.append('wo', searchLocation);
          // For Bundesland search, use large radius to cover the whole state
          if (isBundesland) {
            params.append('umkreis', '200');
          } else if (radius) {
            params.append('umkreis', radius);
          }
          if (publishedSince) params.append('veroeffentlichtseit', publishedSince);

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

          allJobs = (data.stellenangebote || []).map((job: any) => ({
            refnr: job.refnr,
            titel: job.titel || 'Stellenangebot',
            arbeitgeber: job.arbeitgeber || 'Unbekannt',
            arbeitsort: job.arbeitsort || {},
            aktuelleVeroeffentlichungsdatum: job.aktuelleVeroeffentlichungsdatum || new Date().toISOString(),
            arbeitszeit: job.arbeitszeit,
            befristung: job.befristung,
            externeUrl: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.refnr}`,
          }));

          totalMax = data.maxErgebnisse || allJobs.length;
          console.log(`✅ Found ${allJobs.length} jobs from API`);
        }
      }

      // Zeige Jobs sofort sortiert nach Datum
      const dateSortedJobs = [...allJobs].sort((a, b) => {
        const dateA = new Date(a.aktuelleVeroeffentlichungsdatum).getTime();
        const dateB = new Date(b.aktuelleVeroeffentlichungsdatum).getTime();
        return dateB - dateA;
      });

      setJobs(dateSortedJobs);
      setTotalResults(totalMax || allJobs.length);
      setSearchPerformed(true);
      setLoading(false);

      // Im Hintergrund nach Kontaktdaten prüfen
      const contactInfoSet = new Set<string>();

      const checkJobsForContactInfo = async () => {
        const batchSize = 10;
        for (let i = 0; i < allJobs.length; i += batchSize) {
          const batch = allJobs.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (job: Job) => {
              try {
                const response = await fetch(
                  `https://us-central1-lebenslauf-24.cloudfunctions.net/getJobDetails?refNr=${job.refnr}`
                );
                if (response.ok) {
                  const detailsData = await response.json();
                  if (detailsData.success && detailsData.jobDetails?.stellenbeschreibung) {
                    const description = detailsData.jobDetails.stellenbeschreibung;
                    if (hasContactInfo(description)) {
                      contactInfoSet.add(job.refnr);
                    }
                  }
                }
              } catch (err) {
                // Ignoriere Fehler
              }
            })
          );
        }

        // Sortiere: Mit Kontaktdaten zuerst, dann nach Datum
        setJobsWithContactInfo(contactInfoSet);
        const sortedJobs = [...allJobs].sort((a, b) => {
          const aHasContact = contactInfoSet.has(a.refnr) ? 1 : 0;
          const bHasContact = contactInfoSet.has(b.refnr) ? 1 : 0;

          if (bHasContact !== aHasContact) {
            return bHasContact - aHasContact;
          }

          const dateA = new Date(a.aktuelleVeroeffentlichungsdatum).getTime();
          const dateB = new Date(b.aktuelleVeroeffentlichungsdatum).getTime();
          return dateB - dateA;
        });

        setJobs(sortedJobs);
        console.log(`✅ Jobs sortiert: ${contactInfoSet.size} mit Kontaktdaten`);
      };

      checkJobsForContactInfo();

    } catch (error) {
      console.error('❌ Job search error:', error);
      setJobs([]);
      setTotalResults(0);
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
    // Close dropdown and return to category tiles
    setClickedCategory(null);
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
    <main className="min-h-screen h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
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
        <div className="w-full lg:w-[98%] max-w-none mx-auto px-3 lg:px-4 py-3 lg:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 lg:gap-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="glass border-white/10 px-2 lg:px-3">
                  <ArrowLeft className="w-4 h-4 lg:mr-2" />
                  <span className="hidden lg:inline">Zurück</span>
                </Button>
              </Link>
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="p-1.5 lg:p-2 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 shadow-lg shadow-green-500/30">
                  <Briefcase className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg lg:text-2xl font-bold gradient-text">Stellensuche</h1>
                  <p className="text-xs lg:text-sm text-foreground/60 hidden sm:block">
                    {totalResults > 0
                      ? `${totalResults.toLocaleString('de-DE')} Stellen gefunden`
                      : "Arbeitsagentur Jobbörse"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <div className="relative z-10 w-full lg:w-[98%] max-w-none mx-auto px-2 lg:px-4 py-3 lg:py-6 h-[calc(100vh-70px)] lg:h-[calc(100vh-100px)] overflow-y-auto lg:overflow-visible">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full">
          {/* Left Column - Search Form & Categories (Sticky on Desktop) */}
          <div className="w-full lg:w-[420px] flex-shrink-0 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-130px)] lg:overflow-y-auto">
            {/* Search Form */}
            <div className="glass rounded-xl p-5 border border-purple-500/20 mb-4">
              <div className="space-y-4">
                {/* Kategorien ODER Unterkategorien - ganz oben, feste Höhe */}
                <div className="h-auto lg:h-[395px]">
                  <AnimatePresence mode="wait">
                    {!clickedCategory ? (
                      <motion.div
                        key="categories"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 lg:h-[380px] content-start"
                      >
                      {jobCategories.slice(0, 16).map((category, index) => {
                        const hasSelectedSubcategory = category.subcategories.some(sub =>
                          selectedCategories.includes(sub)
                        );

                        return (
                          <motion.button
                            key={category.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            onClick={(e) => handleCategoryClick(category, e)}
                            className={`glass rounded-lg px-2 py-3 border transition-all hover:shadow-lg flex flex-col items-center gap-1.5 text-center group ${
                              hasSelectedSubcategory
                                ? 'border-green-500/50 shadow-green-500/20 bg-green-500/10'
                                : 'border-white/10 hover:border-green-500/30 hover:shadow-green-500/10'
                            }`}
                          >
                            <div className="text-2xl group-hover:scale-110 transition-transform" style={{
                              filter: 'drop-shadow(0 0 1px rgba(255, 255, 255, 0.8))'
                            }}>
                              {category.icon}
                            </div>
                            <span className={`text-[9px] font-medium transition-colors leading-tight ${
                              hasSelectedSubcategory ? 'text-green-400' : 'text-foreground/70 group-hover:text-green-400'
                            }`}>
                              {category.name}
                            </span>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="subcategories"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="glass rounded-lg p-2 border border-purple-500/30 bg-slate-900/95 backdrop-blur-xl h-auto max-h-[300px] lg:h-[380px] flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{clickedCategory.icon}</span>
                          <h3 className="font-semibold text-purple-300 text-xs">{clickedCategory.name}</h3>
                        </div>
                        <button
                          onClick={() => setClickedCategory(null)}
                          className="text-foreground/50 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-0.5 flex-1 overflow-y-auto">
                        {clickedCategory.subcategories.map(subcategory => (
                          <button
                            key={subcategory}
                            onClick={() => handleSubcategoryClick(subcategory)}
                            className={`text-left px-2 py-1 rounded-lg text-[10px] transition-all flex items-center justify-between gap-1.5 ${
                              selectedCategories.includes(subcategory)
                                ? "bg-green-500/20 border border-green-500/40 text-green-300"
                                : "hover:bg-slate-700/50 text-foreground/80 hover:text-green-400 border border-transparent"
                            }`}
                          >
                            <span className="flex-1 truncate">{subcategory}</span>
                            {selectedCategories.includes(subcategory) && (
                              <Check className="w-2.5 h-2.5 text-green-400 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </div>

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
                      placeholder="z.B. Entwickler, Vertrieb..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-purple-500/50 text-sm"
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
                      placeholder="z.B. Berlin, 10115..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-purple-500/50 text-sm"
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
                    className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:border-purple-500/50 text-sm"
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

                {/* Veröffentlicht seit Filter */}
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-2">
                    Veröffentlicht seit
                  </label>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {[
                      { value: "", label: "Alle" },
                      { value: "7", label: "7 Tage" },
                      { value: "14", label: "14 Tage" },
                      { value: "21", label: "21 Tage" },
                      { value: "28", label: "28 Tage" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setPublishedSince(option.value)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          publishedSince === option.value
                            ? "bg-green-500/20 border border-green-500/50 text-green-300"
                            : "bg-slate-900/50 border border-white/10 text-foreground/70 hover:border-green-500/30 hover:text-green-400"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                    {/* Search Button */}
                    <button
                      onClick={() => handleSearch(1)}
                      disabled={loading}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-green-500/20 flex-1 min-w-[100px]"
                    >
                      {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      Suchen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Search Results */}
          <div className="flex-1 flex flex-col lg:max-h-[calc(100vh-130px)]">
            {/* Fixed Header - außerhalb des scrollbaren Bereichs */}
            {jobs.length > 0 && (
              <div className="pb-3 pt-1 flex-shrink-0">
                {/* Results Header */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-foreground/60">
                    {totalResults.toLocaleString('de-DE')} Stellenangebote gefunden
                    {searchTerm && ` für "${searchTerm}"`}
                    {location && ` in ${location}`}
                  </p>
                  <p className="text-sm text-foreground/50">
                    Seite {currentPage} von {totalPages}
                  </p>
                </div>

                {/* Ausgewählte Kategorien */}
                {selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    {selectedCategories.map(category => (
                      <motion.div
                        key={category}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-xs text-green-300 flex items-center gap-1"
                      >
                        <span className="truncate max-w-[150px]">{category}</span>
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
                      className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-colors"
                    >
                      Alle entfernen
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Scrollable Job List */}
            <div className="flex-1 overflow-y-auto pr-2">
              <AnimatePresence>
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
                      {/* Job Listings */}
                      <div className="grid gap-3 mb-6">
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
                              className="glass rounded-xl p-3 lg:p-5 border border-white/10 hover:border-green-500/30 transition-all hover:shadow-lg hover:shadow-green-500/10"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                                <div className="flex-1">
                                  <div className="mb-2">
                                    <h3 className="text-base lg:text-lg font-semibold text-foreground inline">
                                      {searchTerm ? highlightSearchTerm(job.titel || 'Stellenangebot', searchTerm) : (job.titel || 'Stellenangebot')}
                                    </h3>
                                    {jobsWithContactInfo.has(job.refnr) && (
                                      <span className="text-xs text-foreground/50 ml-2">
                                        Kontaktdaten
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap gap-2 lg:gap-4 text-xs lg:text-sm text-foreground/70 mb-2">
                                    {job.arbeitgeber && (
                                      <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4" />
                                        <span>{searchTerm ? highlightSearchTerm(job.arbeitgeber, searchTerm) : job.arbeitgeber}</span>
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
                                    <div className="inline-block px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-300">
                                      {job.arbeitszeit}
                                    </div>
                                  )}
                                </div>

                                <Button
                                  onClick={() => handleViewJobDetails(job)}
                                  className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                  size="sm"
                                >
                                  <ChevronRight className="w-4 h-4 mr-1" />
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
                            size="sm"
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
                                  size="sm"
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
                            size="sm"
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
        </div>
        </div>
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
              className="fixed top-0 right-0 h-full w-full md:w-[700px] lg:w-[900px] xl:w-[1000px] bg-slate-900 shadow-2xl z-[9999] overflow-y-auto"
            >
              <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl lg:text-2xl font-bold gradient-text">Stellendetails</h2>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-6 h-6 text-foreground/70 hover:text-red-400" />
                  </button>
                </div>
              </div>

              <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
                {/* Loading Indicator */}
                {loadingDetails && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    <span className="ml-2 text-sm text-foreground/70">Lade vollständige Details...</span>
                  </div>
                )}

                {/* Job Title */}
                <div>
                  <h3 className="text-xl lg:text-3xl font-bold text-foreground mb-2">
                    {selectedJob.titel || 'Stellenangebot'}
                  </h3>
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

                {/* Stellenbeschreibung */}
                {jobDetails?.stellenbeschreibung && (
                  <div className="glass rounded-lg p-5 border border-purple-500/20">
                    <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">
                      Stellenbeschreibung
                    </h4>
                    <div
                      className="text-foreground/90 text-sm whitespace-pre-wrap"
                      style={{
                        columnCount: jobDetails.stellenbeschreibung.length > 800 ? 2 : 1,
                        columnGap: '2rem',
                        columnRule: '1px solid rgba(139, 92, 246, 0.2)'
                      }}
                    >
                      {highlightContactInfo(jobDetails.stellenbeschreibung, searchTerm)}
                    </div>
                  </div>
                )}

                {/* Wenn keine Kontaktdaten im Text → Button zur Arbeitsagentur */}
                {jobDetails?.stellenbeschreibung && !hasContactInfo(jobDetails.stellenbeschreibung) && (
                  <div className="glass rounded-lg p-5 border border-green-500/20">
                    <p className="text-sm text-foreground/60 mb-4">
                      Keine Kontaktdaten in der Stellenbeschreibung gefunden.
                    </p>
                    <Button
                      onClick={() => {
                        const width = 700;
                        const height = 800;
                        const left = window.screenX + window.outerWidth - width - 50;
                        const top = window.screenY + 50;
                        window.open(
                          `https://www.arbeitsagentur.de/jobsuche/jobdetail/${selectedJob.refnr}`,
                          '_blank',
                          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
                        );
                      }}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Auf Arbeitsagentur ansehen
                    </Button>
                  </div>
                )}

                {/* Weitere Infos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedJob.arbeitszeit && (
                    <div className="glass rounded-lg p-4 border border-purple-500/20">
                      <h5 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
                        Arbeitszeit
                      </h5>
                      <p className="text-foreground/80 text-sm">{selectedJob.arbeitszeit}</p>
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

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </main>
  );
}
