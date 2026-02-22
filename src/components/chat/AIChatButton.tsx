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
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-accent-green text-accent-green-foreground shadow-lg hover:bg-accent-green/90 hover:scale-105 transition-transform border-none"
        size="icon"
        aria-label={isOpen ? "Close chat" : "Open AI assistant"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </Button>
    </>
  );
};

export default AIChatButton;
