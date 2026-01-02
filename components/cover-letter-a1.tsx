"use client";

import { useRef } from "react";
import { CVData } from "@/types/cv";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CoverLetterA1Props {
  data: CVData;
  onChange: (data: CVData) => void;
}

export function CoverLetterA1({ data, onChange }: CoverLetterA1Props) {
  const previewRef = useRef<HTMLDivElement>(null);

  const exportToPDF = async () => {
    if (!previewRef.current) return;

    const element = previewRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#0f172a",
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
    pdf.save(`Anschreiben_${data.personalInfo.lastName}.pdf`);
  };

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
        <div className="flex justify-end mb-4">
          <Button
            onClick={exportToPDF}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF Exportieren
          </Button>
        </div>

        <div
          className="mx-auto shadow-2xl"
          style={{ width: "210mm", minHeight: "297mm", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)" }}
        >
          <div ref={previewRef} className="p-12" style={{ fontFamily: data.fontFamily || "Arial", color: "#e2e8f0" }}>
            {/* Header */}
            <div className="mb-12 pb-6 border-b border-purple-500/30">
              <h1 className="text-4xl font-bold mb-2" style={{ background: "linear-gradient(135deg, #a78bfa 0%, #c084fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {data.personalInfo.firstName} {data.personalInfo.lastName}
              </h1>
              <p className="text-lg text-purple-300">{data.personalInfo.title}</p>
              <div className="flex gap-4 mt-4 text-sm text-gray-400">
                <div><i className="fa-solid fa-envelope mr-2"></i>{data.personalInfo.email}</div>
                <div><i className="fa-solid fa-phone mr-2"></i>{data.personalInfo.phone}</div>
                <div><i className="fa-solid fa-location-dot mr-2"></i>{data.personalInfo.location}</div>
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
                className="text-xl font-bold text-purple-300 outline-none"
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
                      className="text-3xl mb-2 text-purple-300"
                      style={{ fontFamily: `'${data.signatureFont}', cursive` }}
                    >
                      {data.signatureName}
                    </div>
                  ) : null}
                  <div className="text-sm">
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
