// Hierarchische Kategorien basierend auf Arbeitsagentur.de
export interface JobCategory {
  id: string;
  name: string;
  icon: string;
  subcategories: string[];
}

export const jobCategories: JobCategory[] = [
  {
    id: "land-forst-garten",
    name: "Land-, Forst- und Gartenbau",
    icon: "🚜",
    subcategories: [
      "Landwirtschaft",
      "Gartenbau",
      "Forstwirtschaft, Jagdwirtschaft, Landschaftspflege",
      "Tierwirtschaft",
      "Pferdewirtschaft",
      "Weinbau",
      "Fischwirtschaft"
    ]
  },
  {
    id: "rohstoff-produktion",
    name: "Rohstoffgewinnung, Produktion und Fertigung",
    icon: "🏭",
    subcategories: [
      "Metallbearbeitung",
      "Metallbau und Schweißtechnik",
      "Metallerzeugung",
      "Metalloberflächenbehandlung",
      "Kunststoff- und Kautschukherstellung",
      "Holzbe- und -verarbeitung",
      "Papier- und Verpackungstechnik",
      "Textilverarbeitung",
      "Textiltechnik und -produktion",
      "Leder- und Pelzherstellung",
      "Industrielle Glasherstellung",
      "Industrielle Keramikherstellung",
      "Naturstein- und Mineralaufbereitung, Baustoffherstellung",
      "Berg-, Tagebau und Sprengtechnik"
    ]
  },
  {
    id: "bau-ausbau",
    name: "Bau und Ausbau",
    icon: "🏗️",
    subcategories: [
      "Bauplanung und -überwachung, Architektur",
      "Vermessung und Kartografie",
      "Hochbau",
      "Tiefbau",
      "Aus- und Trockenbau, Isolierung, Zimmerei, Glaserei",
      "Bodenverlegung",
      "Klempnerei, Sanitär-, Heizungs- und Klimatechnik",
      "Maler, Stuckateure, Bautenschutz",
      "Gebäudetechnik",
      "Innenarchitektur, Raumausstattung",
      "Bau- und Transportgeräteführung"
    ]
  },
  {
    id: "naturwissenschaft",
    name: "Naturwissenschaft und Forschung",
    icon: "🔬",
    subcategories: [
      "Biologie",
      "Chemie",
      "Physik",
      "Mathematik und Statistik",
      "Geologie, Geografie und Meteorologie",
      "Technische Forschung und Entwicklung",
      "Umweltschutztechnik",
      "Umweltmanagement und -beratung"
    ]
  },
  {
    id: "informatik",
    name: "Informatik und IT",
    icon: "💻",
    subcategories: [
      "Softwareentwicklung und Programmierung",
      "Informatik",
      "IT-Netzwerktechnik, -Administration, -Organisation",
      "IT-Systemanalyse, -Anwendungsberatung und -Vertrieb"
    ]
  },
  {
    id: "technik",
    name: "Technik, Technologiefelder",
    icon: "⚙️",
    subcategories: [
      "Maschinenbau- und Betriebstechnik",
      "Mechatronik und Automatisierungstechnik",
      "Elektrotechnik",
      "Energietechnik",
      "Fahrzeug-, Luft-, Raumfahrt- und Schiffbautechnik",
      "Feinwerk- und Werkzeugtechnik",
      "Technisches Zeichnen, Konstruktion und Modellbau",
      "Technische Produktionsplanung und -steuerung",
      "Medizin-, Orthopädie- und Rehatechnik"
    ]
  },
  {
    id: "verkehr-logistik",
    name: "Verkehr und Logistik",
    icon: "🚛",
    subcategories: [
      "Lagerwirtschaft, Post und Zustellung, Güterumschlag",
      "Fahrzeugführung im Straßenverkehr",
      "Fahrzeugführung im Eisenbahnverkehr",
      "Fahrzeugführung im Flugverkehr",
      "Fahrzeugführung im Schiffsverkehr",
      "Kaufleute - Verkehr und Logistik",
      "Servicekräfte im Personenverkehr",
      "Technischer Betrieb des Eisenbahn-, Luft- und Schiffsverkehrs",
      "Überwachung und Steuerung des Verkehrsbetriebs",
      "Überwachung, Wartung Verkehrsinfrastruktur"
    ]
  },
  {
    id: "wirtschaft",
    name: "Wirtschaft und Verwaltung",
    icon: "💼",
    subcategories: [
      "Büro und Sekretariat",
      "Rechnungswesen, Controlling und Revision",
      "Personalwesen und -dienstleistung",
      "Unternehmensorganisation und -strategie",
      "Steuerberatung",
      "Versicherungs- und Finanzdienstleistungen",
      "Einkauf und Vertrieb",
      "Verwaltung",
      "Rechtsberatung, -sprechung und -ordnung",
      "Geschäftsführung und Vorstand",
      "Immobilienwirtschaft und Facility-Management"
    ]
  },
  {
    id: "handel",
    name: "Handel, Lebensmittel, Verkauf",
    icon: "🛒",
    subcategories: [
      "Verkauf (ohne Produktspezialisierung)",
      "Verkauf Bekleidung, Elektro, KFZ, Hartwaren",
      "Verkauf von Lebensmitteln",
      "Verkauf von drogerie- und apothekenüblichen Waren",
      "Handel",
      "Buch- und Kunstantiquitäten, Musikfachhandel"
    ]
  },
  {
    id: "tourismus",
    name: "Tourismus, Gastgewerbe, Lebensmittel",
    icon: "🍽️",
    subcategories: [
      "Speisenzubereitung",
      "Gastronomie",
      "Hotellerie",
      "Lebensmittel- und Genussmittelherstellung",
      "Getränkeherstellung",
      "Tourismus und Sport"
    ]
  },
  {
    id: "gesundheit",
    name: "Gesundheit, Tiermedizin",
    icon: "🏥",
    subcategories: [
      "Human- und Zahnmedizin",
      "Krankenpflege, Rettungsdienst und Geburtshilfe",
      "Altenpflege",
      "Arzt- und Praxishilfe",
      "Nichtärztliche Therapie und Heilkunde",
      "Pharmazie",
      "Medizin-, Orthopädie- und Rehatechnik",
      "Medizinisches Laboratorium",
      "Ernährungs- und Gesundheitsberatung",
      "Tiermedizin und Tierheilkunde",
      "Tierpflege"
    ]
  },
  {
    id: "soziales-paedagogik",
    name: "Soziales und Pädagogik",
    icon: "👥",
    subcategories: [
      "Erziehung, Sozialarbeit, Heilerziehungspflege",
      "Lehrtätigkeit an allgemeinbildenden Schulen",
      "Lehrtätigkeit berufsbildender Fächer und betriebliche Ausbildung",
      "Lehrtätigkeit an außerschulischen Bildungseinrichtungen",
      "Lehr- und Forschungstätigkeit an Hochschulen",
      "Fahr- und Sportunterricht an außerschulischen Bildungseinrichtungen",
      "Psychologie, nichtärztliche Psychotherapie",
      "Hauswirtschaft und Verbraucherberatung",
      "Theologie und Gemeindearbeit"
    ]
  },
  {
    id: "kunst-kultur-medien",
    name: "Kunst, Kultur und Medien",
    icon: "🎨",
    subcategories: [
      "Werbung und Marketing",
      "Öffentlichkeitsarbeit",
      "Redaktion und Journalismus",
      "Verlags- und Medienwirtschaft",
      "Technische Mediengestaltung",
      "Veranstaltungs-, Kamera-, Tontechnik",
      "Veranstaltungsservice und -management",
      "Theater-, Film- und Fernsehproduktion",
      "Schauspiel, Tanz und Bewegungskunst",
      "Musik-, Gesang-, Dirigententätigkeiten",
      "Moderation und Unterhaltung",
      "Kunsthandwerk und bildende Kunst",
      "Produkt- und Industriedesign",
      "Fototechnik und Fotografie",
      "Museumstechnik und -management",
      "Medien-, Dokumentations- und Informationsdienste"
    ]
  },
  {
    id: "sicherheit",
    name: "Sicherheit und Ordnung",
    icon: "🛡️",
    subcategories: [
      "Objekt-, Personen-, Brandschutz, Arbeitssicherheit",
      "Polizei- und Kriminaldienst, Gerichts- und Justizvollzug",
      "Gewerbe, Gesundheitsaufsicht, Desinfektion"
    ]
  },
  {
    id: "reinigung",
    name: "Reinigung und Körperpflege",
    icon: "✨",
    subcategories: [
      "Reinigung",
      "Körperpflege",
      "Bestattungswesen"
    ]
  },
  {
    id: "sonstige",
    name: "Sonstige Dienstleistungen",
    icon: "🔧",
    subcategories: [
      "Floristik",
      "Ver- und Entsorgung",
      "Drucktechnik, Buchbinderei",
      "Farb- und Lacktechnik",
      "Kunsthandwerkliche Keramik- und Glasgestaltung",
      "Kunsthandwerkliche Metallgestaltung",
      "Bühnen- und Kostümbildnerei, Requisite",
      "Musikinstrumentenbau"
    ]
  },
  {
    id: "steuer-immobilien",
    name: "Steuerberatung, Immobilien",
    icon: "🏠",
    subcategories: [
      "Steuerberatung",
      "Immobilienwirtschaft und Facility-Management"
    ]
  }
];
