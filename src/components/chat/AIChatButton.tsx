import { Bot, X } from "lucide-react";
import { useAIChat } from "./AIChatProvider";
import { Button } from "@/components/ui/button";
import AIChatPanel from "./AIChatPanel";

const AIChatButton = () => {
  const { isOpen, toggleChat } = useAIChat();

  return (
    <>
      {isOpen && <AIChatPanel />}
      <Button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full bg-black text-accent-orange shadow-lg hover:scale-105 transition-transform border-none"
        size="icon"
        aria-label={isOpen ? "Close chat" : "Open AI assistant"}
      >
        {isOpen ? <X className="h-8 w-8" /> : <Bot className="h-8 w-8" />}
      </Button>
    </>
  );
};

export default AIChatButton;
