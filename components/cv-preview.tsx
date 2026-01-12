"use client";

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion } from "framer-motion";
import { CVData } from "@/types/cv";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CVPreviewProps {
  data: CVData;
  onChange: (data: CVData) => void;
  currentPage: number;
  setCurrentPage: (page: number | ((p: number) => number)) => void;
  totalPages: number;
  setTotalPages: (pages: number) => void;
  setIsGenerating: (generating: boolean) => void;
}

export interface CVPreviewHandle {
  handleDownload: () => Promise<void>;
}

export const CVPreview = forwardRef<CVPreviewHandle, CVPreviewProps>(({ data, onChange, currentPage, setCurrentPage, totalPages, setTotalPages, setIsGenerating }, ref) => {
  const cvContainerRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);

  // Default margins in cm - use saved values from data or defaults
  const defaultMargins = {
    top: 1.5,
    bottom: 1.5,
    left: 2.5,
    right: 2.0
  };

  // Use margins from data if available, otherwise use defaults
  const margins = data.margins || defaultMargins;

  // Keep refs updated for use in event handlers (to avoid stale closures)
  const dataRef = useRef(data);
  const marginsRef = useRef(margins);
  useEffect(() => {
    dataRef.current = data;
    marginsRef.current = margins;
  }, [data, margins]);

  // Function to update margins and save to data
  const setMargins = (updater: (prev: typeof margins) => typeof margins) => {
    const currentMargins = marginsRef.current;
    const newMargins = updater(currentMargins);
    marginsRef.current = newMargins;
    onChange({
      ...dataRef.current,
      margins: newMargins
    });
  };

  // Calculate page breaks based on current margins
  const contentHeight = 29.7 - margins.top - margins.bottom;

  // Calculate actual number of pages based on content
  useEffect(() => {
    // Wait a bit for content to render
    const timer = setTimeout(() => {
      if (contentContainerRef.current && cvContainerRef.current) {
        // Hide page masks temporarily for accurate measurement
        const pageMasks = contentContainerRef.current.querySelectorAll('[data-page-mask]');
        pageMasks.forEach(mask => {
          (mask as HTMLElement).style.display = 'none';
        });

        // Get actual content height
        const actualContentHeight = contentContainerRef.current.scrollHeight;

        // Restore page masks
        pageMasks.forEach(mask => {
          (mask as HTMLElement).style.display = '';
        });

        const cvContainerHeightPx = cvContainerRef.current.offsetHeight;

        // Calculate how much one page content area is in pixels
        const pageContentHeightPx = (contentHeight / 29.7) * cvContainerHeightPx;

        // Calculate how many pages we need
        const pagesNeeded = Math.ceil(actualContentHeight / pageContentHeightPx);

        console.log('Content height px:', actualContentHeight);
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
    if (isGeneratingLocal) return;

    setIsGeneratingLocal(true);
    setIsGenerating(true);

    // Store original state
    const originalPage = currentPage;

    // Hide margin guides during PDF export (but keep page masks active!)
    const marginGuides = document.querySelectorAll('[data-margin-guides]');
    marginGuides.forEach(guide => {
      (guide as HTMLElement).style.visibility = 'hidden';
    });

    // Remove glass effect temporarily (keep background for proper capture)
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

    // Hide purple timeline borders during PDF export
    const timelineBorders = cvContainerRef.current?.querySelectorAll('.border-l-2') || [];
    const originalBorderStyles: string[] = [];
    timelineBorders.forEach((el, index) => {
      const htmlEl = el as HTMLElement;
      originalBorderStyles[index] = htmlEl.style.borderLeft;
      htmlEl.style.borderLeft = 'none';
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
        await new Promise(resolve => setTimeout(resolve, 500));

        // Capture the CV container
        const canvas = await html2canvas(cvContainerRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: data.colorScheme === 'light' ? '#ffffff' : '#10172b',
          width: cvContainerRef.current.offsetWidth,
          height: cvContainerRef.current.offsetHeight,
        });

        if (pageNum > 0) {
          pdf.addPage();
        }

        // Add as JPEG with compression for small file size
        const imgData = canvas.toDataURL("image/jpeg", 0.8);
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

      // Restore timeline borders
      timelineBorders.forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.borderLeft = originalBorderStyles[index];
      });

      // Restore original page
      setCurrentPage(originalPage);
      setIsGeneratingLocal(false);
      setIsGenerating(false);
    }
  };

  // Expose handleDownload to parent via ref
  useImperativeHandle(ref, () => ({
    handleDownload
  }));

  // Handle wheel events from CV container and forward to scroll container
  const handleCvWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop += e.deltaY;
      scrollContainerRef.current.scrollLeft += e.deltaX;
    }
  };

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto overflow-x-hidden">
      <div className="p-4 sm:p-6 lg:p-8 overflow-x-hidden pb-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full mx-auto"
            style={{ maxWidth: '210mm' }}
          >
            {/* CV Container Wrapper - scales on mobile */}
            <div className="cv-scale-wrapper origin-top">
            <div
              ref={cvContainerRef}
              onWheel={handleCvWheel}
              className="glass shadow-2xl shadow-purple-500/20 border border-white/10 relative"
              style={{
                width: '210mm',
                height: '297mm',
                fontFamily: data.fontFamily || 'Montserrat',
                overflow: 'hidden',
                backgroundColor: data.colorScheme === 'light' ? '#ffffff' : '#10172b',
                color: data.colorScheme === 'light' ? '#000000' : '#ffffff',
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
                  <div className="absolute left-1/2 -translate-x-1/2 -top-6 bg-purple-500 text-white px-3 py-1 rounded text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none">
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
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-6 bg-purple-500 text-white px-3 py-1 rounded text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none">
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
                  <div className="absolute top-1/2 -translate-y-1/2 bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg) translateY(-50%)', right: '4px' }}>
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
                  <div className="absolute top-1/2 -translate-y-1/2 bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg) translateY(-50%)', left: '4px' }}>
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
                          background: data.colorScheme === 'light' ? '#ffffff' : '#10172b',
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
                    className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b"
                    style={{ borderColor: data.colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }}
                  >
                    <div className="flex gap-4 sm:gap-6 items-start">
                      {/* Profile Photo */}
                      {data.personalInfo.photoUrl && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                          className="relative flex-shrink-0"
                        >
                          <div
                            className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 shadow-xl"
                            style={{
                              borderColor: data.colorScheme === 'light' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
                              boxShadow: data.colorScheme === 'light' ? '0 20px 25px -5px rgba(0,0,0,0.1)' : '0 20px 25px -5px rgba(255,255,255,0.1)',
                            }}
                          >
                            <img
                              src={data.personalInfo.photoUrl}
                              alt={`${data.personalInfo.firstName} ${data.personalInfo.lastName}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </motion.div>
                      )}

                      {/* Name, Title and Contact details */}
                      <div className="flex-1">
                        <h1
                          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 outline-none"
                          style={{ color: data.colorScheme === 'light' ? '#000000' : '#ffffff' }}
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
                          className="text-base sm:text-lg md:text-xl mb-3 sm:mb-4 outline-none"
                          style={{ color: data.colorScheme === 'light' ? '#000000' : '#ffffff' }}
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

                        {/* Contact details */}
                        <div className="flex flex-col gap-1 text-xs sm:text-sm" style={{ color: data.colorScheme === 'light' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }}>
                          {/* Row 1: Email + Phone */}
                          {(data.personalInfo.email || data.personalInfo.phone) && (
                            <div className="flex items-center gap-4">
                              {data.personalInfo.email && (
                                <div className="flex items-center gap-2">
                                  <i className="fa-solid fa-envelope" style={{ color: data.colorScheme === 'light' ? '#000000' : '#ffffff' }}></i>
                                  <span>{data.personalInfo.email}</span>
                                </div>
                              )}
                              {data.personalInfo.phone && (
                                <div className="flex items-center gap-2">
                                  <i className="fa-solid fa-phone" style={{ color: data.colorScheme === 'light' ? '#000000' : '#ffffff' }}></i>
                                  <span>{data.personalInfo.phone}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {/* Row 2: Location (includes city, PLZ, street) */}
                          {data.personalInfo.location && (
                            <div className="flex items-center gap-2">
                              <i className="fa-solid fa-location-dot" style={{ color: data.colorScheme === 'light' ? '#000000' : '#ffffff' }}></i>
                              <span
                                className="outline-none"
                                contentEditable={true}
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  onChange({
                                    ...data,
                                    personalInfo: { ...data.personalInfo, location: e.currentTarget.textContent || "" }
                                  });
                                }}
                              >{data.personalInfo.location}</span>
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
                      {data.spacerBeforeExperience && (
                        <div
                          className="outline-none" style={{ color: data.colorScheme === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }}
                          contentEditable={true}
                          suppressContentEditableWarning
                          onInput={(e) => {
                            onChange({
                              ...data,
                              spacerBeforeExperience: e.currentTarget.textContent || ""
                            });
                          }}
                          style={{ whiteSpace: 'pre-wrap', cursor: 'text', display: 'block', fontSize: '11pt', lineHeight: '1.5' }}
                        >
                          {data.spacerBeforeExperience}
                        </div>
                      )}

                      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <h2
                          className="font-bold outline-none" style={{ color: data.colorScheme === 'light' ? '#000000' : '#ffffff' }}
                          style={{ fontSize: '14pt', whiteSpace: 'pre-wrap' }}
                          contentEditable={true}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const newTitle = e.currentTarget.textContent || "Berufserfahrung";
                            onChange({
                              ...data,
                              sectionTitles: {
                                experience: newTitle,
                                education: data.sectionTitles?.education || "Ausbildung",
                                skills: data.sectionTitles?.skills || "Skills"
                              }
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
                            className="relative"
                          >

                            <div className="mb-1">
                              <h3
                                className="text-base sm:text-lg font-semibold outline-none" style={{ color: data.colorScheme === 'light' ? '#000000' : '#ffffff' }}
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
                                className="text-sm sm:text-base font-medium outline-none" style={{ color: data.colorScheme === 'light' ? '#000000' : '#ffffff' }}
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

                            <p className="text-xs sm:text-sm mb-2" style={{ color: data.colorScheme === 'light' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }}>
                              {formatDate(exp.startDate)} - {exp.current ? "Heute" : formatDate(exp.endDate)}
                            </p>

                            {exp.bulletPoints && exp.bulletPoints.length > 0 && exp.bulletPoints.some(bp => bp.trim()) && (
                              <div className="space-y-1">
                                {exp.bulletPoints.filter(bp => bp.trim()).map((bullet, idx) => {
                                  const originalIndex = exp.bulletPoints.findIndex((bp, i) => i >= idx && bp === bullet);
                                  return (
                                    <div key={idx} className="flex gap-2 leading-relaxed" style={{ fontSize: '11pt', color: data.colorScheme === 'light' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }}>
                                      <span className="flex-shrink-0" style={{ color: data.colorScheme === 'light' ? '#000000' : '#ffffff' }}>•</span>
                                      <span
                                        contentEditable={true}
                                        suppressContentEditableWarning
                                        className="outline-none flex-1"
                                        style={{ whiteSpace: 'pre-wrap' }}
                                        onBlur={(e) => {
                                          const newExps = [...data.experiences];
                                          const newBulletPoints = [...newExps[index].bulletPoints];
                                          newBulletPoints[originalIndex] = e.currentTarget.textContent || "";
                                          newExps[index] = { ...newExps[index], bulletPoints: newBulletPoints };
                                          onChange({ ...data, experiences: newExps });
                                        }}
                                      >
                                        {bullet}
                                      </span>
                                    </div>
                                  );
                                })}
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
                      {data.spacerBeforeEducation && (
                        <div
                          className="outline-none" style={{ color: data.colorScheme === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }}
                          contentEditable={true}
                          suppressContentEditableWarning
                          onInput={(e) => {
                            onChange({
                              ...data,
                              spacerBeforeEducation: e.currentTarget.textContent || ""
                            });
                          }}
                          style={{ whiteSpace: 'pre-wrap', cursor: 'text', display: 'block', fontSize: '11pt', lineHeight: '1.5' }}
                        >
                          {data.spacerBeforeEducation}
                        </div>
                      )}

                      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <h2
                          className="font-bold outline-none" style={{ color: data.colorScheme === 'light' ? '#000000' : '#ffffff' }}
                          style={{ fontSize: '14pt', whiteSpace: 'pre-wrap' }}
                          contentEditable={true}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const newTitle = e.currentTarget.textContent || "Ausbildung";
                            onChange({
                              ...data,
                              sectionTitles: {
                                experience: data.sectionTitles?.experience || "Berufserfahrung",
                                education: newTitle,
                                skills: data.sectionTitles?.skills || "Skills"
                              }
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
                            className="relative"
                          >

                            <div className="mb-1">
                              <h3
                                className="text-base sm:text-lg font-semibold outline-none" style={{ color: data.colorScheme === 'light' ? '#000000' : '#ffffff' }}
                                contentEditable={true}
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const text = e.currentTarget.textContent || "";
                                  const newEducation = [...data.education];
                                  newEducation[index] = { ...newEducation[index], degree: text, field: "" };
                                  onChange({ ...data, education: newEducation });
                                }}
                                style={{ whiteSpace: 'pre-wrap' }}
                              >
                                {edu.degree || "Abschluss"} {edu.field && `in ${edu.field}`}
                              </h3>
                              <p
                                className="text-sm sm:text-base font-medium outline-none" style={{ color: data.colorScheme === 'light' ? '#000000' : '#ffffff' }}
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

                            <p className="text-xs sm:text-sm" style={{ color: data.colorScheme === 'light' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }}>
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
                      {data.spacerBeforeSkills && (
                        <div
                          className="outline-none" style={{ color: data.colorScheme === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }}
                          contentEditable={true}
                          suppressContentEditableWarning
                          onInput={(e) => {
                            onChange({
                              ...data,
                              spacerBeforeSkills: e.currentTarget.textContent || ""
                            });
                          }}
                          style={{ whiteSpace: 'pre-wrap', cursor: 'text', display: 'block', fontSize: '11pt', lineHeight: '1.5' }}
                        >
                          {data.spacerBeforeSkills}
                        </div>
                      )}

                      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <h2
                          className="font-bold outline-none" style={{ color: data.colorScheme === 'light' ? '#000000' : '#ffffff' }}
                          style={{ fontSize: '14pt', whiteSpace: 'pre-wrap' }}
                          contentEditable={true}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const newTitle = e.currentTarget.textContent || "Skills";
                            onChange({
                              ...data,
                              sectionTitles: {
                                experience: data.sectionTitles?.experience || "Berufserfahrung",
                                education: data.sectionTitles?.education || "Ausbildung",
                                skills: newTitle
                              }
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
                              <span className="text-xs sm:text-sm font-medium" style={{ color: data.colorScheme === 'light' ? '#000000' : '#ffffff' }}>
                                {skill.name || "Skill"}
                              </span>
                              <span className="text-xs" style={{ color: data.colorScheme === 'light' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }}>
                                {skill.level}/5
                              </span>
                            </div>

                            <div
                              className="relative h-1.5 sm:h-2 rounded-full overflow-hidden"
                              style={{ backgroundColor: data.colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)' }}
                            >
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(skill.level / 5) * 100}%` }}
                                transition={{ duration: 1, delay: 0.8 + index * 0.05 }}
                                className="absolute inset-y-0 left-0 rounded-full shadow-lg"
                                style={{
                                  backgroundColor: data.colorScheme === 'light' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
                                  boxShadow: data.colorScheme === 'light' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : '0 10px 15px -3px rgba(255,255,255,0.1)',
                                }}
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.section>
                  )}

                  {/* Signature */}
                  {data.showSignature && data.signatureLocation && data.signatureDate && (
                    <motion.section
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.7 }}
                      className="mt-12 sm:mt-16"
                    >
                      <div className="flex flex-col items-start gap-8">
                        <p
                          className="text-sm outline-none" style={{ color: data.colorScheme === 'light' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }}
                          contentEditable={true}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const text = e.currentTarget.textContent || "";
                            // Versuche, Ort und Datum zu trennen
                            const parts = text.split(",").map(p => p.trim());
                            if (parts.length >= 2) {
                              onChange({
                                ...data,
                                signatureLocation: parts[0],
                              });
                            } else {
                              onChange({
                                ...data,
                                signatureLocation: parts[0] || "",
                              });
                            }
                          }}
                          style={{ whiteSpace: 'pre-wrap' }}
                        >
                          {data.signatureLocation}, {formatDate(data.signatureDate)}
                        </p>

                        <div className="flex flex-col gap-2">
                          {/* Show signature image if available, otherwise show text signature */}
                          {data.signatureImageUrl ? (
                            <div className="mb-2">
                              <img
                                src={data.signatureImageUrl}
                                alt="Signature"
                                className="max-w-[200px] max-h-[80px] object-contain"
                              />
                            </div>
                          ) : (
                            data.signatureName && (
                              <p
                                className="text-2xl italic outline-none" style={{ color: data.colorScheme === 'light' ? '#000000' : '#ffffff' }}
                                style={{ fontFamily: `'${data.signatureFont || 'Dancing Script'}', cursive`, whiteSpace: 'pre-wrap' }}
                                contentEditable={true}
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  onChange({
                                    ...data,
                                    signatureName: e.currentTarget.textContent || ""
                                  });
                                }}
                              >
                                {data.signatureName}
                              </p>
                            )
                          )}
                          <div className="w-48 border-b border-white/30"></div>
                          <p className="text-xs" style={{ color: data.colorScheme === 'light' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }}>
                            (Unterschrift)
                          </p>
                        </div>
                      </div>
                    </motion.section>
                  )}
                </div>
              </div>
            </div>
            </div>
          </motion.div>
        </div>
    </div>
  );
});

CVPreview.displayName = "CVPreview";
