"use client";

import { useState, useCallback } from "react";

export interface SpellError {
  offset: number;
  length: number;
  message: string;
  word: string;
  suggestions: string[];
  context: string;
  fieldId: string;
}

interface LanguageToolMatch {
  offset: number;
  length: number;
  message: string;
  replacements: { value: string }[];
  context: {
    text: string;
    offset: number;
    length: number;
  };
  rule?: {
    id: string;
    category?: {
      id: string;
    };
  };
}

// German cover letter intro words that are correctly lowercase after salutation with comma
const GERMAN_LETTER_INTRO_WORDS = new Set([
  "mit", "über", "auf", "bezugnehmend", "hiermit", "gerne", "ich", "als",
  "durch", "nach", "seit", "während", "aufgrund", "in", "für", "zu",
  "vielen", "herzlichen", "besten", "wie"
]);

interface LanguageToolResponse {
  matches: LanguageToolMatch[];
}

export function useSpellCheck(initialIgnoredWords: string[] = []) {
  const [errors, setErrors] = useState<SpellError[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [ignoredWords, setIgnoredWords] = useState<Set<string>>(new Set(initialIgnoredWords.map(w => w.toLowerCase())));
  const [apiError, setApiError] = useState<string | null>(null);

  const checkText = useCallback(async (text: string, fieldId: string): Promise<SpellError[]> => {
    if (!text || text.trim().length < 2) return [];

    // Retry logic for API calls
    const maxRetries = 3;
    let lastError: string | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        setApiError(null);

        // Add delay between retries
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }

        const response = await fetch("https://api.languagetool.org/v2/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
          },
          body: new URLSearchParams({
            text: text,
            language: "de-DE",
            enabledOnly: "false",
          }),
        });

        if (response.status === 500 || response.status === 503) {
          // Server overloaded, retry
          lastError = "Server überlastet. Versuche erneut...";
          console.warn(`LanguageTool API attempt ${attempt + 1} failed with ${response.status}`);
          continue;
        }

        if (!response.ok) {
          lastError = `API Fehler: ${response.status}`;
          console.error("LanguageTool API error:", response.status);
          setApiError(lastError);
          return [];
        }

        const data: LanguageToolResponse = await response.json();

        return data.matches
          .filter(match => {
            const word = text.substring(match.offset, match.offset + match.length);

            // Skip ignored words
            if (ignoredWords.has(word.toLowerCase())) return false;

            // Skip capitalization errors for German letter intro words at position 0
            // (After "Sehr geehrte Frau X," the next word is correctly lowercase)
            const isCapitalizationError = match.rule?.id?.includes("UPPERCASE") ||
              match.rule?.id?.includes("CASE") ||
              match.message?.toLowerCase().includes("groß") ||
              match.message?.toLowerCase().includes("großschreibung");

            if (isCapitalizationError && match.offset === 0) {
              const lowerWord = word.toLowerCase();
              if (GERMAN_LETTER_INTRO_WORDS.has(lowerWord)) {
                return false;
              }
            }

            return true;
          })
          .map(match => ({
            offset: match.offset,
            length: match.length,
            message: match.message,
            word: text.substring(match.offset, match.offset + match.length),
            suggestions: match.replacements.slice(0, 5).map(r => r.value),
            context: match.context.text,
            fieldId,
          }));

      } catch (error) {
        console.error(`Spell check error (attempt ${attempt + 1}):`, error);
        lastError = "Verbindungsfehler. Bitte Internetverbindung prüfen.";
        // Continue to retry
      }
    }

    // All retries failed
    setApiError(lastError || "Rechtschreibprüfung fehlgeschlagen. Bitte später erneut versuchen.");
    return [];
  }, [ignoredWords]);

  const checkAllTexts = useCallback(async (texts: { text: string; fieldId: string }[]) => {
    setIsChecking(true);
    const allErrors: SpellError[] = [];

    for (const { text, fieldId } of texts) {
      const fieldErrors = await checkText(text, fieldId);
      allErrors.push(...fieldErrors);
    }

    setErrors(allErrors);
    setIsChecking(false);
    return allErrors;
  }, [checkText]);

  const ignoreWord = useCallback((word: string): string[] => {
    const newIgnored = new Set([...ignoredWords, word.toLowerCase()]);
    setIgnoredWords(newIgnored);
    setErrors(prev => prev.filter(e => e.word.toLowerCase() !== word.toLowerCase()));
    return Array.from(newIgnored);
  }, [ignoredWords]);

  const setIgnoredWordsList = useCallback((words: string[]) => {
    setIgnoredWords(new Set(words.map(w => w.toLowerCase())));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const removeError = useCallback((error: SpellError) => {
    setErrors(prev => prev.filter(e =>
      !(e.fieldId === error.fieldId && e.offset === error.offset && e.word === error.word)
    ));
  }, []);

  return {
    errors,
    isChecking,
    apiError,
    ignoredWords: Array.from(ignoredWords),
    checkText,
    checkAllTexts,
    ignoreWord,
    setIgnoredWordsList,
    clearErrors,
    removeError,
    setErrors,
  };
}
