import { useTranslatedText } from "@/hooks/useTranslatedText";

interface TranslatedTextProps {
  text: string;
}

export const TranslatedText = ({ text }: TranslatedTextProps) => {
  const translated = useTranslatedText(text);
  return <>{translated}</>;
};
