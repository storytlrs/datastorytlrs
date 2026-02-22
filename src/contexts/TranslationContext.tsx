import { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TranslationContextType {
  isEnglish: boolean;
  toggleLanguage: () => void;
  translateText: (text: string) => Promise<string>;
}

const TranslationContext = createContext<TranslationContextType>({
  isEnglish: false,
  toggleLanguage: () => {},
  translateText: async (text) => text,
});

export const useTranslation = () => useContext(TranslationContext);

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const [isEnglish, setIsEnglish] = useState(false);
  const cache = useRef(new Map<string, string>());

  const toggleLanguage = useCallback(() => {
    setIsEnglish((prev) => !prev);
  }, []);

  const translateText = useCallback(async (text: string): Promise<string> => {
    if (!text || text.trim().length === 0) return text;
    if (cache.current.has(text)) return cache.current.get(text)!;

    try {
      const { data, error } = await supabase.functions.invoke("translate-text", {
        body: { texts: [text] },
      });

      if (error || !data?.translations?.[0]) {
        console.error("Translation error:", error);
        return text;
      }

      const translated = data.translations[0];
      cache.current.set(text, translated);
      return translated;
    } catch (e) {
      console.error("Translation failed:", e);
      return text;
    }
  }, []);

  return (
    <TranslationContext.Provider value={{ isEnglish, toggleLanguage, translateText }}>
      {children}
    </TranslationContext.Provider>
  );
};
