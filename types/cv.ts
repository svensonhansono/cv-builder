export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  title: string;
  summary: string;
  photoUrl: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string; // kept for backward compatibility
  bulletPoints?: string[]; // new field for bullet points
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  current: boolean;
}

export interface Skill {
  id: string;
  name: string;
  level: number; // 1-5
}

export interface CVData {
  personalInfo: PersonalInfo;
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
  sectionTitles?: {
    experience: string;
    education: string;
    skills: string;
  };
  spacerBeforeExperience?: string;
  spacerBeforeEducation?: string;
  spacerBeforeSkills?: string;
  fontFamily?: string;
  signatureLocation?: string; // Ort für die Unterschrift
  signatureDate?: string; // Datum für die Unterschrift
  signatureName?: string; // Name für die Unterschrift
  signatureFont?: string; // Schriftart für die Unterschrift
}
