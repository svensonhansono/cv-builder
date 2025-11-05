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
}

export function CVPreview({ data }: CVPreviewProps) {
  const cvRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPdfMode, setIsPdfMode] = useState(false);
  const [pageHeights, setPageHeights] = useState<number[]>([297, 297, 297, 297]); // in mm
  const [draggingPage, setDraggingPage] = useState<number | null>(null);

  const formatDate = (date: string) => {
    if (!date) return "";
    const [year, month, day] = date.split("-");
    return `${day}.${month}.${year}`;
  };

  const handleDragStart = (pageNum: number) => {
    setDraggingPage(pageNum);
  };

  const handleDrag = (e: React.DragEvent, pageNum: number) => {
    if (!cvRef.current || e.clientY === 0) return;

    const rect = cvRef.current.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;

    // Get the CSS pixel value and convert to mm based on the CSS mm unit
    const element = cvRef.current;
    const computedStyle = window.getComputedStyle(element);
    const widthPx = element.offsetWidth;
    const widthMM = 210; // A4 width in mm
    const pxPerMM = widthPx / widthMM;

    const heightMM = offsetY / pxPerMM;

    // Update the page height
    setPageHeights(prev => {
      const newHeights = [...prev];
      newHeights[pageNum - 1] = Math.max(100, Math.min(500, heightMM)); // Min 100mm, Max 500mm
      return newHeights;
    });
  };

  const handleDragEnd = () => {
    setDraggingPage(null);
  };

  // Calculate cumulative heights for positioning
  const getCumulativeHeight = (pageNum: number) => {
    return pageHeights.slice(0, pageNum).reduce((sum, h) => sum + h, 0);
  };

  // Safety: Reset PDF mode after 10 seconds if something goes wrong
  useEffect(() => {
    if (isPdfMode) {
      const timeout = setTimeout(() => {
        setIsPdfMode(false);
        setIsGenerating(false);
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [isPdfMode]);

  const handleDownload = async () => {
    if (!cvRef.current || isGenerating) return;

    setIsGenerating(true);
    setIsPdfMode(true);

    // Wait for re-render with PDF styles
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // Capture the CV container as canvas
      const canvas = await html2canvas(cvRef.current, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#0f172a",
        width: 794, // 210mm at 96 DPI
        height: cvRef.current.offsetHeight,
        windowHeight: cvRef.current.offsetHeight,
      });

      // A4 dimensions in mm
      const pdfWidth = 210;
      const pdfHeight = 297;

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Convert canvas to image
      const imgData = canvas.toDataURL("image/jpeg", 0.8);

      // Calculate dimensions
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Convert pixels to mm (assuming 96 DPI)
      const imgWidthMM = (imgWidth * 25.4) / 96;
      const imgHeightMM = (imgHeight * 25.4) / 96;

      // Scale to fit A4 width
      const scale = pdfWidth / imgWidthMM;
      const scaledHeight = imgHeightMM * scale;

      // Add pages using custom heights - cut canvas into pieces
      // Convert mm to canvas pixels: CSS mm * (96 DPI / 25.4) * scale
      const mmToCanvasPx = (mm: number) => mm * (96 / 25.4) * 1.5;

      // Top margin for pages 2+ to match first page spacing
      const topMarginMM = 25; // 25mm for pages 2+

      let yPositionMM = 0;
      let pageNumber = 0;

      for (let i = 0; i < pageHeights.length; i++) {
        const customPageHeight = pageHeights[i];

        // Calculate pixel positions
        const yStartPx = Math.round(mmToCanvasPx(yPositionMM));

        // Stop if we've covered all content
        if (yStartPx >= imgHeight) break;

        if (pageNumber > 0) {
          pdf.addPage();
        }

        // Add dark background for full page
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

        // Calculate height for this page section
        const heightPx = Math.min(
          Math.round(mmToCanvasPx(customPageHeight)),
          imgHeight - yStartPx
        );

        // Create a new canvas for this page section
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = imgWidth;
        pageCanvas.height = heightPx;

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          // Copy only the section for this page
          ctx.drawImage(
            canvas,
            0, yStartPx,        // Source x, y
            imgWidth, heightPx, // Source width, height
            0, 0,               // Dest x, y
            imgWidth, heightPx  // Dest width, height
          );

          // Convert to image
          const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.8);

          // Add to PDF - use the actual content height, scaled to fit width
          const ratio = heightPx / imgWidth;
          let pageHeightInPDF = pdfWidth * ratio;

          // For pages after the first, add top margin to match the first page's padding
          const currentTopMargin = pageNumber === 0 ? 0 : topMarginMM;

          // Scale down content if needed to fit with margin
          const maxAvailableHeight = pdfHeight - currentTopMargin - 10; // 10mm bottom margin
          if (pageHeightInPDF > maxAvailableHeight) {
            pageHeightInPDF = maxAvailableHeight;
          }

          // Insert image with top margin for pages 2+
          pdf.addImage(pageImgData, "JPEG", 0, currentTopMargin, pdfWidth, pageHeightInPDF);
        }

        // Move to next section - use the page height as set by user
        yPositionMM += customPageHeight;
        pageNumber++;
      }

      // Generate filename from name or use default
      const fileName = data.personalInfo.firstName && data.personalInfo.lastName
        ? `${data.personalInfo.firstName}_${data.personalInfo.lastName}_CV.pdf`
        : "Lebenslauf.pdf";

      pdf.save(fileName);
    } catch (error) {
      console.error("Fehler beim PDF-Export:", error);
      alert("Fehler beim Erstellen der PDF. Bitte versuche es erneut.");
    } finally {
      setIsPdfMode(false);
      setIsGenerating(false);
    }
  };

  return (
    <div className={`h-full overflow-y-auto ${isPdfMode ? 'bg-slate-900' : ''}`}>
      {!isPdfMode && (
        <div className="p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full mx-auto"
            style={{ maxWidth: '210mm' }}
          >
            {/* Download Button */}
            <div className="flex justify-end mb-4 sm:mb-6">
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
              ref={cvRef}
              className="rounded-lg sm:rounded-xl lg:rounded-2xl glass shadow-2xl shadow-purple-500/20 border border-white/10 relative"
              style={{
                width: '210mm',
                fontFamily: data.fontFamily || 'Arial',
                paddingLeft: '2.5cm',
                paddingRight: '2.0cm',
                paddingTop: '2.7cm',
                paddingBottom: '2.0cm'
              }}
            >
              {/* Seitenumbruch-Markierungen - nur in Vorschau sichtbar */}
              {!isPdfMode && [1, 2, 3, 4].map((pageNum) => (
                <div
                  key={pageNum}
                  className="absolute left-0 right-0"
                  style={{
                    top: `${getCumulativeHeight(pageNum)}mm`,
                    borderTop: '2px dashed #a855f7',
                    zIndex: 50,
                    cursor: 'ns-resize'
                  }}
                  draggable
                  onDragStart={() => handleDragStart(pageNum)}
                  onDrag={(e) => handleDrag(e, pageNum)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-500 text-white px-3 py-1 rounded text-xs font-medium whitespace-nowrap shadow-lg pointer-events-auto cursor-grab active:cursor-grabbing">
                    <span className="mr-2">↕</span>
                    Seitenumbruch (Seite {pageNum}: {Math.round(pageHeights[pageNum - 1])}mm)
                  </div>
                </div>
              ))}
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
                  <div className="absolute inset-0 rounded-full ring-2 ring-purple-500/20 ring-offset-2 ring-offset-transparent"></div>
                </motion.div>
              )}

              {/* Text Content */}
              <div className="flex-1">
                <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 ${
                  isPdfMode ? 'text-purple-400' : 'gradient-text'
                }`}>
                  {data.personalInfo.firstName} {data.personalInfo.lastName}
                </h1>
                <p className={`text-base sm:text-lg md:text-xl mb-3 sm:mb-4 ${
                  isPdfMode ? 'text-purple-300' : 'text-purple-300'
                }`}>{data.personalInfo.title}</p>

                <div className={`flex flex-wrap gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm ${
                  isPdfMode ? 'text-gray-300' : 'text-foreground/70'
                }`}>
                  {data.personalInfo.email && (
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-purple-400" style={{ marginTop: '2px' }} />
                      <span className="break-all">{data.personalInfo.email}</span>
                    </div>
                  )}
                  {data.personalInfo.phone && (
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-purple-400" style={{ marginTop: '2px' }} />
                      <span>{data.personalInfo.phone}</span>
                    </div>
                  )}
                  {data.personalInfo.location && (
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-purple-400" style={{ marginTop: '2px' }} />
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
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <h2 className={`font-bold ${
                  isPdfMode ? 'text-purple-400' : 'gradient-text'
                }`} style={{ fontSize: '14pt' }}>{data.sectionTitles?.experience || "Berufserfahrung"}</h2>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {data.experiences.map((exp, index) => (
                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                    className="relative pl-4 sm:pl-6 border-l-2 border-purple-500/30 hover:border-purple-500/60 transition-colors"
                    style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                  >
                    <div className="absolute -left-[7px] sm:-left-[9px] top-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50" />

                    <div className="mb-1">
                      <h3 className={`text-base sm:text-lg font-semibold ${
                        isPdfMode ? 'text-white' : 'text-foreground'
                      }`}>
                        {exp.position || "Position"}
                      </h3>
                      <p className="text-sm sm:text-base font-medium text-purple-300">
                        {exp.company || "Unternehmen"}
                      </p>
                    </div>

                    <p className={`text-xs sm:text-sm mb-2 ${
                      isPdfMode ? 'text-gray-400' : 'text-foreground/60'
                    }`}>
                      {formatDate(exp.startDate)} -{" "}
                      {exp.current ? "Heute" : formatDate(exp.endDate)}
                    </p>

                    {exp.bulletPoints && exp.bulletPoints.length > 0 && exp.bulletPoints.some(bp => bp.trim()) && (
                      <div className="space-y-1">
                        {exp.bulletPoints.filter(bp => bp.trim()).map((bullet, idx) => (
                          <div key={idx} className={`flex gap-2 leading-relaxed ${
                            isPdfMode ? 'text-gray-200' : 'text-foreground/80'
                          }`} style={{ fontSize: '11pt' }}>
                            <span className="text-purple-400 flex-shrink-0">•</span>
                            <span>{bullet}</span>
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
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <h2 className={`font-bold ${
                  isPdfMode ? 'text-purple-400' : 'gradient-text'
                }`} style={{ fontSize: '14pt' }}>{data.sectionTitles?.education || "Ausbildung"}</h2>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {data.education.map((edu, index) => (
                  <motion.div
                    key={edu.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                    className="relative pl-4 sm:pl-6 border-l-2 border-purple-500/30 hover:border-purple-500/60 transition-colors"
                    style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                  >
                    <div className="absolute -left-[7px] sm:-left-[9px] top-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50" />

                    <div className="mb-1">
                      <h3 className={`text-base sm:text-lg font-semibold ${
                        isPdfMode ? 'text-white' : 'text-foreground'
                      }`}>
                        {edu.degree || "Abschluss"} {edu.field && `in ${edu.field}`}
                      </h3>
                      <p className="text-sm sm:text-base font-medium text-purple-300">
                        {edu.institution || "Institution"}
                      </p>
                    </div>

                    <p className={`text-xs sm:text-sm ${
                      isPdfMode ? 'text-gray-400' : 'text-foreground/60'
                    }`}>
                      {formatDate(edu.startDate)} -{" "}
                      {edu.current ? "Heute" : formatDate(edu.endDate)}
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
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <h2 className={`font-bold ${
                  isPdfMode ? 'text-purple-400' : 'gradient-text'
                }`} style={{ fontSize: '14pt' }}>{data.sectionTitles?.skills || "Skills"}</h2>
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
                      <span className={`text-xs sm:text-sm font-medium ${
                        isPdfMode ? 'text-white' : 'text-foreground'
                      }`}>
                        {skill.name || "Skill"}
                      </span>
                      <span className={`text-xs ${
                        isPdfMode ? 'text-gray-400' : 'text-foreground/60'
                      }`}>
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

          {/* Unterschriftszeile (DIN 5008) */}
          {data.signatureLocation && data.signatureDate && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-12 sm:mt-16"
            >
              <div className="flex flex-col items-start gap-8">
                <p className={`text-sm ${
                  isPdfMode ? 'text-gray-300' : 'text-foreground/70'
                }`}>
                  {data.signatureLocation}, {formatDate(data.signatureDate)}
                </p>

                <div className="flex flex-col gap-2">
                  {data.signatureName && (
                    <p className={`text-2xl italic ${
                      isPdfMode ? 'text-gray-200' : 'text-foreground'
                    }`} style={{ fontFamily: `'${data.signatureFont || 'Dancing Script'}', cursive` }}>
                      {data.signatureName}
                    </p>
                  )}
                  <div className={`w-48 border-b ${
                    isPdfMode ? 'border-gray-400' : 'border-white/30'
                  }`}></div>
                  <p className={`text-xs ${
                    isPdfMode ? 'text-gray-400' : 'text-foreground/60'
                  }`}>
                    (Unterschrift)
                  </p>
                </div>
              </div>
            </motion.section>
          )}
        </div>
          </motion.div>
        </div>
      )}

      {isPdfMode && (
        <div
          ref={cvRef}
          className="bg-slate-900"
          style={{
            width: '210mm',
            fontFamily: data.fontFamily || 'Arial',
            paddingLeft: '2.5cm',
            paddingRight: '2.0cm',
            paddingTop: '2.7cm',
            paddingBottom: '2.0cm'
          }}
        >
            {/* Header */}
            <div className="mb-8 pb-8 border-b border-white/10">
              <div className="flex gap-6 items-start">
                {/* Profile Photo */}
                {data.personalInfo.photoUrl && (
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-500/30 shadow-xl shadow-purple-500/30">
                      <img
                        src={data.personalInfo.photoUrl}
                        alt={`${data.personalInfo.firstName} ${data.personalInfo.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Text Content */}
                <div className="flex-1">
                  <h1 className="text-4xl font-bold mb-2 text-purple-400">
                    {data.personalInfo.firstName} {data.personalInfo.lastName}
                  </h1>
                  <p className="text-xl mb-4 text-purple-300">{data.personalInfo.title}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-300" style={{ overflow: 'visible', minHeight: '1.2em' }}>
                    {data.personalInfo.email && (
                      <div className="flex gap-2" style={{ alignItems: 'flex-start', overflow: 'visible' }}>
                        <Mail className="w-4 h-4 flex-shrink-0 text-purple-400" style={{ position: 'relative', top: '0.2em' }} />
                        <span>{data.personalInfo.email}</span>
                      </div>
                    )}
                    {data.personalInfo.phone && (
                      <div className="flex gap-2" style={{ alignItems: 'flex-start', overflow: 'visible' }}>
                        <Phone className="w-4 h-4 flex-shrink-0 text-purple-400" style={{ position: 'relative', top: '0.2em' }} />
                        <span>{data.personalInfo.phone}</span>
                      </div>
                    )}
                    {data.personalInfo.location && (
                      <div className="flex gap-2" style={{ alignItems: 'flex-start', overflow: 'visible' }}>
                        <MapPin className="w-4 h-4 flex-shrink-0 text-purple-400" style={{ position: 'relative', top: '0.2em' }} />
                        <span>{data.personalInfo.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Experience */}
            {data.experiences.length > 0 && (
              <section className="mb-8" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <h2 className="font-bold text-purple-400 mb-6" style={{ fontSize: '14pt' }}>{data.sectionTitles?.experience || "Berufserfahrung"}</h2>

                <div className="space-y-6">
                  {data.experiences.map((exp) => (
                    <div key={exp.id} className="relative pl-6 border-l-2 border-purple-500/30" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50" />

                      <h3 className="text-lg font-semibold text-white">{exp.position || "Position"}</h3>
                      <p className="text-base font-medium text-purple-300">{exp.company || "Unternehmen"}</p>
                      <p className="text-sm mb-2 text-gray-400">
                        {formatDate(exp.startDate)} - {exp.current ? "Heute" : formatDate(exp.endDate)}
                      </p>

                      {exp.bulletPoints && exp.bulletPoints.length > 0 && exp.bulletPoints.some(bp => bp.trim()) && (
                        <div className="space-y-1">
                          {exp.bulletPoints.filter(bp => bp.trim()).map((bullet, idx) => (
                            <div key={idx} className="flex gap-2 leading-relaxed text-gray-200" style={{ fontSize: '11pt' }}>
                              <span className="text-purple-400">•</span>
                              <span>{bullet}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Education */}
            {data.education.length > 0 && (
              <section className="mb-8" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <h2 className="font-bold text-purple-400 mb-6" style={{ fontSize: '14pt' }}>{data.sectionTitles?.education || "Ausbildung"}</h2>

                <div className="space-y-6">
                  {data.education.map((edu) => (
                    <div key={edu.id} className="relative pl-6 border-l-2 border-purple-500/30" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50" />

                      <h3 className="text-lg font-semibold text-white">
                        {edu.degree || "Abschluss"} {edu.field && `in ${edu.field}`}
                      </h3>
                      <p className="text-base font-medium text-purple-300">{edu.institution || "Institution"}</p>
                      <p className="text-sm text-gray-400">
                        {formatDate(edu.startDate)} - {edu.current ? "Heute" : formatDate(edu.endDate)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Skills */}
            {data.skills.length > 0 && (
              <section className="mb-8" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <h2 className="font-bold text-purple-400 mb-6" style={{ fontSize: '14pt' }}>{data.sectionTitles?.skills || "Skills"}</h2>

                <div className="grid grid-cols-2 gap-4">
                  {data.skills.map((skill) => (
                    <div key={skill.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-white">{skill.name || "Skill"}</span>
                        <span className="text-xs text-gray-400">{skill.level}/5</span>
                      </div>
                      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                          style={{ width: `${(skill.level / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Unterschriftszeile (DIN 5008) - PDF */}
            {data.signatureLocation && data.signatureDate && (
              <section className="mt-16" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div className="flex flex-col items-start gap-8">
                  <p className="text-sm text-gray-300">
                    {data.signatureLocation}, {formatDate(data.signatureDate)}
                  </p>

                  <div className="flex flex-col gap-2">
                    {data.signatureName && (
                      <p className="text-2xl italic text-gray-200" style={{ fontFamily: `'${data.signatureFont || 'Dancing Script'}', cursive` }}>
                        {data.signatureName}
                      </p>
                    )}
                    <div className="w-48 border-b border-gray-400"></div>
                    <p className="text-xs text-gray-400">
                      (Unterschrift)
                    </p>
                  </div>
                </div>
              </section>
            )}
        </div>
      )}
    </div>
  );
}
