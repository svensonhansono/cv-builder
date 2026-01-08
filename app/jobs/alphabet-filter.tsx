"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { groupCategoriesByLetter, getAvailableLetters } from "./alphabet-categories";

interface AlphabetFilterProps {
  onSelectionChange: (selected: string[]) => void;
  selectedCategories: string[];
}

export function AlphabetFilter({ onSelectionChange, selectedCategories }: AlphabetFilterProps) {
  const [hoveredLetter, setHoveredLetter] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const grouped = groupCategoriesByLetter();
  const letters = getAvailableLetters();

  const handleMouseEnter = (letter: string, event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 8, // Fixed positioning: relative to viewport, no scrollY needed
      left: rect.left // Fixed positioning: relative to viewport, no scrollX needed
    });
    setHoveredLetter(letter);
  };

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onSelectionChange(selectedCategories.filter(c => c !== category));
    } else {
      onSelectionChange([...selectedCategories, category]);
    }
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Selected Categories Display */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-foreground/70">Ausgewählt ({selectedCategories.length}):</span>
          {selectedCategories.map(category => (
            <motion.div
              key={category}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-sm text-green-300 flex items-center gap-2"
            >
              <span>{category}</span>
              <button
                onClick={() => toggleCategory(category)}
                className="hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
          <button
            onClick={clearAll}
            className="text-xs px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-colors"
          >
            Alle entfernen
          </button>
        </div>
      )}

      {/* Alphabet Bar */}
      <div className="relative z-50">
        <div className="text-sm text-foreground/70 mb-2">Berufsfelder nach Buchstabe:</div>
        <div className="flex flex-wrap gap-1">
          {letters.map(letter => (
            <div
              key={letter}
              className="relative"
              onMouseEnter={(e) => handleMouseEnter(letter, e)}
              onMouseLeave={() => setHoveredLetter(null)}
            >
              <button
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  grouped[letter].some(cat => selectedCategories.includes(cat))
                    ? "bg-green-500/20 border border-green-500/40 text-green-300"
                    : "bg-slate-800/50 border border-white/10 text-foreground/70 hover:bg-slate-700/50 hover:border-purple-500/30"
                }`}
              >
                {letter}
              </button>
            </div>
          ))}
        </div>

        {/* Dropdown Menu - Fixed Positioning */}
        <AnimatePresence>
          {hoveredLetter && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed min-w-[300px] max-w-[400px]"
              style={{
                zIndex: 9999,
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`
              }}
              onMouseEnter={() => setHoveredLetter(hoveredLetter)}
              onMouseLeave={() => setHoveredLetter(null)}
            >
              <div className="glass rounded-lg p-4 border border-purple-500/30 shadow-2xl max-h-[400px] overflow-y-auto bg-slate-900/95 backdrop-blur-xl">
                <div className="text-xs text-foreground/50 mb-2">
                  {grouped[hoveredLetter].length} Berufsfelder
                </div>
                <div className="space-y-1">
                  {grouped[hoveredLetter].map(category => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between gap-2 ${
                        selectedCategories.includes(category)
                          ? "bg-green-500/20 border border-green-500/40 text-green-300"
                          : "hover:bg-slate-700/50 text-foreground/80 hover:text-green-400"
                      }`}
                    >
                      <span className="flex-1">{category}</span>
                      {selectedCategories.includes(category) && (
                        <Check className="w-4 h-4 text-green-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
