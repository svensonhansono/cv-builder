"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Building2, Calendar, Search, Loader2, X, ChevronRight, Check, ExternalLink } from "lucide-react";
import { jobCategories, JobCategory } from "@/app/jobs/categories";

interface Job {
  refnr: string;
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
  beruf?: string;
}

interface JobDetails extends Job {
  stellenbeschreibung?: string;
  fertigkeiten?: string[];
  verguetung?: string;
  beruf?: string;
}

interface JobsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JobsPanel({ isOpen, onClose }: JobsPanelProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [clickedCategory, setClickedCategory] = useState<JobCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState("25");
  const [publishedSince, setPublishedSince] = useState("3");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobDetails | null>(null);
  
  // Auto-search on panel open
  useEffect(() => {
    if (isOpen && !searchPerformed) {
      handleSearch(1);
    }
  }, [isOpen]);

  const highlightSearchTerm = (text: string, term: string): React.ReactNode => {
    if (!text || !term) return text;
    const terms = term.split(/[\s,;]+/).filter(t => t.length > 1);
    if (terms.length === 0) return text;
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

  const highlightContactInfo = (text: string, searchTermToHighlight?: string) => {
    if (!text) return text;
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const urlPattern = /((?:www\.|https?:\/\/)[^\s]+)/g;
    const phonePattern = /(\d{2,5}[\s\/.-]?\d{3,}[\s\/.-]?\d{3,})/g;
    let searchTerms: string[] = [];
    if (searchTermToHighlight) {
      searchTerms = searchTermToHighlight.split(/[\s,;]+/).filter(t => t.length > 1);
    }
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
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

    if (searchTerms.length > 0) {
      const searchPattern = new RegExp(`(${searchTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
      let searchMatch;
      while ((searchMatch = searchPattern.exec(text)) !== null) {
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

    matches.sort((a, b) => a.index - b.index);
    const filteredMatches: typeof matches = [];
    let lastEnd = 0;
    for (const match of matches) {
      if (match.index >= lastEnd) {
        filteredMatches.push(match);
        lastEnd = match.index + match.length;
      }
    }

    filteredMatches.forEach((match, i) => {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      if (match.type === 'search') {
        parts.push(
          <span key={`highlight-${i}`} className="bg-yellow-500/30 text-yellow-200 px-1 rounded font-semibold">
            {match.text}
          </span>
        );
      } else {
        parts.push(
          <span key={`highlight-${i}`} className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-semibold border border-purple-500/40">
            {match.text}
          </span>
        );
      }
      lastIndex = match.index + match.length;
    });

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

    try {
      const detailsResponse = await fetch(
        `https://us-central1-lebenslauf-24.cloudfunctions.net/getJobDetails?refNr=${job.refnr}`
      );
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        console.log('API Response jobDetails:', detailsData.jobDetails);
        if (detailsData.success && detailsData.jobDetails) {
          const stellenbeschreibung = detailsData.jobDetails.stellenbeschreibung || '';
          setJobDetails({
            stellenbeschreibung: stellenbeschreibung,
            fertigkeiten: detailsData.jobDetails.fertigkeiten || [],
            verguetung: detailsData.jobDetails.verguetung,
            beruf: detailsData.jobDetails.beruf,
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

  const handleSearch = async (page = 1, berufsfeld?: string) => {
    setLoading(true);
    setCurrentPage(page);

    try {
      const categoriesToSearch = selectedCategories.length > 0 ? selectedCategories : [];
      const mainSearchTerm = berufsfeld || searchTerm;
      let allJobs: Job[] = [];
      let totalMax = 0;

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
      let isBundesland = false;
      const bundeslandData = location ? bundeslaenderMap[location.toLowerCase().trim()] : null;
      if (bundeslandData) {
        searchLocation = bundeslandData.city;
        isBundesland = true;
      }

      const searchTermToUse = mainSearchTerm || categoriesToSearch.join(' ');
      const searchTerms = searchTermToUse
        ? searchTermToUse.split(/[,;]+/).map((t: string) => t.trim()).filter((t: string) => t.length > 0)
        : [];

      if (searchTerms.length > 1) {
        const searchPromises = searchTerms.map(async (term: string) => {
          const params = new URLSearchParams({ page: page.toString(), size: '50' });
          params.append('was', term);
          if (searchLocation) params.append('wo', searchLocation);
          if (isBundesland) params.append('umkreis', '200');
          else if (radius) params.append('umkreis', radius);
          if (publishedSince) params.append('veroeffentlichtseit', publishedSince);

          try {
            const response = await fetch(`https://us-central1-lebenslauf-24.cloudfunctions.net/searchJobs?${params.toString()}`);
            if (response.ok) {
              const data = await response.json();
              if (data.success) return { jobs: data.stellenangebote || [], max: data.maxErgebnisse || 0 };
            }
          } catch (err) { }
          return { jobs: [], max: 0 };
        });

        const results = await Promise.all(searchPromises);
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
                beruf: job.beruf,
              });
            }
          });
          totalMax += result.max;
        });
      } else {
        const params = new URLSearchParams({ page: page.toString(), size: '50' });
        if (searchTermToUse) params.append('was', searchTermToUse);
        if (searchLocation) params.append('wo', searchLocation);
        if (isBundesland) params.append('umkreis', '200');
        else if (radius) params.append('umkreis', radius);
        if (publishedSince) params.append('veroeffentlichtseit', publishedSince);

        const response = await fetch(`https://us-central1-lebenslauf-24.cloudfunctions.net/searchJobs?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            allJobs = (data.stellenangebote || []).map((job: any) => ({
              refnr: job.refnr,
              titel: job.titel || 'Stellenangebot',
              arbeitgeber: job.arbeitgeber || 'Unbekannt',
              arbeitsort: job.arbeitsort || {},
              aktuelleVeroeffentlichungsdatum: job.aktuelleVeroeffentlichungsdatum || new Date().toISOString(),
              arbeitszeit: job.arbeitszeit,
              befristung: job.befristung,
              externeUrl: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.refnr}`,
              beruf: job.beruf,
            }));
            totalMax = data.maxErgebnisse || allJobs.length;
          }
        }
      }

      const dateSortedJobs = [...allJobs].sort((a, b) => {
        const dateA = new Date(a.aktuelleVeroeffentlichungsdatum).getTime();
        const dateB = new Date(b.aktuelleVeroeffentlichungsdatum).getTime();
        return dateB - dateA;
      });

      setJobs(dateSortedJobs);
      setTotalResults(totalMax || allJobs.length);
      setSearchPerformed(true);
      setLoading(false);
    } catch (error) {
      setJobs([]);
      setTotalResults(0);
      setLoading(false);
    }
  };

  const handleCategoryClick = (category: JobCategory) => {
    if (clickedCategory?.id === category.id) {
      setClickedCategory(null);
    } else {
      setClickedCategory(category);
    }
  };

  const handleSubcategoryClick = (subcategory: string) => {
    if (selectedCategories.includes(subcategory)) {
      setSelectedCategories(selectedCategories.filter(c => c !== subcategory));
    } else {
      setSelectedCategories([...selectedCategories, subcategory]);
    }
    setClickedCategory(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch(1);
  };

  const totalPages = Math.ceil(totalResults / 50);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-20 bg-slate-950 overflow-hidden">
      {/* Close Button - Top Right */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-30 p-2 rounded-lg bg-slate-800/80 border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 transition-all group"
        title="Schließen"
      >
        <X className="w-5 h-5 text-foreground/60 group-hover:text-red-400 transition-colors" />
      </button>

      {/* Main Content - Two Column Layout */}
      <div className="w-full h-full px-2 lg:px-4 py-3 lg:py-6 overflow-y-auto lg:overflow-visible">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full">
          {/* Left Column - Search Form & Categories */}
          <div className="w-full lg:w-[420px] flex-shrink-0 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto">
            {/* Search Form */}
            <div className="glass rounded-xl p-5 border border-purple-500/20 mb-4">
              <div className="space-y-4">
                {/* Kategorien ODER Unterkategorien */}
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
                              onClick={() => handleCategoryClick(category)}
                              className={`glass rounded-lg px-2 py-3 border transition-all hover:shadow-lg flex flex-col items-center gap-1.5 text-center group ${
                                hasSelectedSubcategory
                                  ? 'border-purple-500/50 shadow-purple-500/20 bg-purple-500/10'
                                  : 'border-white/10 hover:border-purple-500/30 hover:shadow-purple-500/10'
                              }`}
                            >
                              <div className="text-2xl group-hover:scale-110 transition-transform" style={{ filter: 'drop-shadow(0 0 1px rgba(255, 255, 255, 0.8))' }}>
                                {category.icon}
                              </div>
                              <span className={`text-[9px] font-medium transition-colors leading-tight ${
                                hasSelectedSubcategory ? 'text-purple-400' : 'text-foreground/70 group-hover:text-purple-400'
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
                          <button onClick={() => setClickedCategory(null)} className="text-foreground/50 hover:text-red-400 transition-colors">
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
                                  ? "bg-purple-500/20 border border-purple-500/40 text-purple-300"
                                  : "hover:bg-slate-700/50 text-foreground/80 hover:text-purple-400 border border-transparent"
                              }`}
                            >
                              <span className="flex-1 truncate">{subcategory}</span>
                              {selectedCategories.includes(subcategory) && <Check className="w-2.5 h-2.5 text-purple-400 flex-shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Search Fields */}
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-2">Beruf, Stichwort oder Firma</label>
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

                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-2">Ort, PLZ oder Bundesland</label>
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

                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-2">Umkreis</label>
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

                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-2">Veröffentlicht seit</label>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {[
                      { value: "", label: "Alle" },
                      { value: "3", label: "3 Tage" },
                      { value: "7", label: "7 Tage" },
                      { value: "14", label: "14 Tage" },
                      { value: "28", label: "28 Tage" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setPublishedSince(option.value)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          publishedSince === option.value
                            ? "bg-purple-500/20 border border-purple-500/50 text-purple-300"
                            : "bg-slate-900/50 border border-white/10 text-foreground/70 hover:border-purple-500/30 hover:text-purple-400"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                    <button
                      onClick={() => handleSearch(1)}
                      disabled={loading}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/20 flex-1 min-w-[100px]"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      Suchen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Search Results */}
          <div className="flex-1 flex flex-col lg:max-h-[calc(100vh-100px)]">
            {jobs.length > 0 && (
              <div className="pb-3 pt-1 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-foreground/60">
                    {totalResults.toLocaleString('de-DE')} Stellenangebote gefunden
                    {searchTerm && ` für "${searchTerm}"`}
                    {location && ` in ${location}`}
                  </p>
                  <p className="text-sm text-foreground/50 mr-12">Seite {currentPage} von {totalPages}</p>
                </div>

                {selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    {selectedCategories.map(category => (
                      <motion.div
                        key={category}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300 flex items-center gap-1"
                      >
                        <span className="truncate max-w-[150px]">{category}</span>
                        <button onClick={() => setSelectedCategories(selectedCategories.filter(c => c !== category))} className="hover:text-red-400 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                    <button onClick={() => setSelectedCategories([])} className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-colors">
                      Alle entfernen
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Scrollable Job List */}
            <div className="flex-1 overflow-y-auto pr-2">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                  <p className="text-foreground/60">Suche nach Stellenangeboten...</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="w-16 h-16 text-foreground/20 mx-auto mb-4" />
                  <p className="text-foreground/60 text-lg">Keine Stellenangebote gefunden</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 mb-6">
                    {jobs.map((job, index) => {
                      let formattedDate = 'N/A';
                      try {
                        if (job.aktuelleVeroeffentlichungsdatum) {
                          formattedDate = new Date(job.aktuelleVeroeffentlichungsdatum).toLocaleDateString('de-DE', {
                            day: '2-digit', month: '2-digit', year: 'numeric'
                          });
                        }
                      } catch (e) { }

                      return (
                        <motion.div
                          key={job.refnr || `job-${index}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.03 }}
                          className="glass rounded-xl p-3 lg:p-5 border border-white/10 hover:border-purple-500/30 transition-all hover:shadow-lg hover:shadow-purple-500/10"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                            <div className="flex-1">
                              <div className="mb-2">
                                <h3 className="text-base lg:text-lg font-semibold text-foreground inline">
                                  {searchTerm ? highlightSearchTerm(job.titel || 'Stellenangebot', searchTerm) : (job.titel || 'Stellenangebot')}
                                </h3>
                                {job.beruf && (
                                  <span className="text-sm text-purple-400 ml-2">– {job.beruf}</span>
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
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>{formattedDate}</span>
                                </div>
                              </div>
                              {job.arbeitszeit && (
                                <div className="inline-block px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                                  {job.arbeitszeit}
                                </div>
                              )}
                            </div>
                            <Button
                              onClick={() => handleViewJobDetails(job)}
                              className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
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

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pb-4">
                      <Button onClick={() => handleSearch(currentPage - 1)} disabled={currentPage === 1 || loading} variant="outline" className="glass border-white/10" size="sm">
                        ← Zurück
                      </Button>
                      <div className="flex items-center gap-2">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) pageNum = i + 1;
                          else if (currentPage <= 3) pageNum = i + 1;
                          else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                          else pageNum = currentPage - 2 + i;
                          return (
                            <Button
                              key={pageNum}
                              onClick={() => handleSearch(pageNum)}
                              disabled={loading}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              className={currentPage === pageNum ? "bg-purple-600" : "glass border-white/10"}
                              size="sm"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button onClick={() => handleSearch(currentPage + 1)} disabled={currentPage === totalPages || loading} variant="outline" className="glass border-white/10" size="sm">
                        Weiter →
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Job Details Modal */}
      <AnimatePresence>
        {selectedJob && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedJob(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            />
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
                  <button onClick={() => setSelectedJob(null)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <X className="w-6 h-6 text-foreground/70 hover:text-red-400" />
                  </button>
                </div>
              </div>

              <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
                {loadingDetails && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    <span className="ml-2 text-sm text-foreground/70">Lade vollständige Details...</span>
                  </div>
                )}

                <div>
                  <h3 className="text-xl lg:text-3xl font-bold text-foreground mb-2">{selectedJob.titel || 'Stellenangebot'}</h3>
                </div>

                <div className="glass rounded-xl p-4 border border-purple-500/20 space-y-3">
                  {selectedJob.arbeitgeber && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10"><Building2 className="w-5 h-5 text-purple-400" /></div>
                      <div>
                        <p className="text-xs text-foreground/50">Arbeitgeber</p>
                        <p className="text-lg font-semibold text-foreground">{selectedJob.arbeitgeber}</p>
                      </div>
                    </div>
                  )}
                  {(selectedJob.beruf || jobDetails?.beruf) && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10"><Briefcase className="w-5 h-5 text-purple-400" /></div>
                      <div>
                        <p className="text-xs text-foreground/50">Berufsbezeichnung</p>
                        <p className="text-lg font-semibold text-foreground">{selectedJob.beruf || jobDetails?.beruf}</p>
                      </div>
                    </div>
                  )}
                  {selectedJob.arbeitsort?.ort && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10"><MapPin className="w-5 h-5 text-blue-400" /></div>
                      <div>
                        <p className="text-xs text-foreground/50">Arbeitsort</p>
                        <p className="text-lg font-semibold text-foreground">
                          {selectedJob.arbeitsort.plz && `${selectedJob.arbeitsort.plz} `}
                          {selectedJob.arbeitsort.ort}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10"><Calendar className="w-5 h-5 text-purple-400" /></div>
                    <div>
                      <p className="text-xs text-foreground/50">Veröffentlicht</p>
                      <p className="text-lg font-semibold text-foreground">
                        {(() => {
                          try {
                            if (selectedJob.aktuelleVeroeffentlichungsdatum) {
                              return new Date(selectedJob.aktuelleVeroeffentlichungsdatum).toLocaleDateString('de-DE', {
                                day: '2-digit', month: '2-digit', year: 'numeric'
                              });
                            }
                            return 'N/A';
                          } catch (e) { return 'N/A'; }
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {jobDetails?.stellenbeschreibung && (
                  <div className="glass rounded-lg p-5 border border-purple-500/20">
                    <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">Stellenbeschreibung</h4>
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

                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedJob.arbeitszeit && (
                    <div className="glass rounded-lg p-4 border border-purple-500/20">
                      <h5 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">Arbeitszeit</h5>
                      <p className="text-foreground/80 text-sm">{selectedJob.arbeitszeit}</p>
                    </div>
                  )}
                  {selectedJob.befristung && (
                    <div className="glass rounded-lg p-4 border border-purple-500/20">
                      <h5 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">Befristung</h5>
                      <p className="text-foreground/80 text-sm">{selectedJob.befristung}</p>
                    </div>
                  )}
                </div>

                {/* Link zur Arbeitsagentur */}
                <div className="pt-4">
                  <Button
                    onClick={() => {
                      const width = 700, height = 800;
                      const left = window.screenX + window.outerWidth - width - 50;
                      const top = window.screenY + 50;
                      window.open(
                        `https://www.arbeitsagentur.de/jobsuche/jobdetail/${selectedJob.refnr}`,
                        '_blank',
                        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
                      );
                    }}
                    className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Auf Arbeitsagentur ansehen
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
