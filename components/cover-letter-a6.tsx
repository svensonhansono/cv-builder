"use client";

import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import { CVData } from "@/types/cv";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-context";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CoverLetterA6Props {
  data: CVData;
  onChange: (data: CVData) => void;
  setIsGenerating?: (generating: boolean) => void;
}

export interface CoverLetterHandle {
  handleDownload: () => Promise<void>;
}

export const CoverLetterA6 = forwardRef<CoverLetterHandle, CoverLetterA6Props>(
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

    const updateCoverLetter = (field: string, value: string) => {
      onChange({
        ...data,
        coverLetter: { ...data.coverLetter, [field]: value },
      });
    };

    return (
      <div className="h-full overflow-y-auto bg-slate-900/30">
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
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

          {/* Preview Container */}
          <div className="bg-white mx-auto shadow-2xl" style={{ width: "210mm", minHeight: "297mm" }}>
            <div ref={previewRef} className="flex" style={{ fontFamily: data.fontFamily || "Montserrat", minHeight: "297mm" }}>

              {/* Left Sidebar - Teal */}
              <div className="w-2/5 p-12 text-white" style={{ backgroundColor: "#14b8a6" }}>
                {/* Photo */}
                {data.personalInfo.photoUrl && (
                  <div className="mb-8">
                    <img
                      src={data.personalInfo.photoUrl}
                      alt="Profile"
                      className="rounded-lg"
                      style={{ maxWidth: "200px", border: "4px solid white" }}
                    />
                  </div>
                )}

                {/* Name */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-2">
                    {data.personalInfo.firstName}
                  </h1>
                  <h1 className="text-3xl font-bold mb-4">
                    {data.personalInfo.lastName}
                  </h1>
                </div>

                {/* Contact */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-white">KONTAKT</h2>
                  <div className="space-y-2 text-sm">
                    <div>{data.personalInfo.email}</div>
                    <div>{data.personalInfo.phone}</div>
                    <div>{data.personalInfo.location}</div>
                  </div>
                </div>
              </div>

              {/* Right Content */}
              <div className="flex-1 p-12" style={{ color: "#1f2937" }}>
                {/* Date */}
                <div className="text-right mb-8 text-sm" style={{ color: "#6b7280" }}>
                  {data.personalInfo.location}, {new Date().toLocaleDateString("de-DE")}
                </div>

                {/* Recipient */}
                <div className="mb-8 text-sm">
                  <div
                    className="font-semibold outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateCoverLetter("recipientCompany", e.currentTarget.textContent || "")}
                  >
                    {data.coverLetter?.recipientCompany || "Firma GmbH"}
                  </div>
                  <div
                    className="outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateCoverLetter("recipientName", e.currentTarget.textContent || "")}
                  >
                    {data.coverLetter?.recipientName || "Ansprechpartner"}
                  </div>
                  <div
                    className="outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateCoverLetter("recipientPosition", e.currentTarget.textContent || "")}
                  >
                    {data.coverLetter?.recipientPosition || ""}
                  </div>
                  <div
                    className="outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateCoverLetter("recipientStreet", e.currentTarget.textContent || "")}
                  >
                    {data.coverLetter?.recipientStreet || ""}
                  </div>
                  <div
                    className="outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateCoverLetter("recipientCity", e.currentTarget.textContent || "")}
                  >
                    {data.coverLetter?.recipientCity || ""}
                  </div>
                </div>

                {/* Subject */}
                <div className="mb-6">
                  <h2
                    className="font-bold text-xl outline-none"
                    style={{ color: "#14b8a6" }}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateCoverLetter("subject", e.currentTarget.textContent || "")}
                  >
                    {data.coverLetter?.subject || "Bewerbung"}
                  </h2>
                </div>

                {/* Salutation */}
                <div className="mb-4 text-sm">
                  <span
                    className="outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateCoverLetter("salutation", e.currentTarget.textContent || "")}
                  >
                    {data.coverLetter?.salutation || "Sehr geehrte Damen und Herren"}
                  </span>,
                </div>

                {/* Content */}
                <div className="space-y-4 mb-6 text-sm" style={{ textAlign: "justify", lineHeight: "1.6" }}>
                  <p
                    className="outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateCoverLetter("introText", e.currentTarget.textContent || "")}
                  >
                    {data.coverLetter?.introText || ""}
                  </p>
                  <p
                    className="outline-none"
                    style={{ whiteSpace: "pre-wrap" }}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateCoverLetter("mainText", e.currentTarget.textContent || "")}
                  >
                    {data.coverLetter?.mainText || ""}
                  </p>
                  <p
                    className="outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateCoverLetter("closingText", e.currentTarget.textContent || "")}
                  >
                    {data.coverLetter?.closingText || ""}
                  </p>
                </div>

                {/* Closing */}
                <div className="mt-8">
                  <div
                    className="mb-12 text-sm outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateCoverLetter("closing", e.currentTarget.textContent || "")}
                  >
                    {data.coverLetter?.closing || "Mit freundlichen Grüßen"}
                  </div>

                  {data.showSignature && data.signatureImageUrl && (
                    <img src={data.signatureImageUrl} alt="Signature" className="h-16 mb-4" />
                  )}

                  <div className="font-semibold text-sm" style={{ borderTop: "2px solid #14b8a6", paddingTop: "8px", display: "inline-block" }}>
                    {data.personalInfo.firstName} {data.personalInfo.lastName}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CoverLetterA6.displayName = "CoverLetterA6";
