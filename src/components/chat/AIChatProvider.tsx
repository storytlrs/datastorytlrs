import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { usePageContext, PageContext } from "./usePageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

interface AIChatContextType {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  pageContext: PageContext;
  toggleChat: () => void;
  sendMessage: (input: string) => Promise<void>;
  clearMessages: () => void;
}

const AIChatContext = createContext<AIChatContextType | null>(null);

export const useAIChat = () => {
  const ctx = useContext(AIChatContext);
  if (!ctx) throw new Error("useAIChat must be used within AIChatProvider");
  return ctx;
};

export const AIChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const pageContext = usePageContext();
  const abortRef = useRef<AbortController | null>(null);

  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);
  const clearMessages = useCallback(() => setMessages([]), []);

  const sendMessage = useCallback(
    async (input: string) => {
      const userMsg: ChatMessage = { role: "user", content: input };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      // abort previous if any
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      let assistantSoFar = "";
      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        const snapshot = assistantSoFar;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: snapshot } : m
            );
          }
          return [...prev, { role: "assistant", content: snapshot }];
        });
      };

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          toast.error("You must be logged in to use the assistant.");
          setIsLoading(false);
          return;
        }

        const allMessages = [...messages, userMsg];

        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              messages: allMessages,
              page_context: pageContext,
            }),
            signal: controller.signal,
          }
        );

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          if (resp.status === 429) {
            toast.error("Rate limit exceeded. Please try again in a moment.");
          } else if (resp.status === 402) {
            toast.error("AI credits exhausted. Please add funds.");
          } else {
            toast.error(errData.error || "Failed to get a response.");
          }
          setIsLoading(false);
          return;
        }

        if (!resp.body) throw new Error("No response body");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              streamDone = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsertAssistant(content);
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // flush remaining
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsertAssistant(content);
            } catch { /* ignore */ }
          }
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error("Chat error:", e);
          toast.error("An error occurred while chatting.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [messages, pageContext]
  );

  return (
    <AIChatContext.Provider
      value={{ messages, isOpen, isLoading, pageContext, toggleChat, sendMessage, clearMessages }}
    >
      {children}
    </AIChatContext.Provider>
  );
};
