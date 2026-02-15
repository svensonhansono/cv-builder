"use client";

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion } from "framer-motion";
import { CVData } from "@/types/cv";
import { Mail, Phone, MapPin, Linkedin, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-context";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CVPreviewV2Props {
  data: CVData;
  onChange: (data: CVData) => void;
  currentPage: number;
  setCurrentPage: (page: number | ((p: number) => number)) => void;
  totalPages: number;
  setTotalPages: (pages: number) => void;
  setIsGenerating: (generating: boolean) => void;
}

export interface CVPreviewV2Handle {
  handleDownload: () => Promise<void>;
}

export const CVPreviewV2 = forwardRef<CVPreviewV2Handle, CVPreviewV2Props>(({ data, onChange, currentPage, setCurrentPage, totalPages, setTotalPages, setIsGenerating }, ref) => {
  const cvContainerRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);
  const [showUpgradeMessage, setShowUpgradeMessage] = useState(false);
  const { isPremium } = useAuth();

  // Adjustable margins in cm
  const [margins, setMargins] = useState({
    top: 1.5,
    bottom: 1.5,
    left: 2.5,
    right: 2.0
  });

  // Calculate page breaks based on current margins
  const contentHeight = 29.7 - margins.top - margins.bottom;

  // Calculate total pages based on content height
  useEffect(() => {
    if (contentContainerRef.current) {
      const contentHeightPx = contentContainerRef.current.scrollHeight;
      const pageHeightPx = contentContainerRef.current.parentElement?.offsetHeight || 0;
      const pages = Math.ceil(contentHeightPx / pageHeightPx) || 1;
      setTotalPages(pages);
    }
  }, [data, margins]);

  const formatDate = (date: string) => {
    if (!date) return "";
    if (date.includes(".") || !date.includes("-")) return date;
    const parts = date.split("-");
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    if (parts.length === 2) return `${parts[1]}.${parts[0]}`;
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

    setIsGeneratingLocal(true);
    setIsGenerating(true);

    // Check if user has premium access for this template
    if (!isPremium()) {
      setShowUpgradeMessage(true);
      setIsGeneratingLocal(false);
      setIsGenerating(false);
      return;
    }

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

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // Check if content container exists (the area inside margin guides)
      if (!contentContainerRef.current) {
        throw new Error("Content container not found");
      }

      // Capture only the content area (inside margins) as it appears now
      const canvas = await html2canvas(contentContainerRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: contentContainerRef.current.offsetWidth,
        height: contentContainerRef.current.offsetHeight,
        foreignObjectRendering: false,
        onclone: (clonedDoc) => {
          // Convert Grid to Flexbox for better rendering
          const gridElements = clonedDoc.querySelectorAll('[style*="grid"]');
          gridElements.forEach((element) => {
            const el = element as HTMLElement;
            if (el.style.display === 'grid') {
              // Convert to flexbox
              el.style.display = 'flex';
              el.style.flexDirection = 'row';
              el.style.width = '100%';

              // Set children widths
              const children = el.children;
              if (children.length >= 2) {
                (children[0] as HTMLElement).style.width = '35%';
                (children[0] as HTMLElement).style.flexShrink = '0';
                (children[1] as HTMLElement).style.width = '65%';
                (children[1] as HTMLElement).style.flexShrink = '0';
              }
            }
          });
        }
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = 210;
      const pdfHeight = 297;

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

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

      setIsGeneratingLocal(false);
      setIsGenerating(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleDownload
  }));

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Upgrade Message */}
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
            className="rounded-lg sm:rounded-xl lg:rounded-2xl glass shadow-2xl shadow-purple-500/20 border border-white/10 relative"
            style={{
              width: '210mm',
              height: '297mm',
              fontFamily: data.fontFamily || 'Montserrat, sans-serif',
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
              ref={contentContainerRef}
              className="absolute"
              style={{
                zIndex: 1,
                top: `${margins.top}cm`,
                left: `${margins.left}cm`,
                right: `${margins.right}cm`,
                overflow: 'visible',
              }}
            >
              {/* Two Column Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '35% 65%',
                backgroundColor: '#ffffff',
                color: '#000000',
                minHeight: `${contentHeight}cm`,
              }}>
            {/* Left Column - Beige/Gray Background */}
            <div className="bg-[#e8e4dc] p-8">
              {/* Photo */}
              {data.personalInfo.photoUrl && (
                <div className="mb-8">
                  <img
                    src={data.personalInfo.photoUrl}
                    alt={`${data.personalInfo.firstName} ${data.personalInfo.lastName}`}
                    className="w-full h-auto object-cover"
                    style={{ aspectRatio: '3/4' }}
                  />
                </div>
              )}

              {/* Kontakt */}
              <section className="mb-8">
                <h2 className="text-lg font-bold mb-4 tracking-widest border-b-2 border-black pb-2" style={{ color: '#000000' }}>
                  KONTAKT
                </h2>
                <div className="space-y-3 text-sm" style={{ color: '#000000' }}>
                  {data.personalInfo.email && (
                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#000000' }} />
                      <span className="break-all">{data.personalInfo.email}</span>
                    </div>
                  )}
                  {data.personalInfo.phone && (
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#000000' }} />
                      <span>{data.personalInfo.phone}</span>
                    </div>
                  )}
                  {data.personalInfo.linkedin && (
                    <div className="flex items-start gap-2">
                      <Linkedin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#000000' }} />
                      <span className="break-all">{data.personalInfo.linkedin}</span>
                    </div>
                  )}
                  {data.personalInfo.location && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#000000' }} />
                      <span>{data.personalInfo.location}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Über mich */}
              {(data.personalInfo.birthDate || data.personalInfo.birthPlace || data.personalInfo.nationality || data.personalInfo.maritalStatus) && (
                <section className="mb-8">
                  <h2 className="text-lg font-bold mb-4 tracking-widest border-b-2 border-black pb-2" style={{ color: '#000000' }}>
                    ÜBER MICH
                  </h2>
                  <div className="space-y-2 text-sm">
                    {data.personalInfo.birthDate && (
                      <p>Geburtsdatum: {formatDate(data.personalInfo.birthDate)}</p>
                    )}
                    {data.personalInfo.birthPlace && (
                      <p>Geburtsort: {data.personalInfo.birthPlace}</p>
                    )}
                    {data.personalInfo.nationality && (
                      <p>Nationalität: {data.personalInfo.nationality}</p>
                    )}
                    {data.personalInfo.maritalStatus && (
                      <p>Familienstand: {data.personalInfo.maritalStatus}</p>
                    )}
                  </div>
                </section>
              )}

              {/* Skills */}
              {data.skills && data.skills.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-bold mb-4 tracking-widest border-b-2 border-black pb-2" style={{ color: '#000000' }}>
                    SKILLS
                  </h2>
                  <div className="space-y-3">
                    {data.skills.map((skill) => (
                      <div key={skill.id}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium" style={{ color: '#000000' }}>
                            {skill.name}
                          </span>
                          <span className="text-xs" style={{ color: '#666666' }}>
                            {skill.level}/5
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-black rounded-full h-2 transition-all duration-300"
                            style={{ width: `${(skill.level / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Kenntnisse */}
              {((data.languages && data.languages.length > 0) || (data.softwareSkills && data.softwareSkills.length > 0) || data.driverLicense) && (
                <section className="mb-8">
                  <h2 className="text-lg font-bold mb-4 tracking-widest border-b-2 border-black pb-2" style={{ color: '#000000' }}>
                    KENNTNISSE
                  </h2>

                  {data.languages && data.languages.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-bold text-sm mb-2" style={{ color: '#000000' }}>Fremdsprachen</h3>
                      <div className="space-y-1 text-sm">
                        {data.languages.map((lang) => (
                          <p key={lang.id}>{lang.name}: Niveau {lang.level}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.softwareSkills && data.softwareSkills.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-bold text-sm mb-2" style={{ color: '#000000' }}>Software-Kenntnisse</h3>
                      <div className="space-y-1 text-sm">
                        {data.softwareSkills.map((skill) => (
                          <p key={skill.id}>{skill.name}: {skill.level}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.driverLicense && (
                    <div>
                      <h3 className="font-bold text-sm mb-2" style={{ color: '#000000' }}>Führerschein</h3>
                      <p className="text-sm">{data.driverLicense}</p>
                    </div>
                  )}
                </section>
              )}

              {/* Fähigkeiten */}
              {data.abilities && data.abilities.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-bold mb-4 tracking-widest border-b-2 border-black pb-2" style={{ color: '#000000' }}>
                    FÄHIGKEITEN
                  </h2>
                  <div className="space-y-1 text-sm">
                    {data.abilities.map((ability, index) => (
                      <p key={index}>{ability}</p>
                    ))}
                  </div>
                </section>
              )}

              {/* Interessen */}
              {data.interests && data.interests.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-bold mb-4 tracking-widest border-b-2 border-black pb-2" style={{ color: '#000000' }}>
                    INTERESSEN
                  </h2>
                  <div className="space-y-1 text-sm">
                    {data.interests.map((interest, index) => (
                      <p key={index}>{interest}</p>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column - White Background */}
            <div className="bg-white p-8 pt-12">
              {/* Name & Title */}
              <div className="mb-12">
                <h1
                  className="text-4xl font-bold mb-2 tracking-widest uppercase outline-none"
                  style={{ color: '#000000' }}
                  contentEditable={true}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    onChange({
                      ...data,
                      personalInfo: {
                        ...data.personalInfo,
                        firstName: e.currentTarget.textContent || ""
                      }
                    });
                  }}
                >
                  {data.personalInfo.firstName}
                </h1>
                <h1
                  className="text-4xl font-bold mb-4 tracking-widest uppercase outline-none"
                  style={{ color: '#000000' }}
                  contentEditable={true}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    onChange({
                      ...data,
                      personalInfo: {
                        ...data.personalInfo,
                        lastName: e.currentTarget.textContent || ""
                      }
                    });
                  }}
                >
                  {data.personalInfo.lastName}
                </h1>
                {data.personalInfo.title && (
                  <p
                    className="text-lg tracking-widest uppercase outline-none"
                    style={{ color: '#000000' }}
                    contentEditable={true}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      onChange({
                        ...data,
                        personalInfo: {
                          ...data.personalInfo,
                          title: e.currentTarget.textContent || ""
                        }
                      });
                    }}
                  >
                    {data.personalInfo.title}
                  </p>
                )}
              </div>

              {/* Berufserfahrung */}
              {data.experiences.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-bold mb-6 tracking-widest border-b-2 border-black pb-2" style={{ color: '#000000' }}>
                    BERUFSERFAHRUNG
                  </h2>
                  <div className="space-y-6">
                    {data.experiences.map((exp, index) => (
                      <div key={exp.id}>
                        <h3
                          className="font-bold text-base mb-1 outline-none"
                          style={{ color: '#000000' }}
                          contentEditable={true}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const newExps = [...data.experiences];
                            newExps[index] = { ...newExps[index], position: e.currentTarget.textContent || "" };
                            onChange({ ...data, experiences: newExps });
                          }}
                        >
                          {exp.position}
                        </h3>
                        <p
                          className="text-sm mb-1 outline-none"
                          contentEditable={true}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const newExps = [...data.experiences];
                            newExps[index] = { ...newExps[index], company: e.currentTarget.textContent || "" };
                            onChange({ ...data, experiences: newExps });
                          }}
                        >
                          {exp.company}
                        </p>
                        <p className="text-sm text-black mb-2">
                          {formatDate(exp.startDate)}{(exp.startDate && (exp.endDate || exp.current)) ? " - " : ""}{exp.current ? "heute" : formatDate(exp.endDate)}
                        </p>
                        {exp.bulletPoints && exp.bulletPoints.length > 0 && (
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {exp.bulletPoints.filter(bp => bp.trim()).map((bullet, idx) => {
                              const originalIndex = exp.bulletPoints.findIndex((bp, i) => i >= idx && bp === bullet);
                              return (
                                <li key={idx}>
                                  <span
                                    contentEditable={true}
                                    suppressContentEditableWarning
                                    className="outline-none"
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
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Ausbildung */}
              {data.education.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-bold mb-6 tracking-widest border-b-2 border-black pb-2" style={{ color: '#000000' }}>
                    AUSBILDUNG
                  </h2>
                  <div className="space-y-6">
                    {data.education.map((edu, index) => (
                      <div key={edu.id}>
                        <h3
                          className="font-bold text-base mb-1 outline-none"
                          style={{ color: '#000000' }}
                          contentEditable={true}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const text = e.currentTarget.textContent || "";
                            const newEducation = [...data.education];
                            newEducation[index] = { ...newEducation[index], degree: text, field: "" };
                            onChange({ ...data, education: newEducation });
                          }}
                        >
                          {edu.degree} {edu.field && `in ${edu.field}`}
                        </h3>
                        <p
                          className="text-sm mb-1 outline-none"
                          contentEditable={true}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const newEducation = [...data.education];
                            newEducation[index] = { ...newEducation[index], institution: e.currentTarget.textContent || "" };
                            onChange({ ...data, education: newEducation });
                          }}
                        >
                          {edu.institution}
                        </p>
                        <p className="text-sm text-black">
                          {formatDate(edu.startDate)}{(edu.startDate && (edu.endDate || edu.current)) ? " - " : ""}{edu.current ? "heute" : formatDate(edu.endDate)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Weiterbildung */}
              {data.certifications && data.certifications.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-bold mb-6 tracking-widest border-b-2 border-black pb-2" style={{ color: '#000000' }}>
                    WEITERBILDUNG
                  </h2>
                  <div className="space-y-6">
                    {data.certifications.map((cert, certIndex) => (
                      <div key={cert.id}>
                        <h3 className="font-bold text-base mb-1" style={{ color: '#000000' }}>{cert.name}</h3>
                        <p className="text-sm mb-1">{cert.institution}, {cert.location}</p>
                        <p className="text-sm text-black mb-2">
                          {formatDate(cert.startDate)}{(cert.startDate && (cert.endDate || cert.current)) ? " - " : ""}{cert.current ? "heute" : formatDate(cert.endDate)}
                        </p>
                        {cert.bulletPoints && cert.bulletPoints.length > 0 && (
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {cert.bulletPoints.filter(bp => bp.trim()).map((bullet, idx) => {
                              const originalIndex = cert.bulletPoints.findIndex((bp, i) => i >= idx && bp === bullet);
                              return (
                                <li key={idx}>
                                  <span
                                    contentEditable={true}
                                    suppressContentEditableWarning
                                    className="outline-none"
                                    onBlur={(e) => {
                                      const newCerts = [...data.certifications];
                                      const newBulletPoints = [...newCerts[certIndex].bulletPoints];
                                      newBulletPoints[originalIndex] = e.currentTarget.textContent || "";
                                      newCerts[certIndex] = { ...newCerts[certIndex], bulletPoints: newBulletPoints };
                                      onChange({ ...data, certifications: newCerts });
                                    }}
                                  >
                                    {bullet}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Auszeichnungen */}
              {data.awards && data.awards.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-bold mb-6 tracking-widest border-b-2 border-black pb-2" style={{ color: '#000000' }}>
                    AUSZEICHNUNGEN
                  </h2>
                  <div className="space-y-4">
                    {data.awards.map((award) => (
                      <div key={award.id}>
                        <h3 className="font-bold text-base mb-1" style={{ color: '#000000' }}>{award.title}</h3>
                        <p className="text-sm text-black mb-1">{award.date}</p>
                        <p className="text-sm">{award.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Ehrenamt */}
              {data.volunteer && data.volunteer.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-bold mb-6 tracking-widest border-b-2 border-black pb-2" style={{ color: '#000000' }}>
                    EHRENAMT
                  </h2>
                  <div className="space-y-6">
                    {data.volunteer.map((vol, volIndex) => (
                      <div key={vol.id}>
                        <h3 className="font-bold text-base mb-1" style={{ color: '#000000' }}>{vol.role}</h3>
                        <p className="text-sm mb-1">{vol.organization}, {vol.location}</p>
                        <p className="text-sm text-black mb-2">
                          {formatDate(vol.startDate)}{(vol.startDate && (vol.endDate || vol.current)) ? " - " : ""}{vol.current ? "heute" : formatDate(vol.endDate)}
                        </p>
                        {vol.bulletPoints && vol.bulletPoints.length > 0 && (
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {vol.bulletPoints.filter(bp => bp.trim()).map((bullet, idx) => {
                              const originalIndex = vol.bulletPoints.findIndex((bp, i) => i >= idx && bp === bullet);
                              return (
                                <li key={idx}>
                                  <span
                                    contentEditable={true}
                                    suppressContentEditableWarning
                                    className="outline-none"
                                    onBlur={(e) => {
                                      const newVol = [...data.volunteer];
                                      const newBulletPoints = [...newVol[volIndex].bulletPoints];
                                      newBulletPoints[originalIndex] = e.currentTarget.textContent || "";
                                      newVol[volIndex] = { ...newVol[volIndex], bulletPoints: newBulletPoints };
                                      onChange({ ...data, volunteer: newVol });
                                    }}
                                  >
                                    {bullet}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
          </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
});

CVPreviewV2.displayName = "CVPreviewV2";
