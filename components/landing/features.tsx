"use client";

import { motion } from "framer-motion";
import { FileText, Layout, Download, Cloud, Eye, Zap, Shield, Palette } from "lucide-react";

const features = [
  {
    icon: Layout,
    title: "3 Premium Layouts",
    description: "Wähle aus drei professionell gestalteten Lebenslauf-Vorlagen, die perfekt zu deinem Stil passen.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Eye,
    title: "Live-Vorschau",
    description: "Sieh deine Änderungen in Echtzeit. Was du im Editor eingibst, erscheint sofort in der Vorschau.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Download,
    title: "PDF Export",
    description: "Exportiere deinen fertigen Lebenslauf mit einem Klick als hochqualitative PDF-Datei.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Cloud,
    title: "Cloud-Speicherung",
    description: "Deine Lebensläufe werden automatisch in der Cloud gespeichert. Greife von überall darauf zu.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: Zap,
    title: "Schnell & Einfach",
    description: "Erstelle deinen Lebenslauf in wenigen Minuten. Keine komplizierte Software, keine Installation nötig.",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: Palette,
    title: "Anpassbar",
    description: "Personalisiere Farben, Schriftarten und Abstände. Dein Lebenslauf, dein Stil.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Shield,
    title: "Sicher & Privat",
    description: "Deine Daten sind bei uns sicher. Verschlüsselte Übertragung und sichere Cloud-Speicherung.",
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    icon: FileText,
    title: "Unterschrift",
    description: "Füge eine digitale Unterschrift hinzu oder lade deine eigene Signatur als Bild hoch.",
    gradient: "from-teal-500 to-green-500",
  },
];

export function Features() {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-4xl md:text-5xl font-bold gradient-text">
            Alles was du brauchst
          </h2>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            Professionelle Werkzeuge für deinen perfekten Lebenslauf
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass rounded-2xl p-6 space-y-4 hover:scale-105 transition-transform duration-300"
              >
                {/* Icon */}
                <div className="relative w-12 h-12">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-20 rounded-xl blur-lg`}
                  />
                  <div
                    className={`relative w-full h-full bg-gradient-to-br ${feature.gradient} opacity-10 rounded-xl flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 bg-gradient-to-br ${feature.gradient} bg-clip-text text-transparent`} style={{ filter: 'brightness(2)' }} />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-foreground/60 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
