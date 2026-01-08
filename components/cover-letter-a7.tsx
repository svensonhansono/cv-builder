"use client";

import { useRef, useState } from "react";
import { CVData } from "@/types/cv";
import { Download, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-context";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CoverLetterA7Props {
  data: CVData;
  onChange: (data: CVData) => void;
}

export function CoverLetterA7({ data, onChange }: CoverLetterA7Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [showUpgradeMessage, setShowUpgradeMessage] = useState(false);
  const { isPremium } = useAuth();

  const exportToPDF = async () => {
    if (!previewRef.current) return;

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
    pdf.save(`Anschreiben_${data.personalInfo.lastName}_Elegant.pdf`);
  };

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

        {/* Export Button */}
        <div className="flex justify-end mb-4">
          <Button
            onClick={exportToPDF}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF Exportieren
          </Button>
        </div>

        {/* Preview Container */}
        <div className="bg-white mx-auto shadow-2xl" style={{ width: "210mm", minHeight: "297mm" }}>
          <div ref={previewRef} className="p-16" style={{ fontFamily: data.fontFamily || "Arial", color: "#1e293b" }}>

            {/* Header with Blue Accent */}
            <div className="text-center mb-12 pb-8" style={{ borderBottom: "4px solid #1e40af" }}>
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
                {data.personalInfo.firstName} {data.personalInfo.lastName}
              </h1>
              <div className="flex justify-center gap-8 text-sm" style={{ color: "#475569" }}>
                <span>{data.personalInfo.email}</span>
                <span>•</span>
                <span>{data.personalInfo.phone}</span>
                <span>•</span>
                <span>{data.personalInfo.location}</span>
              </div>
            </div>

            {/* Recipient */}
            <div className="mb-8" style={{ color: "#1e293b" }}>
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

            {/* Date & Location */}
            <div className="text-right mb-8" style={{ color: "#64748b" }}>
              {data.personalInfo.location}, {new Date().toLocaleDateString("de-DE")}
            </div>

            {/* Subject */}
            <div className="mb-6">
              <h2 className="font-bold text-2xl flex items-center gap-3" style={{ color: "#1e40af" }}>
                <div style={{ width: "40px", height: "4px", backgroundColor: "#1e40af" }}></div>
                <span
                  className="outline-none"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => updateCoverLetter("subject", e.currentTarget.textContent || "")}
                >
                  {data.coverLetter?.subject || "Bewerbung"}
                </span>
              </h2>
            </div>

            {/* Salutation */}
            <div className="mb-4">
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
            <div className="space-y-4 mb-6" style={{ textAlign: "justify", lineHeight: "1.7" }}>
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
            <div className="mt-12">
              <div
                className="mb-16 outline-none"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateCoverLetter("closing", e.currentTarget.textContent || "")}
              >
                {data.coverLetter?.closing || "Mit freundlichen Grüßen"}
              </div>

              {data.showSignature && data.signatureImageUrl && (
                <img src={data.signatureImageUrl} alt="Signature" className="h-16 mb-4" />
              )}

              <div>
                <div style={{ width: "200px", height: "3px", backgroundColor: "#1e40af", marginBottom: "8px" }}></div>
                <div className="font-bold" style={{ color: "#1e40af" }}>
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
