"use client";

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { CVData } from "@/types/cv";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-context";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CVPreviewV7Props {
  data: CVData;
  onChange: (data: CVData) => void;
  currentPage: number;
  setCurrentPage: (page: number | ((p: number) => number)) => void;
  totalPages: number;
  setTotalPages: (pages: number) => void;
  setIsGenerating: (generating: boolean) => void;
}

export interface CVPreviewV7Handle {
  handleDownload: () => Promise<void>;
}

export const CVPreviewV7 = forwardRef<CVPreviewV7Handle, CVPreviewV7Props>(({ data, onChange, currentPage, setCurrentPage, totalPages, setTotalPages, setIsGenerating }, ref) => {
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
    if (date.includes(".") || date.includes("/") || !date.includes("-")) return date;
    const parts = date.split("-");
    if (parts.length >= 2) return `${parts[1]}/${parts[0]}`;
    return date;
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
                style={{
                  fontFamily: data.fontFamily || "Montserrat",
                  color: "#1e293b",
                }}
              >

            {/* Header */}
            <div className="text-center mb-12 pb-8" style={{ borderBottom: "4px solid #1e40af" }}>
              {/* Photo */}
              {data.personalInfo.photoUrl && (
                <div className="mb-6 flex justify-center">
                  <img
                    src={data.personalInfo.photoUrl}
                    alt="Profile"
                    className="rounded-full"
                    style={{ width: "150px", height: "150px", objectFit: "cover", border: "5px solid #1e40af" }}
                  />
                </div>
              )}

              <h1 className="text-5xl font-bold mb-3" style={{ color: "#1e40af" }}>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => {
                    const fullName = e.currentTarget.textContent || "";
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
                </span>
              </h1>
              <h2 className="text-2xl mb-4" style={{ color: "#64748b" }}>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => {
                    onChange({
                      ...data,
                      personalInfo: { ...data.personalInfo, title: e.currentTarget.textContent || "" }
                    });
                  }}
                >
                  {data.personalInfo.title}
                </span>
              </h2>

              {/* Contact Info */}
              <div className="flex justify-center gap-8 text-sm" style={{ color: "#475569" }}>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => {
                    onChange({
                      ...data,
                      personalInfo: { ...data.personalInfo, email: e.currentTarget.textContent || "" }
                    });
                  }}
                >
                  {data.personalInfo.email}
                </span>
                <span>•</span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => {
                    onChange({
                      ...data,
                      personalInfo: { ...data.personalInfo, phone: e.currentTarget.textContent || "" }
                    });
                  }}
                >
                  {data.personalInfo.phone}
                </span>
                <span>•</span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => {
                    onChange({
                      ...data,
                      personalInfo: { ...data.personalInfo, location: e.currentTarget.textContent || "" }
                    });
                  }}
                >
                  {data.personalInfo.location}
                </span>
              </div>
            </div>

            {/* Experience */}
            {data.experiences.length > 0 && (
              <div className="mb-10">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3" style={{ color: "#1e40af" }}>
                  <div style={{ width: "40px", height: "4px", backgroundColor: "#1e40af" }}></div>
                  {data.sectionTitles?.experience || "Berufserfahrung"}
                </h2>
                <div className="space-y-6">
                  {data.experiences.map((exp, expIndex) => (
                    <div key={exp.id} className="relative pl-8" style={{ borderLeft: "3px solid #cbd5e1" }}>
                      <div
                        className="absolute -left-2 top-0 w-4 h-4 rounded-full"
                        style={{ backgroundColor: "#1e40af" }}
                      ></div>

                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3
                            className="text-xl font-bold outline-none"
                            style={{ color: "#1e40af" }}
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const newExps = [...data.experiences];
                              newExps[expIndex] = { ...newExps[expIndex], position: e.currentTarget.textContent || "" };
                              onChange({ ...data, experiences: newExps });
                            }}
                          >
                            {exp.position}
                          </h3>
                          <p
                            className="text-lg font-semibold outline-none"
                            style={{ color: "#64748b" }}
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const newExps = [...data.experiences];
                              newExps[expIndex] = { ...newExps[expIndex], company: e.currentTarget.textContent || "" };
                              onChange({ ...data, experiences: newExps });
                            }}
                          >
                            {exp.company}
                          </p>
                        </div>
                        <div className="text-sm font-medium px-3 py-1 rounded" style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}>
                          {formatDate(exp.startDate)}{(exp.startDate && (exp.endDate || exp.current)) ? " - " : ""}{exp.current ? "heute" : formatDate(exp.endDate)}
                        </div>
                      </div>

                      {exp.bulletPoints && exp.bulletPoints.length > 0 && (
                        <ul className="list-disc ml-5 space-y-1 text-sm" style={{ color: "#475569" }}>
                          {exp.bulletPoints.filter(bp => bp.trim()).map((point, idx) => (
                            <li key={idx}>
                              <span
                                contentEditable
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

            {/* Education */}
            {data.education.length > 0 && (
              <div className="mb-10">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3" style={{ color: "#1e40af" }}>
                  <div style={{ width: "40px", height: "4px", backgroundColor: "#1e40af" }}></div>
                  {data.sectionTitles?.education || "Ausbildung"}
                </h2>
                <div className="space-y-6">
                  {data.education.map((edu, eduIndex) => (
                    <div key={edu.id} className="relative pl-8" style={{ borderLeft: "3px solid #cbd5e1" }}>
                      <div
                        className="absolute -left-2 top-0 w-4 h-4 rounded-full"
                        style={{ backgroundColor: "#1e40af" }}
                      ></div>

                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold outline-none" style={{ color: "#1e40af" }}>
                            <span
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const newEducation = [...data.education];
                                newEducation[eduIndex] = { ...newEducation[eduIndex], degree: e.currentTarget.textContent || "" };
                                onChange({ ...data, education: newEducation });
                              }}
                            >
                              {edu.degree}
                            </span>
                            {" "}
                            <span
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const newEducation = [...data.education];
                                newEducation[eduIndex] = { ...newEducation[eduIndex], field: e.currentTarget.textContent || "" };
                                onChange({ ...data, education: newEducation });
                              }}
                            >
                              {edu.field}
                            </span>
                          </h3>
                          <p
                            className="text-lg font-semibold outline-none"
                            style={{ color: "#64748b" }}
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const newEducation = [...data.education];
                              newEducation[eduIndex] = { ...newEducation[eduIndex], institution: e.currentTarget.textContent || "" };
                              onChange({ ...data, education: newEducation });
                            }}
                          >
                            {edu.institution}
                          </p>
                        </div>
                        <div className="text-sm font-medium px-3 py-1 rounded" style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}>
                          {formatDate(edu.startDate)}{(edu.startDate && (edu.endDate || edu.current)) ? " - " : ""}{edu.current ? "heute" : formatDate(edu.endDate)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {data.skills.length > 0 && (
              <div>
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3" style={{ color: "#1e40af" }}>
                  <div style={{ width: "40px", height: "4px", backgroundColor: "#1e40af" }}></div>
                  {data.sectionTitles?.skills || "Kompetenzen"}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {data.skills.map((skill) => (
                    <div key={skill.id}>
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold text-sm">{skill.name}</span>
                        <span className="text-sm" style={{ color: "#64748b" }}>{skill.level}/5</span>
                      </div>
                      <div className="w-full h-2 rounded-full" style={{ backgroundColor: "#e2e8f0" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(skill.level / 5) * 100}%`,
                            backgroundColor: "#1e40af"
                          }}
                        ></div>
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
      </div>
    </div>
  );
});

CVPreviewV7.displayName = "CVPreviewV7";
