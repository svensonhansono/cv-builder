"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CVData, Experience, Education, Skill } from "@/types/cv";
import { Plus, Trash2, Upload, Check } from "lucide-react";

interface CVFormProps {
  data: CVData;
  onChange: (data: CVData) => void;
}

// Wrapper für Input - automatisch zugeklappt wenn ausgefüllt
function SmartInput({ value, filled, placeholder, className, onKeyDown, ...props }: React.ComponentProps<typeof Input> & { filled?: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const isFilled = filled ?? (typeof value === 'string' && value.trim().length > 0);
  const textLength = typeof value === 'string' ? value.length : 0;
  const placeholderOffset = 12 + (textLength * 7);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    onKeyDown?.(e);
  };

  // Auto-collapse wenn Fokus verloren und ausgefüllt
  const handleBlur = () => {
    if (isFilled) {
      setExpanded(false);
    }
  };

  // Ausgefüllt und zugeklappt = kompakte Ansicht
  if (isFilled && !expanded) {
    return (
      <div className={`transition-all duration-300 ${className || ''}`}>
        <div
          className="h-8 px-2 py-1 bg-white/5 border border-green-500/30 rounded-md flex items-center gap-1 cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => setExpanded(true)}
        >
          <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
          <span className="text-xs truncate">{value as string}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative transition-all duration-300 ${className || ''}`}>
      <Input
        value={value}
        {...props}
        placeholder=""
        className={isFilled ? 'pr-8' : ''}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      {!isFilled && placeholder && (
        <span
          className="absolute top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none transition-all duration-100 truncate"
          style={{ left: `${placeholderOffset}px`, maxWidth: `calc(100% - ${placeholderOffset + 12}px)` }}
        >
          {placeholder}
        </span>
      )}
      {isFilled && (
        <Check className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
      )}
    </div>
  );
}

export function CVForm({ data, onChange }: CVFormProps) {
  // Stelle sicher, dass immer mindestens ein Eintrag für jede Kategorie existiert
  useEffect(() => {
    let updated = false;
    let newData = { ...data };

    if (!data.experiences || data.experiences.length === 0) {
      newData.experiences = [{
        id: "default-exp",
        company: "",
        position: "",
        startDate: "",
        endDate: "",
        current: false,
        description: "",
        bulletPoints: [],
      }];
      updated = true;
    }

    if (!data.education || data.education.length === 0) {
      newData.education = [{
        id: "default-edu",
        institution: "",
        degree: "",
        field: "",
        startDate: "",
        endDate: "",
        current: false,
      }];
      updated = true;
    }

    if (!data.skills || data.skills.length === 0) {
      newData.skills = [
        { id: "default-skill-1", name: "", level: 3 },
        { id: "default-skill-2", name: "", level: 3 },
        { id: "default-skill-3", name: "", level: 3 },
      ];
      updated = true;
    }

    if (updated) {
      onChange(newData);
    }
  }, []);

  const updatePersonalInfo = (field: string, value: string) => {
    onChange({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const compressImage = (maxSize: number, quality: number): string => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            let width = img.width;
            let height = img.height;

            if (width > height && width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            } else if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }

            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);

            return canvas.toDataURL('image/jpeg', quality);
          };

          let maxSize = 400;
          let quality = 0.8;
          let compressedDataUrl = compressImage(maxSize, quality);

          while (compressedDataUrl.length > 2 * 1024 * 1024 && quality > 0.1) {
            quality -= 0.1;
            compressedDataUrl = compressImage(maxSize, quality);
          }

          while (compressedDataUrl.length > 2 * 1024 * 1024 && maxSize > 100) {
            maxSize -= 50;
            compressedDataUrl = compressImage(maxSize, quality);
          }

          updatePersonalInfo("photoUrl", compressedDataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const compressImage = (maxWidth: number, quality: number): string => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);

            return canvas.toDataURL('image/png', quality);
          };

          let maxWidth = 600;
          let quality = 0.8;
          let compressedDataUrl = compressImage(maxWidth, quality);

          while (compressedDataUrl.length > 1 * 1024 * 1024 && quality > 0.1) {
            quality -= 0.1;
            compressedDataUrl = compressImage(maxWidth, quality);
          }

          while (compressedDataUrl.length > 1 * 1024 * 1024 && maxWidth > 200) {
            maxWidth -= 50;
            compressedDataUrl = compressImage(maxWidth, quality);
          }

          onChange({ ...data, signatureImageUrl: compressedDataUrl });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: Date.now().toString(),
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
      bulletPoints: [],
    };
    onChange({ ...data, experiences: [...data.experiences, newExp] });
  };

  const updateExperience = (id: string, field: keyof Experience, value: string | boolean) => {
    onChange({
      ...data,
      experiences: data.experiences.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    });
  };

  const removeExperience = (id: string) => {
    if (data.experiences.length > 1) {
      onChange({
        ...data,
        experiences: data.experiences.filter((exp) => exp.id !== id),
      });
    }
  };

  const addBulletPoint = (expId: string) => {
    onChange({
      ...data,
      experiences: data.experiences.map((exp) =>
        exp.id === expId
          ? { ...exp, bulletPoints: [...(exp.bulletPoints || []), ""] }
          : exp
      ),
    });
  };

  const updateBulletPoint = (expId: string, index: number, value: string) => {
    onChange({
      ...data,
      experiences: data.experiences.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              bulletPoints: (exp.bulletPoints || []).map((bp, i) =>
                i === index ? value : bp
              ),
            }
          : exp
      ),
    });
  };

  const removeBulletPoint = (expId: string, index: number) => {
    onChange({
      ...data,
      experiences: data.experiences.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              bulletPoints: (exp.bulletPoints || []).filter((_, i) => i !== index),
            }
          : exp
      ),
    });
  };

  const addEducation = () => {
    const newEdu: Education = {
      id: Date.now().toString(),
      institution: "",
      degree: "",
      field: "",
      startDate: "",
      endDate: "",
      current: false,
    };
    onChange({ ...data, education: [...data.education, newEdu] });
  };

  const updateEducation = (id: string, field: keyof Education, value: string | boolean) => {
    onChange({
      ...data,
      education: data.education.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    });
  };

  const removeEducation = (id: string) => {
    if (data.education.length > 1) {
      onChange({
        ...data,
        education: data.education.filter((edu) => edu.id !== id),
      });
    }
  };

  const addSkill = () => {
    const newSkill: Skill = {
      id: Date.now().toString(),
      name: "",
      level: 3,
    };
    onChange({ ...data, skills: [...data.skills, newSkill] });
  };

  const updateSkill = (id: string, field: keyof Skill, value: string | number) => {
    onChange({
      ...data,
      skills: data.skills.map((skill) =>
        skill.id === id ? { ...skill, [field]: value } : skill
      ),
    });
  };

  const removeSkill = (id: string) => {
    if (data.skills.length > 1) {
      onChange({
        ...data,
        skills: data.skills.filter((skill) => skill.id !== id),
      });
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-3">
      {/* Persönliche Daten - 3 Spalten */}
      <div className="border border-green-500/30 rounded-lg p-3">
        <div className="grid grid-cols-3 gap-2">
        <SmartInput
          value={data.personalInfo.firstName}
          onChange={(e) => updatePersonalInfo("firstName", e.target.value)}
          placeholder="Vorname"
        />
        <SmartInput
          value={data.personalInfo.lastName}
          onChange={(e) => updatePersonalInfo("lastName", e.target.value)}
          placeholder="Nachname"
        />
        <SmartInput
          type="email"
          value={data.personalInfo.email}
          onChange={(e) => updatePersonalInfo("email", e.target.value)}
          placeholder="E-Mail"
        />
        <SmartInput
          value={data.personalInfo.phone}
          onChange={(e) => updatePersonalInfo("phone", e.target.value)}
          placeholder="Telefon"
        />
        <SmartInput
          value={data.personalInfo.location}
          onChange={(e) => updatePersonalInfo("location", e.target.value)}
          placeholder="Adresse"
        />
        <SmartInput
          value={data.personalInfo.title}
          onChange={(e) => updatePersonalInfo("title", e.target.value)}
          placeholder="Berufstitel"
        />
        <SmartInput
          value={data.personalInfo.birthDate || ""}
          onChange={(e) => updatePersonalInfo("birthDate", e.target.value)}
          placeholder="Geburtsdatum"
        />
        <SmartInput
          value={data.personalInfo.birthPlace || ""}
          onChange={(e) => updatePersonalInfo("birthPlace", e.target.value)}
          placeholder="Geburtsort"
        />
        <SmartInput
          value={data.personalInfo.nationality || ""}
          onChange={(e) => updatePersonalInfo("nationality", e.target.value)}
          placeholder="Nationalität"
        />
        <SmartInput
          value={data.personalInfo.maritalStatus || ""}
          onChange={(e) => updatePersonalInfo("maritalStatus", e.target.value)}
          placeholder="Familienstand"
        />
        {/* Foto Upload */}
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="photo-upload"
          />
          <Input
            placeholder=""
            value=""
            readOnly
            onClick={() => document.getElementById("photo-upload")?.click()}
            className={`cursor-pointer ${data.personalInfo.photoUrl ? 'pr-12' : ''}`}
          />
          {data.personalInfo.photoUrl ? (
            <>
              <div className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded overflow-hidden border border-white/20">
                <img src={data.personalInfo.photoUrl} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); updatePersonalInfo("photoUrl", ""); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none flex items-center gap-1">
              <Upload className="w-4 h-4" />
              Foto
            </span>
          )}
        </div>
        {/* Schriftart */}
        <select
          value={data.fontFamily || "Montserrat"}
          onChange={(e) => onChange({ ...data, fontFamily: e.target.value })}
          className="px-3 py-2 bg-white/5 border border-white/20 rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 [&>option]:text-black [&>option]:bg-white h-10"
        >
          <option value="Montserrat">Montserrat</option>
          <option value="Source Sans Pro">Source Sans Pro</option>
          <option value="Arial">Arial</option>
          <option value="Calibri">Calibri</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Georgia">Georgia</option>
        </select>
        </div>
      </div>

      {/* Berufserfahrung - 3 Spalten mit grüner Umrandung */}
      <div className="border border-green-500/30 rounded-lg p-3 space-y-3">
        {(data.experiences || []).map((exp, index) => (
          <div key={exp.id} className="grid grid-cols-3 gap-2 items-start">
            <SmartInput
              value={exp.company}
              onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
              placeholder="Unternehmen"
            />
            <SmartInput
              value={exp.position}
              onChange={(e) => updateExperience(exp.id, "position", e.target.value)}
              placeholder="Position"
            />
            <SmartInput
              value={exp.startDate}
              onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)}
              placeholder="Von"
            />
            <SmartInput
              value={exp.endDate}
              onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)}
              placeholder="Bis"
            />
            <div className="col-span-2 flex items-center gap-2">
              <Button
                onClick={() => addBulletPoint(exp.id)}
                variant="ghost"
                size="sm"
                className="text-xs text-foreground/50"
              >
                <Plus className="w-3 h-3 mr-1" />
                Aufgabe
              </Button>
              {data.experiences.length > 1 && (
                <Button
                  onClick={() => removeExperience(exp.id)}
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              )}
            </div>
            {(exp.bulletPoints || []).map((bullet, idx) => (
              <div key={idx} className="col-span-3 flex gap-2">
                <Textarea
                  value={bullet}
                  onChange={(e) => updateBulletPoint(exp.id, idx, e.target.value)}
                  placeholder={`Aufgabe ${idx + 1}`}
                  className="flex-1 min-h-[40px] resize-none text-sm"
                  rows={1}
                />
                <Button
                  onClick={() => removeBulletPoint(exp.id, idx)}
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </Button>
              </div>
            ))}
            {index === data.experiences.length - 1 && (
              <div className="col-span-3">
                <Button
                  onClick={addExperience}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-foreground/50"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Berufserfahrung
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Ausbildung - 3 Spalten */}
      {(data.education || []).map((edu, index) => (
        <div key={edu.id} className="grid grid-cols-3 gap-2 items-start">
          <SmartInput
            value={edu.institution}
            onChange={(e) => updateEducation(edu.id, "institution", e.target.value)}
            placeholder="Institution"
          />
          <SmartInput
            value={edu.degree}
            onChange={(e) => updateEducation(edu.id, "degree", e.target.value)}
            placeholder="Abschluss"
          />
          <SmartInput
            value={edu.field}
            onChange={(e) => updateEducation(edu.id, "field", e.target.value)}
            placeholder="Fachrichtung"
          />
          <SmartInput
            value={edu.startDate}
            onChange={(e) => updateEducation(edu.id, "startDate", e.target.value)}
            placeholder="Von"
          />
          <SmartInput
            value={edu.endDate}
            onChange={(e) => updateEducation(edu.id, "endDate", e.target.value)}
            placeholder="Bis"
          />
          {data.education.length > 1 && (
            <Button
              onClick={() => removeEducation(edu.id)}
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          )}
          {index === data.education.length - 1 && (
            <div className="col-span-3">
              <Button
                onClick={addEducation}
                variant="ghost"
                size="sm"
                className="text-xs text-foreground/50"
              >
                <Plus className="w-3 h-3 mr-1" />
                Ausbildung
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* Skills - 3 Spalten */}
      <div className="grid grid-cols-3 gap-2">
        {(data.skills || []).map((skill) => (
          <div key={skill.id} className="flex items-center gap-1">
            <div className={`relative transition-all duration-300 flex-1`}>
              <Input
                value={skill.name}
                onChange={(e) => updateSkill(skill.id, "name", e.target.value)}
                placeholder=""
                className={`text-sm h-8 ${skill.name.trim() ? 'pr-6' : ''}`}
              />
              {!skill.name.trim() && (
                <span
                  className="absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none transition-all duration-100"
                  style={{ left: `${12 + skill.name.length * 7}px` }}
                >
                  Skill
                </span>
              )}
              {skill.name.trim() && (
                <Check className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-green-500" />
              )}
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={skill.level}
              onChange={(e) => updateSkill(skill.id, "level", parseInt(e.target.value))}
              className="w-12 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-foreground/60 w-3">{skill.level}</span>
            {data.skills.length > 1 && (
              <button
                onClick={() => removeSkill(skill.id)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        <Button
          onClick={addSkill}
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-foreground/50"
        >
          <Plus className="w-3 h-3 mr-1" />
          Skill
        </Button>
      </div>

      {/* Unterschrift */}
      <div className="grid grid-cols-3 gap-2 items-center">
        <label className="flex items-center gap-2 text-sm h-10">
          <input
            type="checkbox"
            checked={data.showSignature || false}
            onChange={(e) => onChange({ ...data, showSignature: e.target.checked })}
            className="rounded border-white/20 bg-white/5"
          />
          <span className="text-foreground/70 text-xs">Unterschrift</span>
        </label>
      </div>

      {data.showSignature && (
        <div className="grid grid-cols-3 gap-2 items-center">
          <SmartInput
            value={data.signatureLocation || ""}
            onChange={(e) => onChange({ ...data, signatureLocation: e.target.value })}
            placeholder="Ort"
          />
          <SmartInput
            value={data.signatureDate || ""}
            onChange={(e) => onChange({ ...data, signatureDate: e.target.value })}
            placeholder="Datum"
          />
          <label>
            <input
              type="file"
              accept="image/*"
              onChange={handleSignatureUpload}
              className="hidden"
              id="signature-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => document.getElementById("signature-upload")?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Bild
            </Button>
          </label>
          {data.signatureImageUrl ? (
            <div className="col-span-3 flex items-center gap-2">
              <div className="relative h-8 px-2 rounded border border-white/20 bg-white/5 flex items-center">
                <img
                  src={data.signatureImageUrl}
                  alt="Signature"
                  className="max-h-6 object-contain"
                />
                <button
                  onClick={() => onChange({ ...data, signatureImageUrl: "" })}
                  className="ml-2 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <SmartInput
                value={data.signatureName || ""}
                onChange={(e) => onChange({ ...data, signatureName: e.target.value })}
                placeholder="Name"
              />
              <select
                value={data.signatureFont || "Dancing Script"}
                onChange={(e) => onChange({ ...data, signatureFont: e.target.value })}
                className="px-3 py-2 bg-white/5 border border-white/20 rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 [&>option]:text-black [&>option]:bg-white"
              >
                <option value="Dancing Script">Dancing Script</option>
                <option value="Great Vibes">Great Vibes</option>
                <option value="Pacifico">Pacifico</option>
                <option value="Satisfy">Satisfy</option>
              </select>
              <div />
            </>
          )}
        </div>
      )}
    </div>
  );
}
