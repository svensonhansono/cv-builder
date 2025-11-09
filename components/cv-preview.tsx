"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CVData } from "@/types/cv";
import { Download, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CVPreviewProps {
  data: CVData;
  onChange: (data: CVData) => void;
}

export function CVPreview({ data, onChange }: CVPreviewProps) {
  const cvContainerRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // Adjustable margins in cm
  const [margins, setMargins] = useState({
    top: 1.5,
    bottom: 1.5,
    left: 2.5,
    right: 2.0
  });

  // Calculate page breaks based on current margins
  const contentHeight = 29.7 - margins.top - margins.bottom;

  // Calculate actual number of pages based on content
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    // Wait a bit for content to render
    const timer = setTimeout(() => {
      if (contentContainerRef.current && cvContainerRef.current) {
        const contentHeightPx = contentContainerRef.current.scrollHeight;
        const cvContainerHeightPx = cvContainerRef.current.offsetHeight;

        // Calculate how much one page content area is in pixels
        const pageContentHeightPx = (contentHeight / 29.7) * cvContainerHeightPx;

        // Calculate how many pages we need
        const pagesNeeded = Math.ceil(contentHeightPx / pageContentHeightPx);

        console.log('Content height px:', contentHeightPx);
        console.log('Page height px:', pageContentHeightPx);
        console.log('Pages needed:', pagesNeeded);

        setTotalPages(Math.max(1, Math.min(pagesNeeded, 4)));
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [data, margins, contentHeight]);

  const formatDate = (date: string) => {
    if (!date) return "";
    const [year, month, day] = date.split("-");
    return `${day}.${month}.${year}`;
  };

  // Handle dragging of margin lines
  const handleMarginDrag = (e: React.MouseEvent, marginType: 'top' | 'bottom' | 'left' | 'right') => {
    e.preventDefault();
    const container = e.currentTarget.parentElement;
    if (!container) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect = container.getBoundingClientRect();

      if (marginType === 'top') {
        const offsetY = moveEvent.clientY - rect.top;
        const cmValue = (offsetY / rect.height) * 29.7;
        setMargins(prev => ({ ...prev, top: Math.max(0.5, Math.min(10, cmValue)) }));
      } else if (marginType === 'bottom') {
        const offsetY = rect.bottom - moveEvent.clientY;
        const cmValue = (offsetY / rect.height) * 29.7;
        setMargins(prev => ({ ...prev, bottom: Math.max(0.5, Math.min(10, cmValue)) }));
      } else if (marginType === 'left') {
        const offsetX = moveEvent.clientX - rect.left;
        const cmValue = (offsetX / rect.width) * 21;
        setMargins(prev => ({ ...prev, left: Math.max(0.5, Math.min(8, cmValue)) }));
      } else if (marginType === 'right') {
        const offsetX = rect.right - moveEvent.clientX;
        const cmValue = (offsetX / rect.width) * 21;
        setMargins(prev => ({ ...prev, right: Math.max(0.5, Math.min(8, cmValue)) }));
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };



  const handleDownload = async () => {
    if (isGenerating) return;

    setIsGenerating(true);

    // Store original state
    const originalPage = currentPage;

    // Hide margin guides during PDF export
    const marginGuides = document.querySelectorAll('[data-margin-guides]');
    marginGuides.forEach(guide => {
      (guide as HTMLElement).style.visibility = 'hidden';
    });

    // Remove glass effect temporarily for consistent background color
    const hadGlass = cvContainerRef.current?.classList.contains('glass');
    if (cvContainerRef.current && hadGlass) {
      cvContainerRef.current.classList.remove('glass');
    }

    // Fix gradient-text for PDF export (html2canvas doesn't support background-clip: text)
    const gradientTexts = cvContainerRef.current?.querySelectorAll('.gradient-text') || [];
    const originalStyles: string[] = [];
    gradientTexts.forEach((el, index) => {
      const htmlEl = el as HTMLElement;
      originalStyles[index] = htmlEl.style.cssText;
      htmlEl.style.background = 'none';
      htmlEl.style.backgroundClip = 'unset';
      htmlEl.style.webkitBackgroundClip = 'unset';
      htmlEl.style.webkitTextFillColor = 'unset';
      htmlEl.style.color = '#c4b5fd'; // Light purple color
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = 210;
      const pdfHeight = 297;

      // Check if CV container exists
      if (!cvContainerRef.current) {
        throw new Error("CV container not found");
      }

      // Use the calculated totalPages from state
      const pagesToCapture = totalPages;

      for (let pageNum = 0; pageNum < pagesToCapture; pageNum++) {
        // Set the current page (this will show only this page via page masks)
        setCurrentPage(pageNum);

        // Wait for page to render
        await new Promise(resolve => setTimeout(resolve, 300));

        // Capture the CV container as it appears now
        const canvas = await html2canvas(cvContainerRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#0f172a",
          width: cvContainerRef.current.offsetWidth,
          height: cvContainerRef.current.offsetHeight,
        });

        if (pageNum > 0) {
          pdf.addPage();
        }

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      }

      const fileName = data.personalInfo.firstName && data.personalInfo.lastName
        ? `${data.personalInfo.firstName}_${data.personalInfo.lastName}_CV.pdf`
        : "Lebenslauf.pdf";

      pdf.save(fileName);
    } catch (error) {
      console.error("Fehler beim PDF-Export:", error);
      alert("Fehler beim Erstellen der PDF.");
    } finally {
      // Show margin guides again
      marginGuides.forEach(guide => {
        (guide as HTMLElement).style.visibility = '';
      });

      // Restore glass effect
      if (cvContainerRef.current && hadGlass) {
        cvContainerRef.current.classList.add('glass');
      }

      // Restore gradient-text styles
      gradientTexts.forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.cssText = originalStyles[index];
      });

      // Restore original page
      setCurrentPage(originalPage);
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full mx-auto"
            style={{ maxWidth: '210mm' }}
          >
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              {/* Page Navigation */}
              <div className="flex items-center gap-2 sm:gap-4">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                >
                  ←
                </Button>

                <span className="text-xs sm:text-sm text-foreground/70 whitespace-nowrap">
                  Seite {currentPage + 1} / {totalPages}
                </span>

                <Button
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                >
                  →
                </Button>
              </div>

              {/* Download Button */}
              <Button
                onClick={handleDownload}
                disabled={isGenerating}
                className="gap-2 text-xs sm:text-sm"
              >
                <Download className={`w-3 h-3 sm:w-4 sm:h-4 ${isGenerating ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:inline">
                  {isGenerating ? "PDF wird erstellt..." : "PDF Exportieren"}
                </span>
                <span className="sm:hidden">
                  {isGenerating ? "..." : "PDF"}
                </span>
              </Button>
            </div>

            {/* CV Container */}
            <div
              ref={cvContainerRef}
              className="rounded-lg sm:rounded-xl lg:rounded-2xl glass shadow-2xl shadow-purple-500/20 border border-white/10 relative"
              style={{
                width: '210mm',
                height: '297mm',
                fontFamily: data.fontFamily || 'Arial',
                overflow: 'hidden',
              }}
            >
              {/* Draggable margin guides */}
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }} data-margin-guides>
                {/* Top margin line */}
                <div
                  className="absolute left-0 right-0 cursor-ns-resize hover:bg-purple-500/30 transition-colors pointer-events-auto"
                  style={{
                    top: `${margins.top}cm`,
                    height: '4px',
                    borderTop: '2px dashed #a855f7',
                  }}
                  onMouseDown={(e) => handleMarginDrag(e, 'top')}
                >
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-0 bg-purple-500 text-white px-3 py-1 rounded text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none">
                    ↕ Oben: {margins.top.toFixed(1)} cm
                  </div>
                </div>

                {/* Bottom margin line */}
                <div
                  className="absolute left-0 right-0 cursor-ns-resize hover:bg-purple-500/30 transition-colors pointer-events-auto"
                  style={{
                    bottom: `${margins.bottom}cm`,
                    height: '4px',
                    borderBottom: '2px dashed #a855f7',
                  }}
                  onMouseDown={(e) => handleMarginDrag(e, 'bottom')}
                >
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-purple-500 text-white px-3 py-1 rounded text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none">
                    ↕ Unten: {margins.bottom.toFixed(1)} cm
                  </div>
                </div>

                {/* Left margin line */}
                <div
                  className="absolute top-0 bottom-0 cursor-ew-resize hover:bg-purple-500/30 transition-colors pointer-events-auto"
                  style={{
                    left: `${margins.left}cm`,
                    width: '4px',
                    borderLeft: '2px dashed #a855f7',
                  }}
                  onMouseDown={(e) => handleMarginDrag(e, 'left')}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-full bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg) translateY(-50%)' }}>
                    ↔ Links: {margins.left.toFixed(1)} cm
                  </div>
                </div>

                {/* Right margin line */}
                <div
                  className="absolute top-0 bottom-0 cursor-ew-resize hover:bg-purple-500/30 transition-colors pointer-events-auto"
                  style={{
                    right: `${margins.right}cm`,
                    width: '4px',
                    borderRight: '2px dashed #a855f7',
                  }}
                  onMouseDown={(e) => handleMarginDrag(e, 'right')}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 translate-x-1/2 bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg) translateY(-50%)' }}>
                    ↔ Rechts: {margins.right.toFixed(1)} cm
                  </div>
                </div>
              </div>

              {/* Content area */}
              <div
                className="absolute"
                style={{
                  zIndex: 1,
                  top: `${margins.top}cm`,
                  left: `${margins.left}cm`,
                  right: `${margins.right}cm`,
                  overflow: 'visible',
                }}
              >
                {/* Content wrapper with page offset */}
                <div
                  ref={contentContainerRef}
                  style={{
                    width: '100%',
                    marginTop: currentPage === 0 ? '0mm' : `-${currentPage * contentHeight * 10}mm`,
                    pointerEvents: 'auto',
                    zIndex: 5,
                    position: 'relative',
                  }}
                >
                  {/* Page masks - hide content on other pages */}
                  {[0, 1, 2, 3].map((pageNum) => {
                    if (pageNum === currentPage) return null;
                    return (
                      <div
                        key={pageNum}
                        className="absolute pointer-events-none"
                        data-page-mask
                        style={{
                          top: `${pageNum * contentHeight}cm`,
                          left: `-${margins.left}cm`,
                          right: `-${margins.right}cm`,
                          height: `${contentHeight}cm`,
                          background: '#0f172a',
                          zIndex: 50,
                        }}
                      />
                    );
                  })}
                  {/* Header */}
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-white/10"
                  >
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                      {/* Profile Photo */}
                      {data.personalInfo.photoUrl && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                          className="relative"
                        >
                          <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-purple-500/30 shadow-xl shadow-purple-500/30">
                            <img
                              src={data.personalInfo.photoUrl}
                              alt={`${data.personalInfo.firstName} ${data.personalInfo.lastName}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </motion.div>
                      )}

                      {/* Text Content */}
                      <div className="flex-1">
                        <h1
                          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 gradient-text outline-none"
                          contentEditable={true}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const fullName = e.currentTarget.textContent?.trim() || "";
                            const parts = fullName.split(" ");
                            onChange({
                              ...data,
                              personalInfo: {
                                ...data.personalInfo,
                                firstName: parts[0] || "",
                                lastName: parts.slice(1).join(" ") || ""
                              }
                            });
                          }}
                        >
                          {data.personalInfo.firstName} {data.personalInfo.lastName}
                        </h1>
                        <p
                          className="text-base sm:text-lg md:text-xl mb-3 sm:mb-4 text-purple-300 outline-none"
                          contentEditable={true}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            onChange({
                              ...data,
                              personalInfo: { ...data.personalInfo, title: e.currentTarget.textContent || "" }
                            });
                          }}
                        >
                          {data.personalInfo.title}
                        </p>

                        <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-foreground/70">
                          {data.personalInfo.email && (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-purple-400" />
                              <span className="break-all">{data.personalInfo.email}</span>
                            </div>
                          )}
                          {data.personalInfo.phone && (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-purple-400" />
                              <span>{data.personalInfo.phone}</span>
                            </div>
                          )}
                          {data.personalInfo.location && (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-purple-400" />
                              <span>{data.personalInfo.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Experience */}
                  {data.experiences.length > 0 && (
                    <motion.section
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      className="mb-6 sm:mb-8"
                    >
                      {/* Spacer */}
                      <div
                        className="min-h-[1.5em] outline-none text-foreground/20"
                        contentEditable={true}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          onChange({
                            ...data,
                            spacerBeforeExperience: e.currentTarget.textContent || ""
                          });
                        }}
                        style={{ whiteSpace: 'pre-wrap', cursor: 'text', minHeight: '1.5em', display: 'block' }}
                      >
                        {data.spacerBeforeExperience || "\u200B"}
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <h2
                          className="font-bold gradient-text outline-none"
                          style={{ fontSize: '14pt', whiteSpace: 'pre-wrap' }}
                          contentEditable={true}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const newTitle = e.currentTarget.textContent || "Berufserfahrung";
                            onChange({
                              ...data,
                              sectionTitles: { ...data.sectionTitles, experience: newTitle }
                            });
                          }}
                        >
                          {data.sectionTitles?.experience || "Berufserfahrung"}
                        </h2>
                      </div>

                      <div className="space-y-4 sm:space-y-6">
                        {data.experiences.map((exp, index) => (
                          <motion.div
                            key={exp.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                            className="relative pl-4 sm:pl-6 border-l-2 border-purple-500/30 hover:border-purple-500/60 transition-colors"
                          >
                            <div className="absolute -left-[7px] sm:-left-[9px] top-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50" />

                            <div className="mb-1">
                              <h3
                                className="text-base sm:text-lg font-semibold text-foreground outline-none"
                                contentEditable={true}
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const newExps = [...data.experiences];
                                  newExps[index] = { ...newExps[index], position: e.currentTarget.textContent || "" };
                                  onChange({ ...data, experiences: newExps });
                                }}
                                style={{ whiteSpace: 'pre-wrap' }}
                              >
                                {exp.position || "Position"}
                              </h3>
                              <p
                                className="text-sm sm:text-base font-medium text-purple-300 outline-none"
                                contentEditable={true}
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const newExps = [...data.experiences];
                                  newExps[index] = { ...newExps[index], company: e.currentTarget.textContent || "" };
                                  onChange({ ...data, experiences: newExps });
                                }}
                                style={{ whiteSpace: 'pre-wrap' }}
                              >
                                {exp.company || "Unternehmen"}
                              </p>
                            </div>

                            <p className="text-xs sm:text-sm mb-2 text-foreground/60">
                              {formatDate(exp.startDate)} - {exp.current ? "Heute" : formatDate(exp.endDate)}
                            </p>

                            {exp.bulletPoints && exp.bulletPoints.length > 0 && exp.bulletPoints.some(bp => bp.trim()) && (
                              <div className="space-y-1">
                                {exp.bulletPoints.filter(bp => bp.trim()).map((bullet, idx) => (
                                  <div key={idx} className="flex gap-2 leading-relaxed text-foreground/80" style={{ fontSize: '11pt' }}>
                                    <span className="text-purple-400 flex-shrink-0">•</span>
                                    <span style={{ whiteSpace: 'pre-wrap' }}>{bullet}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.section>
                  )}

                  {/* Education */}
                  {data.education.length > 0 && (
                    <motion.section
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.5 }}
                      className="mb-6 sm:mb-8"
                    >
                      {/* Spacer */}
                      <div
                        className="min-h-[1.5em] outline-none text-foreground/20"
                        contentEditable={true}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          onChange({
                            ...data,
                            spacerBeforeEducation: e.currentTarget.textContent || ""
                          });
                        }}
                        style={{ whiteSpace: 'pre-wrap', cursor: 'text', minHeight: '1.5em', display: 'block' }}
                      >
                        {data.spacerBeforeEducation || "\u200B"}
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <h2
                          className="font-bold gradient-text outline-none"
                          style={{ fontSize: '14pt', whiteSpace: 'pre-wrap' }}
                          contentEditable={true}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const newTitle = e.currentTarget.textContent || "Ausbildung";
                            onChange({
                              ...data,
                              sectionTitles: { ...data.sectionTitles, education: newTitle }
                            });
                          }}
                        >
                          {data.sectionTitles?.education || "Ausbildung"}
                        </h2>
                      </div>

                      <div className="space-y-4 sm:space-y-6">
                        {data.education.map((edu, index) => (
                          <motion.div
                            key={edu.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                            className="relative pl-4 sm:pl-6 border-l-2 border-purple-500/30 hover:border-purple-500/60 transition-colors"
                          >
                            <div className="absolute -left-[7px] sm:-left-[9px] top-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50" />

                            <div className="mb-1">
                              <h3
                                className="text-base sm:text-lg font-semibold text-foreground outline-none"
                                contentEditable={true}
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const text = e.currentTarget.textContent || "";
                                  const newEducation = [...data.education];
                                  newEducation[index] = { ...newEducation[index], degree: text };
                                  onChange({ ...data, education: newEducation });
                                }}
                                style={{ whiteSpace: 'pre-wrap' }}
                              >
                                {edu.degree || "Abschluss"} {edu.field && `in ${edu.field}`}
                              </h3>
                              <p
                                className="text-sm sm:text-base font-medium text-purple-300 outline-none"
                                contentEditable={true}
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const newEducation = [...data.education];
                                  newEducation[index] = { ...newEducation[index], institution: e.currentTarget.textContent || "" };
                                  onChange({ ...data, education: newEducation });
                                }}
                                style={{ whiteSpace: 'pre-wrap' }}
                              >
                                {edu.institution || "Institution"}
                              </p>
                            </div>

                            <p className="text-xs sm:text-sm text-foreground/60">
                              {formatDate(edu.startDate)} - {edu.current ? "Heute" : formatDate(edu.endDate)}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.section>
                  )}

                  {/* Skills */}
                  {data.skills.length > 0 && (
                    <motion.section
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                      className="mb-6 sm:mb-8"
                    >
                      {/* Spacer */}
                      <div
                        className="min-h-[1.5em] outline-none text-foreground/20"
                        contentEditable={true}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          onChange({
                            ...data,
                            spacerBeforeSkills: e.currentTarget.textContent || ""
                          });
                        }}
                        style={{ whiteSpace: 'pre-wrap', cursor: 'text', minHeight: '1.5em', display: 'block' }}
                      >
                        {data.spacerBeforeSkills || "\u200B"}
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <h2
                          className="font-bold gradient-text outline-none"
                          style={{ fontSize: '14pt', whiteSpace: 'pre-wrap' }}
                          contentEditable={true}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const newTitle = e.currentTarget.textContent || "Skills";
                            onChange({
                              ...data,
                              sectionTitles: { ...data.sectionTitles, skills: newTitle }
                            });
                          }}
                        >
                          {data.sectionTitles?.skills || "Skills"}
                        </h2>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {data.skills.map((skill, index) => (
                          <motion.div
                            key={skill.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
                            className="space-y-1.5 sm:space-y-2"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm font-medium text-foreground">
                                {skill.name || "Skill"}
                              </span>
                              <span className="text-xs text-foreground/60">
                                {skill.level}/5
                              </span>
                            </div>

                            <div className="relative h-1.5 sm:h-2 bg-white/5 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(skill.level / 5) * 100}%` }}
                                transition={{ duration: 1, delay: 0.8 + index * 0.05 }}
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full shadow-lg shadow-purple-500/50"
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.section>
                  )}

                  {/* Signature */}
                  {data.signatureLocation && data.signatureDate && (
                    <motion.section
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.7 }}
                      className="mt-12 sm:mt-16"
                    >
                      <div className="flex flex-col items-start gap-8">
                        <p className="text-sm text-foreground/70">
                          {data.signatureLocation}, {formatDate(data.signatureDate)}
                        </p>

                        <div className="flex flex-col gap-2">
                          {data.signatureName && (
                            <p className="text-2xl italic text-foreground" style={{ fontFamily: `'${data.signatureFont || 'Dancing Script'}', cursive` }}>
                              {data.signatureName}
                            </p>
                          )}
                          <div className="w-48 border-b border-white/30"></div>
                          <p className="text-xs text-foreground/60">
                            (Unterschrift)
                          </p>
                        </div>
                      </div>
                    </motion.section>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
    </div>
  );
}
