import { useState, useEffect } from "react";
import { useTranslation } from "@/contexts/TranslationContext";

export const useTranslatedText = (text: string): string => {
  const { isEnglish, translateText } = useTranslation();
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    if (!isEnglish || !text || text.trim().length === 0) {
      setTranslated(text);
      return;
    }

    let cancelled = false;
    translateText(text).then((result) => {
      if (!cancelled) setTranslated(result);
    });

    return () => { cancelled = true; };
  }, [isEnglish, text, translateText]);

  return isEnglish ? translated : text;
};
