"use client";

import { motion } from "framer-motion";
import { FileText, Edit3, Download } from "lucide-react";

export function Demo() {
  return (
    <section className="py-20 px-4 relative overflow-hidden bg-gradient-to-b from-background to-purple-900/10">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
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
            So einfach geht&apos;s
          </h2>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            In drei einfachen Schritten zu deinem perfekten Lebenslauf
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {/* Step 1 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center space-y-4"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 glass mb-4">
              <Edit3 className="w-8 h-8 text-purple-400" />
            </div>
            <div className="space-y-2">
              <div className="inline-block px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-sm font-medium">
                Schritt 1
              </div>
              <h3 className="text-xl font-semibold">Daten eingeben</h3>
              <p className="text-foreground/60">
                Fülle einfach das Formular mit deinen persönlichen Daten, Erfahrungen und Fähigkeiten aus
              </p>
            </div>
          </motion.div>

          {/* Step 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center space-y-4"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 glass mb-4">
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
            <div className="space-y-2">
              <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium">
                Schritt 2
              </div>
              <h3 className="text-xl font-semibold">Layout wählen</h3>
              <p className="text-foreground/60">
                Wähle aus drei professionellen Layouts und passe Farben und Schriftarten an
              </p>
            </div>
          </motion.div>

          {/* Step 3 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-center space-y-4"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 glass mb-4">
              <Download className="w-8 h-8 text-green-400" />
            </div>
            <div className="space-y-2">
              <div className="inline-block px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-sm font-medium">
                Schritt 3
              </div>
              <h3 className="text-xl font-semibold">PDF exportieren</h3>
              <p className="text-foreground/60">
                Lade deinen fertigen Lebenslauf als PDF herunter und bewirb dich sofort
              </p>
            </div>
          </motion.div>
        </div>

        {/* Demo Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="glass rounded-3xl p-8 max-w-5xl mx-auto"
        >
          <div className="aspect-video bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl flex items-center justify-center border border-purple-500/20">
            {/* Placeholder for Screenshot/Video */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/20">
                <FileText className="w-10 h-10 text-purple-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold gradient-text">Live-Vorschau</h3>
                <p className="text-foreground/60 max-w-md mx-auto">
                  Sieh deine Änderungen in Echtzeit während du deinen Lebenslauf erstellst
                </p>
              </div>
            </div>
          </div>

          {/* Layout Previews */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="aspect-[3/4] bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl border border-purple-500/20 flex items-center justify-center">
              <span className="text-sm font-medium text-purple-400">Layout 1</span>
            </div>
            <div className="aspect-[3/4] bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl border border-blue-500/20 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-400">Layout 2</span>
            </div>
            <div className="aspect-[3/4] bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl border border-green-500/20 flex items-center justify-center">
              <span className="text-sm font-medium text-green-400">Layout 3</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
