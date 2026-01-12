"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { CVData, Experience, Education, Skill } from "@/types/cv";
import { Plus, Trash2, User, Briefcase, GraduationCap, Code, Upload, Image as ImageIcon, ChevronDown, PenTool } from "lucide-react";

interface CVFormProps {
  data: CVData;
  onChange: (data: CVData) => void;
}

export function CVForm({ data, onChange }: CVFormProps) {
  const [openSections, setOpenSections] = useState({
    personal: true,
    experience: false,
    education: false,
    skills: false,
    signature: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  const updatePersonalInfo = (field: string, value: string) => {
    onChange({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value },
    });
  };

  const updateSectionTitle = (section: "experience" | "education" | "skills", value: string) => {
    onChange({
      ...data,
      sectionTitles: {
        experience: data.sectionTitles?.experience || "Berufserfahrung",
        education: data.sectionTitles?.education || "Ausbildung",
        skills: data.sectionTitles?.skills || "Skills",
        [section]: value
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert("Bild ist zu groß! Bitte wähle ein Bild unter 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Compress image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Max size 400x400
          let width = img.width;
          let height = img.height;
          const maxSize = 400;

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

          // Convert to JPEG with quality 0.7
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
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
      // Check file size (max 1MB for signature)
      if (file.size > 1 * 1024 * 1024) {
        alert("Bild ist zu groß! Bitte wähle ein Bild unter 1MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Compress image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Max width 600px (reasonable for signature)
          let width = img.width;
          let height = img.height;
          const maxWidth = 600;

          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to PNG with transparent background support
          const compressedDataUrl = canvas.toDataURL('image/png', 0.8);
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
      bulletPoints: ["", ""], // minimum 2 bullet points
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
    onChange({
      ...data,
      experiences: data.experiences.filter((exp) => exp.id !== id),
    });
  };

  const addBulletPoint = (expId: string) => {
    onChange({
      ...data,
      experiences: data.experiences.map((exp) =>
        exp.id === expId
          ? { ...exp, bulletPoints: [...(exp.bulletPoints || []), "", ""] }
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
    onChange({
      ...data,
      education: data.education.filter((edu) => edu.id !== id),
    });
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
    onChange({
      ...data,
      skills: data.skills.filter((skill) => skill.id !== id),
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Personal Information */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass rounded-lg sm:rounded-xl overflow-visible"
      >
        <button
          onClick={() => toggleSection("personal")}
          className="w-full flex items-center justify-between p-4 sm:p-5 lg:p-6 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            <h2 className="text-lg sm:text-xl font-bold gradient-text">Persönliche Daten</h2>
          </div>
          <motion.div
            animate={{ rotate: openSections.personal ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="w-5 h-5 text-purple-400" />
          </motion.div>
        </button>

        <AnimatePresence>
          {openSections.personal && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-visible"
            >
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6 space-y-3 sm:space-y-4 overflow-visible">
                {/* Vorname & Nachname */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Vorname</Label>
                    <Input
                      id="firstName"
                      value={data.personalInfo.firstName}
                      onChange={(e) => updatePersonalInfo("firstName", e.target.value)}
                      placeholder="Max"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nachname</Label>
                    <Input
                      id="lastName"
                      value={data.personalInfo.lastName}
                      onChange={(e) => updatePersonalInfo("lastName", e.target.value)}
                      placeholder="Mustermann"
                    />
                  </div>
                </div>

                {/* Email & Telefon */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={data.personalInfo.email}
                      onChange={(e) => updatePersonalInfo("email", e.target.value)}
                      placeholder="max@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={data.personalInfo.phone}
                      onChange={(e) => updatePersonalInfo("phone", e.target.value)}
                      placeholder="+49 123 456789"
                    />
                  </div>
                </div>

                {/* Ort, PLZ & Straße */}
                <div className="space-y-2">
                  <Label htmlFor="location">Ort, PLZ & Straße</Label>
                  <Input
                    id="location"
                    value={data.personalInfo.location}
                    onChange={(e) => updatePersonalInfo("location", e.target.value)}
                    placeholder="Berlin, 10176, Musterstraße 18"
                  />
                </div>

                {/* Berufstitel */}
                <div className="space-y-2">
                  <Label htmlFor="title">Berufstitel</Label>
                  <Input
                    id="title"
                    value={data.personalInfo.title}
                    onChange={(e) => updatePersonalInfo("title", e.target.value)}
                    placeholder="Full-Stack Developer"
                  />
                </div>

                {/* Zusätzliche persönliche Daten (für V2/V3) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Geburtsdatum */}
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Geburtsdatum</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={data.personalInfo.birthDate || ""}
                      onChange={(e) => updatePersonalInfo("birthDate", e.target.value)}
                    />
                  </div>

                  {/* Geburtsort */}
                  <div className="space-y-2">
                    <Label htmlFor="birthPlace">Geburtsort</Label>
                    <Input
                      id="birthPlace"
                      value={data.personalInfo.birthPlace || ""}
                      onChange={(e) => updatePersonalInfo("birthPlace", e.target.value)}
                      placeholder="Berlin"
                    />
                  </div>

                  {/* Nationalität */}
                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nationalität</Label>
                    <Input
                      id="nationality"
                      value={data.personalInfo.nationality || ""}
                      onChange={(e) => updatePersonalInfo("nationality", e.target.value)}
                      placeholder="deutsch"
                    />
                  </div>

                  {/* Familienstand */}
                  <div className="space-y-2">
                    <Label htmlFor="maritalStatus">Familienstand</Label>
                    <Input
                      id="maritalStatus"
                      value={data.personalInfo.maritalStatus || ""}
                      onChange={(e) => updatePersonalInfo("maritalStatus", e.target.value)}
                      placeholder="ledig"
                    />
                  </div>
                </div>

                {/* Photo Upload & Schriftart in einer Reihe */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Photo Upload */}
                  <div className="space-y-2">
                    <Label>Profilbild</Label>
                    <div className="flex gap-3 items-start">
                      {/* Upload/URL Input */}
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <label className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                              id="photo-upload"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full cursor-pointer"
                              onClick={() => document.getElementById("photo-upload")?.click()}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Hochladen
                            </Button>
                          </label>
                        </div>
                        <div className="relative">
                          <Input
                            placeholder="Oder Bild-URL..."
                            value={data.personalInfo.photoUrl && data.personalInfo.photoUrl.startsWith("data:") ? "" : (data.personalInfo.photoUrl || "")}
                            onChange={(e) => updatePersonalInfo("photoUrl", e.target.value)}
                          />
                          <ImageIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>

                      {/* Preview */}
                      {data.personalInfo.photoUrl && (
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-purple-500/30 flex-shrink-0">
                          <img
                            src={data.personalInfo.photoUrl}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => updatePersonalInfo("photoUrl", "")}
                            className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Schriftart-Auswahl */}
                  <div className="space-y-2">
                    <Label htmlFor="fontFamily">Schriftart</Label>
                    <select
                      id="fontFamily"
                      value={data.fontFamily || "Montserrat"}
                      onChange={(e) => onChange({ ...data, fontFamily: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-black [&>option]:bg-white [&>optgroup]:text-black [&>optgroup]:bg-white"
                    >
                      <optgroup label="Serifenlose Schriften">
                        <option value="Montserrat">Montserrat</option>
                        <option value="Source Sans Pro">Source Sans Pro</option>
                        <option value="Arial">Arial</option>
                        <option value="Calibri">Calibri</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Helvetica">Helvetica</option>
                      </optgroup>
                      <optgroup label="Schriften mit Serifen">
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Century">Century</option>
                      </optgroup>
                    </select>
                  </div>
                </div>

                {/* Zusammenklappen-Button unten rechts */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => toggleSection("personal")}
                    className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <span>Einklappen</span>
                    <motion.div
                      animate={{ rotate: openSections.personal ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Experience */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass rounded-lg sm:rounded-xl overflow-visible"
      >
        <div className="p-4 sm:p-5 lg:p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
              <h2
                className="text-lg sm:text-xl font-bold gradient-text outline-none"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateSectionTitle("experience", e.currentTarget.textContent || "Berufserfahrung")}
              >
                {data.sectionTitles?.experience || "Berufserfahrung"}
              </h2>
            </div>
            {/* Spacer Control - inline */}
            <div className="flex items-center gap-2 flex-1 max-w-[320px]">
              <span className="text-xs text-foreground/50 whitespace-nowrap">Abstand zur vorderen Zeile:</span>
              <input
                type="range"
                min="0"
                max="10"
                value={Math.max(0, ((data.spacerBeforeExperience || "").match(/\n/g) || []).length)}
                onChange={(e) => {
                  const lines = parseInt(e.target.value);
                  onChange({ ...data, spacerBeforeExperience: lines > 0 ? '\n'.repeat(lines) : '' });
                }}
                className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                title="Abstand zur oberen Zeile"
              />
              <span className="text-xs text-foreground/60 w-4 text-right">
                {Math.max(0, ((data.spacerBeforeExperience || "").match(/\n/g) || []).length)}
              </span>
            </div>
            <button
              onClick={() => toggleSection("experience")}
              className="hover:bg-white/5 transition-colors p-2 rounded"
            >
              <motion.div
                animate={{ rotate: openSections.experience ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="w-5 h-5 text-purple-400" />
              </motion.div>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {openSections.experience && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-visible"
            >
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6 space-y-3 sm:space-y-4 overflow-visible">
                <div className="flex justify-end">
                  <Button onClick={addExperience} variant="outline" size="sm">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Hinzufügen</span>
                    <span className="sm:hidden">+</span>
                  </Button>
                </div>

                <div className="space-y-3 sm:space-y-4">
          {data.experiences.map((exp, index) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="glass-hover rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3 border border-white/5 overflow-visible"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-xs sm:text-sm font-semibold text-purple-300">
                  Erfahrung #{index + 1}
                </h3>
                <Button
                  onClick={() => removeExperience(exp.id)}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                </Button>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {/* Unternehmen & Position in 2 Spalten */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <Label>Unternehmen</Label>
                    <Input
                      value={exp.company}
                      onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
                      placeholder="Firma GmbH"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Position</Label>
                    <Input
                      value={exp.position}
                      onChange={(e) => updateExperience(exp.id, "position", e.target.value)}
                      placeholder="Senior Developer"
                    />
                  </div>
                </div>

                {/* Von & Bis in 2 Spalten */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <Label>Von</Label>
                    <DatePicker
                      value={exp.startDate}
                      onChange={(date) => updateExperience(exp.id, "startDate", date)}
                      placeholder="TT.MM.JJJJ"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Bis</Label>
                    <DatePicker
                      value={exp.endDate}
                      onChange={(date) => updateExperience(exp.id, "endDate", date)}
                      disabled={exp.current}
                      placeholder="TT.MM.JJJJ"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`current-${exp.id}`}
                    checked={exp.current}
                    onChange={(e) => updateExperience(exp.id, "current", e.target.checked)}
                    className="rounded border-white/20 bg-white/5"
                  />
                  <Label htmlFor={`current-${exp.id}`}>Aktuelle Position</Label>
                </div>

                {/* Stichpunkte */}
                <div className="space-y-2">
                  <Label>Aufgaben & Erfolge (Stichpunkte)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(exp.bulletPoints || ["", ""]).map((bullet, idx) => (
                      <div key={idx} className="flex gap-2">
                        <div className="flex-shrink-0 w-6 pt-2 flex items-start justify-center text-purple-400">
                          •
                        </div>
                        <Textarea
                          value={bullet}
                          onChange={(e) => updateBulletPoint(exp.id, idx, e.target.value)}
                          placeholder={`Stichpunkt ${idx + 1} - Enter für neue Zeile`}
                          className="flex-1 min-h-[60px] resize-none"
                          rows={2}
                        />
                        {(exp.bulletPoints || []).length > 2 && (
                          <Button
                            onClick={() => removeBulletPoint(exp.id, idx)}
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => addBulletPoint(exp.id)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Zeile hinzufügen
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
                </div>

                {/* Zusammenklappen-Button unten rechts */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => toggleSection("experience")}
                    className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <span>Einklappen</span>
                    <motion.div
                      animate={{ rotate: openSections.experience ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Education */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass rounded-lg sm:rounded-xl overflow-visible"
      >
        <div className="p-4 sm:p-5 lg:p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
              <h2
                className="text-lg sm:text-xl font-bold gradient-text outline-none"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateSectionTitle("education", e.currentTarget.textContent || "Ausbildung")}
              >
                {data.sectionTitles?.education || "Ausbildung"}
              </h2>
            </div>
            {/* Spacer Control - inline */}
            <div className="flex items-center gap-2 flex-1 max-w-[320px]">
              <span className="text-xs text-foreground/50 whitespace-nowrap">Abstand zur vorderen Zeile:</span>
              <input
                type="range"
                min="0"
                max="10"
                value={Math.max(0, ((data.spacerBeforeEducation || "").match(/\n/g) || []).length)}
                onChange={(e) => {
                  const lines = parseInt(e.target.value);
                  onChange({ ...data, spacerBeforeEducation: lines > 0 ? '\n'.repeat(lines) : '' });
                }}
                className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                title="Abstand zur oberen Zeile"
              />
              <span className="text-xs text-foreground/60 w-4 text-right">
                {Math.max(0, ((data.spacerBeforeEducation || "").match(/\n/g) || []).length)}
              </span>
            </div>
            <button
              onClick={() => toggleSection("education")}
              className="hover:bg-white/5 transition-colors p-2 rounded"
            >
              <motion.div
                animate={{ rotate: openSections.education ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="w-5 h-5 text-purple-400" />
              </motion.div>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {openSections.education && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-visible"
            >
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6 space-y-3 sm:space-y-4 overflow-visible">
                <div className="flex justify-end">
                  <Button onClick={addEducation} variant="outline" size="sm">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Hinzufügen</span>
                    <span className="sm:hidden">+</span>
                  </Button>
                </div>

                <div className="space-y-3 sm:space-y-4">
          {data.education.map((edu, index) => (
            <motion.div
              key={edu.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="glass-hover rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3 border border-white/5 overflow-visible"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-xs sm:text-sm font-semibold text-purple-300">
                  Ausbildung #{index + 1}
                </h3>
                <Button
                  onClick={() => removeEducation(edu.id)}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                </Button>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <div className="space-y-1">
                  <Label>Institution</Label>
                  <Input
                    value={edu.institution}
                    onChange={(e) => updateEducation(edu.id, "institution", e.target.value)}
                    placeholder="Universität"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <Label>Abschluss</Label>
                    <Input
                      value={edu.degree}
                      onChange={(e) => updateEducation(edu.id, "degree", e.target.value)}
                      placeholder="Bachelor"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Fachrichtung</Label>
                    <Input
                      value={edu.field}
                      onChange={(e) => updateEducation(edu.id, "field", e.target.value)}
                      placeholder="Informatik"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <Label>Von</Label>
                    <DatePicker
                      value={edu.startDate}
                      onChange={(date) => updateEducation(edu.id, "startDate", date)}
                      placeholder="TT.MM.JJJJ"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Bis</Label>
                    <DatePicker
                      value={edu.endDate}
                      onChange={(date) => updateEducation(edu.id, "endDate", date)}
                      disabled={edu.current}
                      placeholder="TT.MM.JJJJ"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`current-edu-${edu.id}`}
                    checked={edu.current}
                    onChange={(e) => updateEducation(edu.id, "current", e.target.checked)}
                    className="rounded border-white/20 bg-white/5"
                  />
                  <Label htmlFor={`current-edu-${edu.id}`}>Aktuell</Label>
                </div>
              </div>
            </motion.div>
          ))}
                </div>

                {/* Zusammenklappen-Button unten rechts */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => toggleSection("education")}
                    className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <span>Einklappen</span>
                    <motion.div
                      animate={{ rotate: openSections.education ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Skills */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="glass rounded-lg sm:rounded-xl overflow-visible"
      >
        <div className="p-4 sm:p-5 lg:p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
              <h2
                className="text-lg sm:text-xl font-bold gradient-text outline-none"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateSectionTitle("skills", e.currentTarget.textContent || "Skills")}
              >
                {data.sectionTitles?.skills || "Skills"}
              </h2>
            </div>
            {/* Spacer Control - inline */}
            <div className="flex items-center gap-2 flex-1 max-w-[320px]">
              <span className="text-xs text-foreground/50 whitespace-nowrap">Abstand zur vorderen Zeile:</span>
              <input
                type="range"
                min="0"
                max="10"
                value={Math.max(0, ((data.spacerBeforeSkills || "").match(/\n/g) || []).length)}
                onChange={(e) => {
                  const lines = parseInt(e.target.value);
                  onChange({ ...data, spacerBeforeSkills: lines > 0 ? '\n'.repeat(lines) : '' });
                }}
                className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                title="Abstand zur oberen Zeile"
              />
              <span className="text-xs text-foreground/60 w-4 text-right">
                {Math.max(0, ((data.spacerBeforeSkills || "").match(/\n/g) || []).length)}
              </span>
            </div>
            <button
              onClick={() => toggleSection("skills")}
              className="hover:bg-white/5 transition-colors p-2 rounded"
            >
              <motion.div
                animate={{ rotate: openSections.skills ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="w-5 h-5 text-purple-400" />
              </motion.div>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {openSections.skills && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-visible"
            >
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6 space-y-3 sm:space-y-4 overflow-visible">
                <div className="flex justify-end">
                  <Button onClick={addSkill} variant="outline" size="sm">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Hinzufügen</span>
                    <span className="sm:hidden">+</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {data.skills.map((skill, index) => (
            <motion.div
              key={skill.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="glass-hover rounded-lg p-2.5 sm:p-3 space-y-1.5 sm:space-y-2 border border-white/5"
            >
              <div className="flex justify-between items-start">
                <Label className="text-xs">Skill</Label>
                <Button
                  onClick={() => removeSkill(skill.id)}
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                >
                  <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400" />
                </Button>
              </div>

              <Input
                value={skill.name}
                onChange={(e) => updateSkill(skill.id, "name", e.target.value)}
                placeholder="JavaScript"
                className="text-sm"
              />

              <div className="space-y-1">
                <Label className="text-xs">Level: {skill.level}/5</Label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={skill.level}
                  onChange={(e) => updateSkill(skill.id, "level", parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </motion.div>
          ))}
                </div>

                {/* Zusammenklappen-Button unten rechts */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => toggleSection("skills")}
                    className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <span>Einklappen</span>
                    <motion.div
                      animate={{ rotate: openSections.skills ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Signature */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="glass rounded-lg sm:rounded-xl overflow-visible"
      >
        <button
          onClick={() => toggleSection("signature")}
          className="w-full flex items-center justify-between p-4 sm:p-5 lg:p-6 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            <h2 className="text-lg sm:text-xl font-bold gradient-text">Unterschrift (DIN 5008)</h2>
          </div>
          <motion.div
            animate={{ rotate: openSections.signature ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="w-5 h-5 text-purple-400" />
          </motion.div>
        </button>

        <AnimatePresence>
          {openSections.signature && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-visible"
            >
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6 space-y-3 sm:space-y-4 overflow-visible">
                {/* Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showSignature"
                      checked={data.showSignature || false}
                      onChange={(e) => onChange({ ...data, showSignature: e.target.checked })}
                      className="rounded border-white/20 bg-white/5"
                    />
                    <Label htmlFor="showSignature" className="text-sm cursor-pointer">
                      Digitale Unterschrift anzeigen
                    </Label>
                  </div>
                </div>

                <p className="text-xs text-foreground/60">
                  Aktiviere dies, wenn du eine digitale Unterschrift in die PDF einfügen möchtest. Deaktiviere es, wenn du später händisch unterschreiben möchtest.
                </p>

                {data.showSignature && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signatureLocation">Ort</Label>
                        <Input
                          id="signatureLocation"
                          value={data.signatureLocation || ""}
                          onChange={(e) => onChange({ ...data, signatureLocation: e.target.value })}
                          placeholder="Berlin"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signatureDate">Datum</Label>
                        <DatePicker
                          value={data.signatureDate || ""}
                          onChange={(date) => onChange({ ...data, signatureDate: date })}
                          placeholder="TT.MM.JJJJ"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Unterschrift-Bild Upload */}
                      <div className="space-y-2">
                        <Label>Unterschrift als Bild (Optional)</Label>
                        <div className="flex gap-3 items-start">
                          {/* Upload Button */}
                          <div className="flex-1 space-y-2">
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
                                className="w-full cursor-pointer"
                                onClick={() => document.getElementById("signature-upload")?.click()}
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                {data.signatureImageUrl ? "Anderes Bild hochladen" : "Unterschrift hochladen"}
                              </Button>
                            </label>
                            <p className="text-xs text-foreground/60">
                              Lade ein Bild deiner Unterschrift hoch
                            </p>
                          </div>

                          {/* Preview */}
                          {data.signatureImageUrl && (
                            <div className="relative w-32 h-16 rounded-lg overflow-hidden border-2 border-purple-500/30 bg-white/5 flex items-center justify-center flex-shrink-0">
                              <img
                                src={data.signatureImageUrl}
                                alt="Signature"
                                className="max-w-full max-h-full object-contain"
                              />
                              <button
                                onClick={() => onChange({ ...data, signatureImageUrl: "" })}
                                className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Text-Unterschrift (nur wenn kein Bild) */}
                      {!data.signatureImageUrl && (
                        <div className="space-y-2">
                          <Label>Unterschrift-Vorschau</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                              <Input
                                id="signatureName"
                                value={data.signatureName || ""}
                                onChange={(e) => onChange({ ...data, signatureName: e.target.value })}
                                placeholder="Name"
                              />
                            </div>

                            <div className="space-y-2">
                              <select
                                id="signatureFont"
                                value={data.signatureFont || "Dancing Script"}
                                onChange={(e) => onChange({ ...data, signatureFont: e.target.value })}
                                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-black [&>option]:bg-white"
                              >
                                <option value="Dancing Script">Dancing Script</option>
                                <option value="Great Vibes">Great Vibes</option>
                                <option value="Pacifico">Pacifico</option>
                                <option value="Satisfy">Satisfy</option>
                                <option value="Allura">Allura</option>
                                <option value="Alex Brush">Alex Brush</option>
                                <option value="Petit Formal Script">Petit Formal Script</option>
                                <option value="Sacramento">Sacramento</option>
                                <option value="Tangerine">Tangerine</option>
                                <option value="Kaushan Script">Kaushan Script</option>
                              </select>
                            </div>
                          </div>
                          {data.signatureName && (
                            <div className="p-3 bg-white/5 rounded-md border border-white/10 text-center">
                              <p className="text-xs text-foreground/60 mb-2">Vorschau:</p>
                              <p
                                className="text-2xl italic text-purple-300"
                                style={{ fontFamily: `'${data.signatureFont || 'Dancing Script'}', cursive` }}
                              >
                                {data.signatureName}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Zusammenklappen-Button unten rechts */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => toggleSection("signature")}
                    className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <span>Einklappen</span>
                    <motion.div
                      animate={{ rotate: openSections.signature ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
  );
}
