"use client";

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { CVData } from "@/types/cv";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-context";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CVPreviewV4Props {
  data: CVData;
  onChange: (data: CVData) => void;
  currentPage: number;
  setCurrentPage: (page: number | ((p: number) => number)) => void;
  totalPages: number;
  setTotalPages: (pages: number) => void;
  setIsGenerating: (generating: boolean) => void;
}

export interface CVPreviewV4Handle {
  handleDownload: () => Promise<void>;
}

export const CVPreviewV4 = forwardRef<CVPreviewV4Handle, CVPreviewV4Props>(({ data, onChange, currentPage, setCurrentPage, totalPages, setTotalPages, setIsGenerating }, ref) => {
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
    left: 1.5,
    right: 1.5
  });

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

    // Store original state
    const originalPage = currentPage;

    // Hide margin guides during PDF export (but keep page masks active!)
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

      // Use the calculated totalPages from state
      const pagesToCapture = totalPages;

      for (let pageNum = 0; pageNum < pagesToCapture; pageNum++) {
        // Set the current page (this will show only this page via page masks)
        setCurrentPage(pageNum);

        // Wait for page to render
        await new Promise(resolve => setTimeout(resolve, 500));

        // Capture the CV container as it appears now
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
      // Show margin guides again
      marginGuides.forEach(guide => {
        (guide as HTMLElement).style.visibility = '';
      });

      // Restore original page
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
                      background: '#161b2e',
                      zIndex: 50,
                    }}
                  />
                );
              })}

              <div
                ref={previewRef}
                style={{
                  fontFamily: data.fontFamily || "Montserrat",
                  color: "#000",
                }}
              >

            {/* Header with Photo */}
            <div className="flex gap-8 mb-8">
              {/* Left Side - Name and Contact */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2" style={{ color: "#000" }}>
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
                <p className="text-xl mb-4" style={{ color: "#666" }}>
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
                </p>

                <div className="space-y-1 text-sm" style={{ color: "#000" }}>
                  <div>
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
                  </div>
                  <div>
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
                  </div>
                  <div>
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
              </div>

              {/* Right Side - Photo */}
              {data.personalInfo.photoUrl && (
                <div className="w-32 h-40 flex-shrink-0" style={{ marginRight: "8px" }}>
                  <img
                    src={data.personalInfo.photoUrl}
                    alt="Bewerbungsfoto"
                    className="w-full h-full object-cover"
                    style={{ border: "1px solid #000" }}
                  />
                </div>
              )}
            </div>

            <div className="border-t-2 border-black mb-6"></div>

            {/* Main Content */}
            <div className="space-y-6">
              {/* Persönliche Daten */}
              {(data.personalInfo.birthDate || data.personalInfo.birthPlace || data.personalInfo.nationality || data.personalInfo.maritalStatus) && (
                <div>
                  <h2 className="text-lg font-bold mb-3 uppercase" style={{ color: "#000" }}>Persönliche Daten</h2>
                  <div className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-2 text-sm" style={{ color: "#000" }}>
                    {data.personalInfo.birthDate && (
                      <>
                        <div className="font-semibold">Geburtsdatum:</div>
                        <div>
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            className="outline-none"
                            onBlur={(e) => {
                              onChange({
                                ...data,
                                personalInfo: { ...data.personalInfo, birthDate: e.currentTarget.textContent || "" }
                              });
                            }}
                          >
                            {new Date(data.personalInfo.birthDate).toLocaleDateString("de-DE")}
                          </span>
                        </div>
                      </>
                    )}
                    {data.personalInfo.birthPlace && (
                      <>
                        <div className="font-semibold">Geburtsort:</div>
                        <div>
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            className="outline-none"
                            onBlur={(e) => {
                              onChange({
                                ...data,
                                personalInfo: { ...data.personalInfo, birthPlace: e.currentTarget.textContent || "" }
                              });
                            }}
                          >
                            {data.personalInfo.birthPlace}
                          </span>
                        </div>
                      </>
                    )}
                    {data.personalInfo.nationality && (
                      <>
                        <div className="font-semibold">Staatsangehörigkeit:</div>
                        <div>
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            className="outline-none"
                            onBlur={(e) => {
                              onChange({
                                ...data,
                                personalInfo: { ...data.personalInfo, nationality: e.currentTarget.textContent || "" }
                              });
                            }}
                          >
                            {data.personalInfo.nationality}
                          </span>
                        </div>
                      </>
                    )}
                    {data.personalInfo.maritalStatus && (
                      <>
                        <div className="font-semibold">Familienstand:</div>
                        <div>
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            className="outline-none"
                            onBlur={(e) => {
                              onChange({
                                ...data,
                                personalInfo: { ...data.personalInfo, maritalStatus: e.currentTarget.textContent || "" }
                              });
                            }}
                          >
                            {data.personalInfo.maritalStatus}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Berufserfahrung */}
              {data.experiences.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold mb-3 uppercase" style={{ color: "#000" }}>
                    {data.sectionTitles?.experience || "Berufserfahrung"}
                  </h2>
                  <div className="space-y-4">
                    {data.experiences.map((exp, expIndex) => (
                      <div key={exp.id} className="text-sm">
                        <div className="flex justify-between mb-1">
                          <div className="font-bold" style={{ color: "#000" }}>
                            <span
                              contentEditable
                              suppressContentEditableWarning
                              className="outline-none"
                              onBlur={(e) => {
                                const newExps = [...data.experiences];
                                newExps[expIndex] = { ...newExps[expIndex], position: e.currentTarget.textContent || "" };
                                onChange({ ...data, experiences: newExps });
                              }}
                            >
                              {exp.position}
                            </span>
                          </div>
                          <div style={{ color: "#666" }}>
                            {formatDate(exp.startDate)}{(exp.startDate && (exp.endDate || exp.current)) ? " - " : ""}{exp.current ? "heute" : formatDate(exp.endDate)}
                          </div>
                        </div>
                        <div className="mb-2" style={{ color: "#666" }}>
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            className="outline-none"
                            onBlur={(e) => {
                              const newExps = [...data.experiences];
                              newExps[expIndex] = { ...newExps[expIndex], company: e.currentTarget.textContent || "" };
                              onChange({ ...data, experiences: newExps });
                            }}
                          >
                            {exp.company}
                          </span>
                        </div>
                        {exp.bulletPoints && exp.bulletPoints.length > 0 && (
                          <ul className="list-disc ml-5 space-y-1" style={{ color: "#000" }}>
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

              {/* Ausbildung */}
              {data.education.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold mb-3 uppercase" style={{ color: "#000" }}>
                    {data.sectionTitles?.education || "Ausbildung"}
                  </h2>
                  <div className="space-y-4">
                    {data.education.map((edu, eduIndex) => (
                      <div key={edu.id} className="text-sm">
                        <div className="flex justify-between mb-1">
                          <div className="font-bold" style={{ color: "#000" }}>
                            <span
                              contentEditable
                              suppressContentEditableWarning
                              className="outline-none"
                              onBlur={(e) => {
                                const newEducation = [...data.education];
                                newEducation[eduIndex] = { ...newEducation[eduIndex], degree: e.currentTarget.textContent || "" };
                                onChange({ ...data, education: newEducation });
                              }}
                            >
                              {edu.degree}
                            </span>{" "}
                            <span
                              contentEditable
                              suppressContentEditableWarning
                              className="outline-none"
                              onBlur={(e) => {
                                const newEducation = [...data.education];
                                newEducation[eduIndex] = { ...newEducation[eduIndex], field: e.currentTarget.textContent || "" };
                                onChange({ ...data, education: newEducation });
                              }}
                            >
                              {edu.field}
                            </span>
                          </div>
                          <div style={{ color: "#666" }}>
                            {formatDate(edu.startDate)}{(edu.startDate && (edu.endDate || edu.current)) ? " - " : ""}{edu.current ? "heute" : formatDate(edu.endDate)}
                          </div>
                        </div>
                        <div style={{ color: "#666" }}>
                          <span
                            contentEditable
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
                <div>
                  <h2 className="text-lg font-bold mb-3 uppercase" style={{ color: "#000" }}>
                    {data.sectionTitles?.skills || "Kenntnisse"}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {data.skills.map((skill) => (
                      <div key={skill.id} className="flex items-center gap-2">
                        <div className="font-semibold" style={{ color: "#000" }}>{skill.name}</div>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className="w-3 h-3"
                              style={{
                                backgroundColor: i < skill.level ? "#000" : "#ddd",
                                border: "1px solid #000"
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

            {/* Signature */}
            {data.showSignature && (
              <div className="mt-12">
                <div className="flex justify-between items-end text-sm">
                  <div style={{ color: "#000" }}>
                    {data.signatureLocation}, {data.signatureDate && new Date(data.signatureDate).toLocaleDateString("de-DE")}
                  </div>
                  <div className="text-center">
                    {data.signatureImageUrl ? (
                      <img src={data.signatureImageUrl} alt="Unterschrift" className="h-16 mb-2" />
                    ) : data.signatureName ? (
                      <div
                        className="text-3xl mb-2"
                        style={{ fontFamily: `'${data.signatureFont}', cursive`, color: "#000" }}
                      >
                        {data.signatureName}
                      </div>
                    ) : null}
                    <div className="border-t border-black pt-1" style={{ color: "#000" }}>
                      {data.personalInfo.firstName} {data.personalInfo.lastName}
                    </div>
                  </div>
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

CVPreviewV4.displayName = "CVPreviewV4";
