"use client";

import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import { CVData } from "@/types/cv";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-context";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CoverLetterA5Props {
  data: CVData;
  onChange: (data: CVData) => void;
  setIsGenerating?: (generating: boolean) => void;
}

export interface CoverLetterHandle {
  handleDownload: () => Promise<void>;
}

export const CoverLetterA5 = forwardRef<CoverLetterHandle, CoverLetterA5Props>(
  ({ data, onChange, setIsGenerating }, ref) => {
    const previewRef = useRef<HTMLDivElement>(null);
    const [showUpgradeMessage, setShowUpgradeMessage] = useState(false);
    const { isPremium } = useAuth();

    const handleDownload = async () => {
      if (!previewRef.current) return;
      setIsGenerating?.(true);

      try {
        if (!isPremium()) {
          setShowUpgradeMessage(true);
          return;
        }

        const element = previewRef.current;
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
        pdf.save(`Anschreiben_${data.personalInfo.lastName}_Modern.pdf`);
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

          <div
            className="mx-auto shadow-2xl bg-white"
            style={{ width: "210mm", minHeight: "297mm" }}
          >
            <div ref={previewRef} className="flex">
              {/* Left Sidebar - Gray - Contact */}
              <div className="w-[60mm] bg-gray-200 p-8" style={{ fontFamily: data.fontFamily || "Montserrat" }}>
                <div className="mb-8">
                  <h2 className="text-sm font-bold mb-4 uppercase tracking-wide" style={{ color: "#2d3748" }}>
                    Absender
                  </h2>
                  <div className="text-xs space-y-2" style={{ color: "#4a5568" }}>
                    <div className="font-bold">{data.personalInfo.firstName} {data.personalInfo.lastName}</div>
                    <div>{data.personalInfo.location}</div>
                    <div>{data.personalInfo.phone}</div>
                    <div>{data.personalInfo.email}</div>
                  </div>
                </div>
              </div>

              {/* Right Content - White */}
              <div className="flex-1 p-12" style={{ fontFamily: data.fontFamily || "Montserrat", color: "#2d3748" }}>
                {/* Recipient */}
                <div className="mb-12 text-sm">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="font-bold outline-none"
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
                <div className="text-right mb-12 text-sm" style={{ color: "#718096" }}>
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
                    className="text-xl font-bold uppercase tracking-wide outline-none"
                    style={{ color: "#2d3748" }}
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
                <div className="space-y-4 text-sm leading-relaxed" style={{ color: "#4a5568" }}>
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
                          style={{ fontFamily: `'${data.signatureFont}', cursive`, color: "#4a5568" }}
                        >
                          {data.signatureName}
                        </div>
                      ) : null}
                      <div className="text-sm" style={{ color: "#2d3748" }}>
                        {data.personalInfo.firstName} {data.personalInfo.lastName}
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
  }
);

CoverLetterA5.displayName = "CoverLetterA5";
