export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street?: string;
  location: string;
  title: string;
  summary: string;
  photoUrl: string;
  birthDate?: string;
  birthPlace?: string;
  nationality?: string;
  maritalStatus?: string;
}

export interface CVMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  bulletPoints: string[];
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
  level: number;
}

export interface SectionTitles {
  experience: string;
  education: string;
  skills: string;
}

export interface CoverLetter {
  recipientCompany?: string;
  recipientName?: string;
  recipientPosition?: string;
  recipientStreet?: string;
  recipientCity?: string;
  subject?: string;
  salutation?: string;
  introText?: string;
  mainText?: string;
  closingText?: string;
  closing?: string;
}

export interface CVData {
  personalInfo: PersonalInfo;
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
  sectionTitles: SectionTitles;
  spacerBeforeExperience: string;
  spacerBeforeEducation: string;
  spacerBeforeSkills: string;
  fontFamily: string;
  signatureLocation: string;
  signatureDate: string;
  signatureName: string;
  signatureFont: string;
  signatureImageUrl: string;
  showSignature: boolean;
  coverLetter: CoverLetter;
  margins?: CVMargins;
  colorScheme?: 'dark' | 'light'; // dark = white text on dark bg, light = black text on white bg
}

export type SubscriptionTier = "free" | "premium";

export type SubscriptionStatus = "trialing" | "active" | "canceled" | "past_due" | "incomplete";

export interface UserSubscription {
  tier: SubscriptionTier;
  subscriptionId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  autoRenew?: boolean;
  status?: SubscriptionStatus;
  trialStartDate?: string;
  trialEndDate?: string;
  cancelAtPeriodEnd?: boolean;
  paymentMethodAttached?: boolean;
}

// Job-related types for Arbeitsagentur integration
export interface JobLocation {
  ort?: string;
  plz?: string;
  strasse?: string;
  land?: string;
  koordinaten?: {
    lat: number;
    lon: number;
  };
}

export interface JobContact {
  name?: string;
  telefon?: string;
  email?: string;
  anschrift?: JobLocation;
}

export interface JobSkill {
  hierarchie?: string;
  auspraegung?: string;
}

export interface Job {
  id: string; // Firestore document ID
  refnr: string; // Arbeitsagentur reference number
  titel: string;
  arbeitgeber?: string;
  arbeitsort?: JobLocation;
  stellenbeschreibung?: string;
  fertigkeiten?: JobSkill[];
  verguetung?: string;
  befristung?: string;
  aktuelleVeroeffentlichungsdatum?: string;
  eintrittsdatum?: string;
  kontakt?: JobContact; // Nur verfügbar nach CAPTCHA-Lösung
  logoUrl?: string;

  // Metadata
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  lastSyncedAt?: string; // Wann wurde dieser Job zuletzt von Arbeitsagentur abgerufen
}
