"use client";

import { useState } from "react";
import { X, AlertCircle, Check, EyeOff, AlertTriangle } from "lucide-react";
import { SpellError } from "@/hooks/use-spell-check";
import { CVData } from "@/types/cv";

interface SpellErrorPanelProps {
  errors: SpellError[];
  apiError?: string | null;
  onApplySuggestion: (error: SpellError, suggestion: string) => void;
  onIgnoreWord: (word: string) => void;
  onClose: () => void;
  onClickError?: (error: SpellError) => void;
}

export function SpellErrorPanel({
  errors,
  apiError,
  onApplySuggestion,
  onIgnoreWord,
  onClose,
  onClickError,
}: SpellErrorPanelProps) {
  const [selectedError, setSelectedError] = useState<SpellError | null>(
    errors[0] || null
  );

  // Show API error
  if (apiError) {
    return (
      <div className="fixed top-[124px] right-[50%] z-[9999] bg-slate-900/95 border border-orange-500/30 rounded-lg shadow-xl backdrop-blur-sm p-4 w-72">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-orange-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Fehler
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4 text-foreground/60" />
          </button>
        </div>
        <p className="text-xs text-foreground/60">
          {apiError}
        </p>
      </div>
    );
  }

  if (errors.length === 0) {
    return (
      <div className="fixed top-[124px] right-[50%] z-[9999] bg-slate-900/95 border border-white/10 rounded-lg shadow-xl backdrop-blur-sm p-4 w-72">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-green-400 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Keine Fehler gefunden
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4 text-foreground/60" />
          </button>
        </div>
        <p className="text-xs text-foreground/60">
          Die Rechtschreibprüfung hat keine Fehler gefunden.
        </p>
      </div>
    );
  }

  // Get field display name
  const getFieldName = (fieldId: string): string => {
    const fieldMap: Record<string, string> = {
      "personalInfo.firstName": "Vorname",
      "personalInfo.lastName": "Nachname",
      "personalInfo.title": "Titel",
      "personalInfo.summary": "Zusammenfassung",
      "personalInfo.location": "Ort, PLZ & Straße",
      "coverLetter.recipientCompany": "Empfänger Firma",
      "coverLetter.recipientName": "Empfänger Name",
      "coverLetter.recipientPosition": "Empfänger Position",
      "coverLetter.subject": "Betreff",
      "coverLetter.salutation": "Anrede",
      "coverLetter.introText": "Einleitung",
      "coverLetter.mainText": "Haupttext",
      "coverLetter.closingText": "Schlusstext",
      "coverLetter.closing": "Grußformel",
    };

    if (fieldMap[fieldId]) return fieldMap[fieldId];

    // Handle experience fields
    if (fieldId.startsWith("experience.")) {
      const parts = fieldId.split(".");
      const idx = parseInt(parts[1]) + 1;
      if (parts[2] === "company") return `Berufserfahrung ${idx} - Firma`;
      if (parts[2] === "position") return `Berufserfahrung ${idx} - Position`;
      if (parts[2] === "description")
        return `Berufserfahrung ${idx} - Beschreibung`;
      if (parts[2] === "bulletPoint")
        return `Berufserfahrung ${idx} - Punkt ${parseInt(parts[3]) + 1}`;
    }

    // Handle education fields
    if (fieldId.startsWith("education.")) {
      const parts = fieldId.split(".");
      const idx = parseInt(parts[1]) + 1;
      if (parts[2] === "institution") return `Ausbildung ${idx} - Institution`;
      if (parts[2] === "degree") return `Ausbildung ${idx} - Abschluss`;
      if (parts[2] === "field") return `Ausbildung ${idx} - Fachgebiet`;
    }

    // Handle skill fields
    if (fieldId.startsWith("skill.")) {
      const parts = fieldId.split(".");
      const idx = parseInt(parts[1]) + 1;
      return `Skill ${idx}`;
    }

    return fieldId;
  };

  return (
    <div className="fixed top-[124px] right-[50%] z-[9999] bg-slate-900/95 border border-white/10 rounded-lg shadow-xl backdrop-blur-sm w-80 max-h-96 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <h3 className="text-sm font-medium text-orange-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {errors.length} mögliche{errors.length === 1 ? "r" : ""} Fehler gefunden
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X className="w-4 h-4 text-foreground/60" />
        </button>
      </div>

      {/* Error list */}
      <div className="flex-1 overflow-y-auto">
        {errors.map((error, index) => (
          <div
            key={`${error.fieldId}-${error.offset}-${index}`}
            className={`p-3 border-b border-white/5 cursor-pointer transition-colors ${
              selectedError === error
                ? "bg-red-500/10"
                : "hover:bg-white/5"
            }`}
            onClick={() => {
              setSelectedError(error);
              onClickError?.(error);
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-400 font-medium text-sm bg-red-500/20 px-2 py-0.5 rounded">
                    {error.word}
                  </span>
                </div>
                <p className="text-xs text-foreground/60 truncate">
                  {getFieldName(error.fieldId)}
                </p>
                <p className="text-xs text-foreground/50 mt-1 line-clamp-2">
                  {error.message}
                </p>
              </div>
            </div>

            {/* Suggestions and actions (shown when selected) */}
            {selectedError === error && (
              <div className="mt-3 space-y-2">
                {error.suggestions.length > 0 && (
                  <>
                    <p className="text-xs text-foreground/60">Vorschläge:</p>
                    <div className="flex flex-wrap gap-1">
                      {error.suggestions.map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            onApplySuggestion(error, suggestion);
                          }}
                          className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div className="mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onIgnoreWord(error.word);
                    }}
                    className="w-full px-2 py-1 text-xs bg-white/5 text-foreground/60 rounded hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
                  >
                    <EyeOff className="w-3 h-3" />
                    Immer ignorieren
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function to apply a suggestion to the CV data
export function applySuggestionToData(
  data: CVData,
  error: SpellError,
  suggestion: string
): CVData {
  const newData = { ...data };
  const fieldId = error.fieldId;

  // Helper to replace the word in a string
  const replaceWord = (text: string): string => {
    const before = text.substring(0, error.offset);
    const after = text.substring(error.offset + error.length);
    return before + suggestion + after;
  };

  // Personal info fields
  if (fieldId === "personalInfo.firstName") {
    newData.personalInfo = { ...newData.personalInfo, firstName: replaceWord(data.personalInfo.firstName) };
  } else if (fieldId === "personalInfo.lastName") {
    newData.personalInfo = { ...newData.personalInfo, lastName: replaceWord(data.personalInfo.lastName) };
  } else if (fieldId === "personalInfo.title") {
    newData.personalInfo = { ...newData.personalInfo, title: replaceWord(data.personalInfo.title) };
  } else if (fieldId === "personalInfo.summary") {
    newData.personalInfo = { ...newData.personalInfo, summary: replaceWord(data.personalInfo.summary) };
  } else if (fieldId === "personalInfo.location") {
    newData.personalInfo = { ...newData.personalInfo, location: replaceWord(data.personalInfo.location) };
  }
  // Experience fields
  else if (fieldId.startsWith("experience.")) {
    const parts = fieldId.split(".");
    const expIndex = parseInt(parts[1]);
    const field = parts[2];

    newData.experiences = [...data.experiences];
    const exp = { ...newData.experiences[expIndex] };

    if (field === "company") {
      exp.company = replaceWord(exp.company);
    } else if (field === "position") {
      exp.position = replaceWord(exp.position);
    } else if (field === "description") {
      exp.description = replaceWord(exp.description);
    } else if (field === "bulletPoint") {
      const bpIndex = parseInt(parts[3]);
      exp.bulletPoints = [...exp.bulletPoints];
      exp.bulletPoints[bpIndex] = replaceWord(exp.bulletPoints[bpIndex]);
    }

    newData.experiences[expIndex] = exp;
  }
  // Education fields
  else if (fieldId.startsWith("education.")) {
    const parts = fieldId.split(".");
    const eduIndex = parseInt(parts[1]);
    const field = parts[2];

    newData.education = [...data.education];
    const edu = { ...newData.education[eduIndex] };

    if (field === "institution") {
      edu.institution = replaceWord(edu.institution);
    } else if (field === "degree") {
      edu.degree = replaceWord(edu.degree);
    } else if (field === "field") {
      edu.field = replaceWord(edu.field);
    }

    newData.education[eduIndex] = edu;
  }
  // Skill fields
  else if (fieldId.startsWith("skill.")) {
    const parts = fieldId.split(".");
    const skillIndex = parseInt(parts[1]);

    newData.skills = [...data.skills];
    newData.skills[skillIndex] = { ...newData.skills[skillIndex], name: replaceWord(data.skills[skillIndex].name) };
  }
  // Cover letter fields
  else if (fieldId.startsWith("coverLetter.")) {
    const field = fieldId.split(".")[1] as keyof typeof data.coverLetter;
    newData.coverLetter = { ...data.coverLetter, [field]: replaceWord(data.coverLetter[field] || "") };
  }

  return newData;
}
