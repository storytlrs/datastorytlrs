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
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-[#FF8000] shadow-lg border border-primary hover:bg-[#FF8000] hover:text-black hover:border-[#FF8000] transition-all duration-200"
        size="icon"
        aria-label={isOpen ? "Close chat" : "Open AI assistant"}
      >
        {isOpen ? <X className="!h-10 !w-10" /> : <Bot className="!h-10 !w-10" />}
      </Button>
    </>
  );
};

export default AIChatButton;
