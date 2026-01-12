"use client";

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { CVData } from "@/types/cv";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-context";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CVPreviewV5Props {
  data: CVData;
  onChange: (data: CVData) => void;
  currentPage: number;
  setCurrentPage: (page: number | ((p: number) => number)) => void;
  totalPages: number;
  setTotalPages: (pages: number) => void;
  setIsGenerating: (generating: boolean) => void;
}

export interface CVPreviewV5Handle {
  handleDownload: () => Promise<void>;
}

export const CVPreviewV5 = forwardRef<CVPreviewV5Handle, CVPreviewV5Props>(({ data, onChange, currentPage, setCurrentPage, totalPages, setTotalPages, setIsGenerating }, ref) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const cvContainerRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const [showUpgradeMessage, setShowUpgradeMessage] = useState(false);
  const { isPremium } = useAuth();
  const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);
  
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
  useEffect(() => {
    const timer = setTimeout(() => {
      if (contentContainerRef.current && cvContainerRef.current) {
        const pageMasks = contentContainerRef.current.querySelectorAll('[data-page-mask]');
        pageMasks.forEach(mask => {
          (mask as HTMLElement).style.display = 'none';
        });

        const actualContentHeight = contentContainerRef.current.scrollHeight;

        pageMasks.forEach(mask => {
          (mask as HTMLElement).style.display = '';
        });

        const cvContainerHeightPx = cvContainerRef.current.offsetHeight;
        const pageContentHeightPx = (contentHeight / 29.7) * cvContainerHeightPx;
        const pagesNeeded = Math.ceil(actualContentHeight / pageContentHeightPx);

        const pages = Math.max(1, Math.min(pagesNeeded, 4));
        setTotalPages(pages);
        setTotalPages(pages);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [data, margins, contentHeight]);

  const formatDate = (date: string) => {
    if (!date) return "";
    const [year, month] = date.split("-");
    return `${month}.${year}`;
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
    if (!cvContainerRef.current) return;

    setIsGeneratingLocal(true);
    setIsGenerating(true);

    if (!isPremium()) {
      setShowUpgradeMessage(true);
      setIsGeneratingLocal(false);
      setIsGenerating(false);
      return;
    }

    const originalPage = currentPage;

    const marginGuides = document.querySelectorAll('[data-margin-guides]');
    marginGuides.forEach(guide => {
      (guide as HTMLElement).style.visibility = 'hidden';
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
      const pagesToCapture = totalPages;

      for (let pageNum = 0; pageNum < pagesToCapture; pageNum++) {
        setCurrentPage(pageNum);
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(cvContainerRef.current, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#0f172a",
          width: cvContainerRef.current.offsetWidth,
          height: cvContainerRef.current.offsetHeight,
          foreignObjectRendering: false,
        });

        if (pageNum > 0) {
          pdf.addPage();
        }

        const imgData = canvas.toDataURL("image/JPEG", 0.95);
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
      marginGuides.forEach(guide => {
        (guide as HTMLElement).style.visibility = '';
      });

      setCurrentPage(originalPage);
      setIsGeneratingLocal(false);
      setIsGenerating(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleDownload
  }));

  return (
    <div className="h-full overflow-y-auto bg-slate-900/30">
      <div className="p-4 sm:p-6 lg:p-8">
        {showUpgradeMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="font-semibold text-sm">Premium Feature</p>
                  <p className="text-xs text-foreground/70">
                    7 Tage kostenlos testen, dann €1,99/Monat – Alle Vorlagen & PDF-Export freischalten
                  </p>
                </div>
              </div>
              <Button
                onClick={() => window.location.href = '/upgrade'}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shrink-0"
              >
                Jetzt upgraden
              </Button>
            </div>
          </motion.div>
        )}

        {/* Preview Container - A4 Format */}
        <div
          ref={cvContainerRef}
          className="glass mx-auto shadow-2xl shadow-purple-500/20 border border-white/10 relative"
          style={{ width: "210mm", height: "297mm", overflow: "hidden" }}
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

          {/* White content area */}
          <div
            className="absolute bg-white"
            style={{
              top: `${margins.top}cm`,
              left: `${margins.left}cm`,
              right: `${margins.right}cm`,
              bottom: `${margins.bottom}cm`,
            }}
          />

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

              <div
                ref={previewRef}
                className="flex"
                style={{
                  fontFamily: data.fontFamily || "Montserrat",
                }}
              >
            {/* Left Sidebar - Gray */}
            <div className="w-[80mm] bg-gray-200 p-8">
              {/* Photo */}
              {data.personalInfo.photoUrl && (
                <div className="mb-6">
                  <img
                    src={data.personalInfo.photoUrl}
                    alt="Profile"
                    className="w-full h-auto rounded-full border-4 border-white shadow-lg"
                  />
                </div>
              )}

              {/* Name */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold mb-1" style={{ color: "#2d3748" }}>
                  {data.personalInfo.firstName}
                </h1>
                <h1 className="text-3xl font-bold mb-2" style={{ color: "#2d3748" }}>
                  {data.personalInfo.lastName}
                </h1>
                <p className="text-sm font-semibold" style={{ color: "#4a5568" }}>
                  {data.personalInfo.title}
                </p>
              </div>

              {/* Kurprofil */}
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: "#2d3748" }}>
                  Kurzprofil
                </h3>
                <div className="text-xs space-y-1" style={{ color: "#4a5568" }}>
                  <div>{data.personalInfo.birthDate}</div>
                  <div>{data.personalInfo.location}</div>
                  <div>{data.personalInfo.email}</div>
                  <div>{data.personalInfo.phone}</div>
                </div>
              </div>

              {/* Fortbildung */}
              {data.certifications && data.certifications.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: "#2d3748" }}>
                    Fortbildung
                  </h3>
                  <div className="space-y-3">
                    {data.certifications.map((cert) => (
                      <div key={cert.id} className="text-xs" style={{ color: "#4a5568" }}>
                        <div className="font-semibold">{cert.name}</div>
                        <div>{cert.institution}</div>
                        <div className="text-xs">{cert.startDate} - {cert.current ? "heute" : cert.endDate}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sprachen */}
              {data.languages && data.languages.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: "#2d3748" }}>
                    Sprachen
                  </h3>
                  <div className="space-y-1 text-xs" style={{ color: "#4a5568" }}>
                    {data.languages.map((lang) => (
                      <div key={lang.id}>
                        <span className="font-semibold">{lang.name}:</span> {lang.level}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Content - White */}
            <div className="flex-1 p-8">
              {/* Berufserfahrung */}
              {data.experiences.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4 uppercase tracking-wide" style={{ color: "#2d3748" }}>
                    Berufserfahrung
                  </h2>
                  <div className="space-y-6">
                    {data.experiences.map((exp, expIndex) => (
                      <div key={exp.id}>
                        <div className="flex justify-between items-start mb-1">
                          <div
                            contentEditable={true}
                            suppressContentEditableWarning
                            className="font-bold text-base outline-none"
                            style={{ color: "#2d3748" }}
                            onBlur={(e) => {
                              const newExps = [...data.experiences];
                              newExps[expIndex] = { ...newExps[expIndex], position: e.currentTarget.textContent || "" };
                              onChange({ ...data, experiences: newExps });
                            }}
                          >
                            {exp.position}
                          </div>
                          <div className="text-sm" style={{ color: "#718096" }}>
                            {formatDate(exp.startDate)} - {exp.current ? "aktuell" : formatDate(exp.endDate)}
                          </div>
                        </div>
                        <div
                          contentEditable={true}
                          suppressContentEditableWarning
                          className="text-sm mb-2 outline-none"
                          style={{ color: "#4a5568" }}
                          onBlur={(e) => {
                            const newExps = [...data.experiences];
                            newExps[expIndex] = { ...newExps[expIndex], company: e.currentTarget.textContent || "" };
                            onChange({ ...data, experiences: newExps });
                          }}
                        >
                          {exp.company}
                        </div>
                        {exp.bulletPoints && exp.bulletPoints.length > 0 && (
                          <ul className="list-none text-sm space-y-1" style={{ color: "#718096" }}>
                            {exp.bulletPoints.map((point, idx) => (
                              <li key={idx}>
                                • <span
                                  contentEditable={true}
                                  suppressContentEditableWarning
                                  className="outline-none"
                                  onBlur={(e) => {
                                    const newExps = [...data.experiences];
                                    const newBulletPoints = [...newExps[expIndex].bulletPoints];
                                    newBulletPoints[idx] = e.currentTarget.textContent || "";
                                    newExps[expIndex] = { ...newExps[expIndex], bulletPoints: newBulletPoints };
                                    onChange({ ...data, experiences: newExps });
                                  }}
                                >
                                  {point}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ausbildung */}
              {data.education.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4 uppercase tracking-wide" style={{ color: "#2d3748" }}>
                    Ausbildung
                  </h2>
                  <div className="space-y-4">
                    {data.education.map((edu, eduIndex) => (
                      <div key={edu.id}>
                        <div className="flex justify-between items-start mb-1">
                          <div
                            contentEditable={true}
                            suppressContentEditableWarning
                            className="font-bold text-base outline-none"
                            style={{ color: "#2d3748" }}
                            onBlur={(e) => {
                              const newEducation = [...data.education];
                              newEducation[eduIndex] = { ...newEducation[eduIndex], degree: e.currentTarget.textContent || "" };
                              onChange({ ...data, education: newEducation });
                            }}
                          >
                            {edu.degree}
                          </div>
                          <div className="text-sm" style={{ color: "#718096" }}>
                            {formatDate(edu.startDate)} - {edu.current ? "aktuell" : formatDate(edu.endDate)}
                          </div>
                        </div>
                        <div className="text-sm" style={{ color: "#4a5568" }}>
                          <span
                            contentEditable={true}
                            suppressContentEditableWarning
                            className="outline-none"
                            onBlur={(e) => {
                              const newEducation = [...data.education];
                              newEducation[eduIndex] = { ...newEducation[eduIndex], field: e.currentTarget.textContent || "" };
                              onChange({ ...data, education: newEducation });
                            }}
                          >
                            {edu.field}
                          </span> - <span
                            contentEditable={true}
                            suppressContentEditableWarning
                            className="outline-none"
                            onBlur={(e) => {
                              const newEducation = [...data.education];
                              newEducation[eduIndex] = { ...newEducation[eduIndex], institution: e.currentTarget.textContent || "" };
                              onChange({ ...data, education: newEducation });
                            }}
                          >
                            {edu.institution}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {data.skills.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4 uppercase tracking-wide" style={{ color: "#2d3748" }}>
                    Fähigkeiten
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {data.skills.map((skill) => (
                      <div key={skill.id} className="text-sm">
                        <div className="font-semibold mb-1" style={{ color: "#4a5568" }}>
                          {skill.name}
                        </div>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className="h-2 w-full rounded"
                              style={{
                                backgroundColor: i < skill.level ? "#4a5568" : "#e2e8f0",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
            </div>
          </div>

          {/* Signature at bottom - outside pagination but inside container */}
          {data.showSignature && (
            <div className="absolute bottom-8 left-8 right-8" style={{ zIndex: 10 }}>
              <div className="flex justify-between items-end text-sm border-t pt-4">
                <div>{data.signatureLocation}, {data.signatureDate}</div>
                <div className="text-center">
                  {data.signatureImageUrl ? (
                    <img src={data.signatureImageUrl} alt="Unterschrift" className="h-16 mb-2" />
                  ) : data.signatureName ? (
                    <div
                      className="text-3xl mb-2"
                      style={{ fontFamily: `'${data.signatureFont}', cursive` }}
                    >
                      {data.signatureName}
                    </div>
                  ) : null}
                  <div className="border-t border-gray-400 pt-1">
                    {data.personalInfo.firstName} {data.personalInfo.lastName}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CVPreviewV5.displayName = "CVPreviewV5";
