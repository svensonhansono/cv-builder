"use client";

import { useRef, forwardRef, useImperativeHandle } from "react";
import { CVData } from "@/types/cv";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CoverLetterA1Props {
  data: CVData;
  onChange: (data: CVData) => void;
  setIsGenerating?: (generating: boolean) => void;
}

export interface CoverLetterHandle {
  handleDownload: () => Promise<void>;
}

export const CoverLetterA1 = forwardRef<CoverLetterHandle, CoverLetterA1Props>(
  ({ data, onChange, setIsGenerating }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
      if (!containerRef.current) return;
      setIsGenerating?.(true);

      try {
        const bgColor = data.colorScheme === 'light' ? '#ffffff' : '#10172b';
        const canvas = await html2canvas(containerRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: bgColor,
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });

        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const pdfWidth = 210;
        const pdfHeight = 297;

        const imgData = canvas.toDataURL("image/jpeg", 0.9);
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Anschreiben_${data.personalInfo.lastName || 'Bewerbung'}.pdf`);
      } catch (error) {
        console.error("Fehler beim PDF-Export:", error);
      } finally {
        setIsGenerating?.(false);
      }
    };

    useImperativeHandle(ref, () => ({
      handleDownload
    }));

    const coverLetter = data.coverLetter || {
      recipientCompany: "",
      recipientName: "",
      recipientPosition: "",
      recipientStreet: "",
      recipientCity: "",
      subject: "",
      salutation: "",
      introText: "",
      mainText: "",
      closingText: "",
      closing: "",
    };

    const isLight = data.colorScheme === 'light';
    const textColor = isLight ? '#000000' : '#ffffff';
    const textColorMuted = isLight ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)';
    const textColorLight = isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)';
    const bgColor = isLight ? '#ffffff' : '#10172b';
    const borderColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

    return (
      <div className="h-full overflow-y-auto bg-slate-900/30">
        <div className="p-4 sm:p-6 lg:p-8">
          <div
            ref={containerRef}
            className="mx-auto shadow-2xl"
            style={{
              width: "210mm",
              height: "297mm",
              backgroundColor: bgColor,
              fontFamily: data.fontFamily || "Montserrat",
              color: textColor,
              overflow: "hidden"
            }}
          >
            <div className="p-12">
              {/* Header */}
              <div className="mb-12 pb-6 border-b" style={{ borderColor }}>
                <h1 className="text-4xl font-bold mb-2" style={{ color: textColor }}>
                  {data.personalInfo.firstName} {data.personalInfo.lastName}
                </h1>
                <p className="text-lg" style={{ color: textColorMuted }}>{data.personalInfo.title}</p>
                <div className="flex flex-col gap-1 mt-4 text-sm" style={{ color: textColorLight }}>
                  {/* Row 1: Email + Phone */}
                  <div className="flex flex-wrap gap-4">
                    {data.personalInfo.email && <div><i className="fa-solid fa-envelope mr-2"></i>{data.personalInfo.email}</div>}
                    {data.personalInfo.phone && <div><i className="fa-solid fa-phone mr-2"></i>{data.personalInfo.phone}</div>}
                  </div>
                  {/* Row 2: Location */}
                  {data.personalInfo.location && (
                    <div><i className="fa-solid fa-location-dot mr-2"></i>{data.personalInfo.location}</div>
                  )}
                </div>
              </div>

              {/* Recipient */}
              <div className="mb-8 text-sm">
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => onChange({ ...data, coverLetter: { ...coverLetter, recipientCompany: e.currentTarget.textContent || "" } })}
                >
                  {coverLetter.recipientCompany}
                </div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => onChange({ ...data, coverLetter: { ...coverLetter, recipientName: e.currentTarget.textContent || "" } })}
                >
                  {coverLetter.recipientName}
                </div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => onChange({ ...data, coverLetter: { ...coverLetter, recipientPosition: e.currentTarget.textContent || "" } })}
                >
                  {coverLetter.recipientPosition}
                </div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => onChange({ ...data, coverLetter: { ...coverLetter, recipientStreet: e.currentTarget.textContent || "" } })}
                >
                  {coverLetter.recipientStreet}
                </div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => onChange({ ...data, coverLetter: { ...coverLetter, recipientCity: e.currentTarget.textContent || "" } })}
                >
                  {coverLetter.recipientCity}
                </div>
              </div>

              {/* Date & Location */}
              <div className="text-right mb-8 text-sm">
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => onChange({ ...data, signatureLocation: e.currentTarget.textContent || "" })}
                >
                  {data.signatureLocation}
                </span>
                , <span
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => onChange({ ...data, signatureDate: e.currentTarget.textContent || "" })}
                >
                  {data.signatureDate}
                </span>
              </div>

              {/* Subject */}
              <div className="mb-6">
                <h2
                  contentEditable
                  suppressContentEditableWarning
                  className="text-xl font-bold outline-none"
                  style={{ color: textColor }}
                  onBlur={(e) => onChange({ ...data, coverLetter: { ...coverLetter, subject: e.currentTarget.textContent || "" } })}
                >
                  {coverLetter.subject}
                </h2>
              </div>

              {/* Salutation */}
              <div className="mb-4 text-sm">
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => onChange({ ...data, coverLetter: { ...coverLetter, salutation: e.currentTarget.textContent || "" } })}
                >
                  {coverLetter.salutation}
                </span>,
              </div>

              {/* Body */}
              <div className="space-y-4 text-sm leading-relaxed">
                <p
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => onChange({ ...data, coverLetter: { ...coverLetter, introText: e.currentTarget.textContent || "" } })}
                >
                  {coverLetter.introText}
                </p>
                <p
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => onChange({ ...data, coverLetter: { ...coverLetter, mainText: e.currentTarget.textContent || "" } })}
                >
                  {coverLetter.mainText}
                </p>
                <p
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => onChange({ ...data, coverLetter: { ...coverLetter, closingText: e.currentTarget.textContent || "" } })}
                >
                  {coverLetter.closingText}
                </p>
              </div>

              {/* Closing */}
              <div className="mt-8">
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="mb-12 text-sm outline-none"
                  onBlur={(e) => onChange({ ...data, coverLetter: { ...coverLetter, closing: e.currentTarget.textContent || "" } })}
                >
                  {coverLetter.closing}
                </div>
                {data.showSignature && (
                  <div>
                    {data.signatureImageUrl ? (
                      <img src={data.signatureImageUrl} alt="Unterschrift" className="h-16 mb-2" />
                    ) : data.signatureName ? (
                      <div
                        className="text-3xl mb-2"
                        style={{ fontFamily: `'${data.signatureFont}', cursive`, color: textColor }}
                      >
                        {data.signatureName}
                      </div>
                    ) : null}
                    <div className="text-sm" style={{ color: textColor }}>
                      {data.personalInfo.firstName} {data.personalInfo.lastName}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CoverLetterA1.displayName = "CoverLetterA1";
