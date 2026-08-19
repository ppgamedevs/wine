"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic, SendHorizontal, Sparkles, Square, Wine } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChatWineCard } from "@/components/sommelier/chat-wine-card";
import { Button } from "@/components/ui/button";
import { EASE_OUT } from "@/lib/motion";
import type { ChatWineRecommendation } from "@/lib/sommelier-chat-types";
import { sanitizeAssistantChatText } from "@/lib/sommelier-chat-utils";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/i18n/locale";

interface SommelierChatCopy {
  quickPrompts: readonly string[];
  recommendationsLabel: string;
  recommendationsDescription: string;
  assistantLabel: string;
  listening: string;
  placeholder: string;
  messageLabel: string;
  stopListening: string;
  startListening: string;
  stopGeneration: string;
  sendMessage: string;
  title: string;
  description: string;
  analyzing: string;
  voiceErrors: {
    microphoneDenied: string;
    recognitionFailed: string;
    microphoneActive: string;
  };
}

const SOMMELIER_CHAT_COPY: Record<AppLocale, SommelierChatCopy> = {
  ro: {
    quickPrompts: [
      "Vin bun pentru cozonac",
      "Ce vin rosu merge la sarmale?",
      "Recomandare sub 60 lei",
      "Ceva special pentru o cina romantica",
    ],
    recommendationsLabel: "Recomandari principale",
    recommendationsDescription:
      "Selectie din catalogul VinIntel, potrivita cererii tale",
    assistantLabel: "Somelier VinIntel",
    listening: "Ascult...",
    placeholder: "Scrie ce ocazie ai sau ce fel de vin cauti...",
    messageLabel: "Mesaj pentru somelier",
    stopListening: "Opreste ascultarea",
    startListening: "Vorbeste mesajul",
    stopGeneration: "Opreste generarea",
    sendMessage: "Trimite mesaj",
    title: "Somelierul tau romanesc",
    description:
      "Intreaba orice despre vinuri autohtone: ocazii, mancare, deserturi, buget in lei.",
    analyzing: "Somelierul analizeaza catalogul...",
    voiceErrors: {
      microphoneDenied:
        "Acces la microfon refuzat. Permite microfonul in browser.",
      recognitionFailed: "Nu am putut recunoaste vocea. Incearca din nou.",
      microphoneActive: "Microfonul este deja activ.",
    },
  },
  en: {
    quickPrompts: [
      "A wine for cozonac",
      "What should I drink with sarmale?",
      "Recommend a wine under 60 RON",
      "Something special for a romantic dinner",
    ],
    recommendationsLabel: "Top recommendations",
    recommendationsDescription:
      "Selected from the VinIntel catalog for your request",
    assistantLabel: "VinIntel Sommelier",
    listening: "Listening...",
    placeholder: "Describe the occasion or the wine you want...",
    messageLabel: "Message for the Sommelier",
    stopListening: "Stop listening",
    startListening: "Speak your message",
    stopGeneration: "Stop generating",
    sendMessage: "Send message",
    title: "Your Romanian wine Sommelier",
    description:
      "Ask about Romanian wines, food pairings, gifts, occasions, and budgets in RON.",
    analyzing: "The Sommelier is checking the catalog...",
    voiceErrors: {
      microphoneDenied:
        "Microphone access was denied. Allow microphone access in your browser.",
      recognitionFailed: "We could not recognize your voice. Try again.",
      microphoneActive: "The microphone is already active.",
    },
  },
};

export type SommelierChatUiMessage = UIMessage<
  unknown,
  {
    recommendations: ChatWineRecommendation[];
  }
>;

function getTextFromMessage(message: SommelierChatUiMessage): string {
  return message.parts
    .filter(
      (part): part is Extract<typeof part, { type: "text" }> =>
        part.type === "text",
    )
    .map((part) => part.text)
    .join("");
}

function getRecommendationsFromMessage(
  message: SommelierChatUiMessage,
): ChatWineRecommendation[] {
  const items: ChatWineRecommendation[] = [];
  for (const part of message.parts) {
    if (part.type === "data-recommendations") {
      items.push(...part.data);
    }
  }
  return items;
}

function AssistantRecommendations({
  recommendations,
  copy,
  locale,
}: {
  recommendations: ChatWineRecommendation[];
  copy: SommelierChatCopy;
  locale: AppLocale;
}) {
  if (recommendations.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className="w-full max-w-[min(100%,42rem)] space-y-4"
      aria-label={copy.recommendationsLabel}
    >
      <div className="flex items-center gap-2.5 px-1">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-wine/10 text-wine">
          <Wine className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-serif text-lg font-semibold text-foreground">
            {copy.recommendationsLabel}
          </h2>
          <p className="text-xs text-muted-foreground">
            {copy.recommendationsDescription}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {recommendations.map((wine, index) => (
          <ChatWineCard
            key={wine.slug}
            wine={wine}
            index={index}
            locale={locale}
          />
        ))}
      </div>
    </motion.section>
  );
}

function ChatBubble({
  role,
  children,
  assistantLabel,
}: {
  role: "user" | "assistant";
  children: ReactNode;
  assistantLabel: string;
}) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:text-[15px]",
          isUser
            ? "bg-wine text-wine-foreground"
            : "border border-border/70 bg-card text-foreground/90",
        )}
      >
        {!isUser ? (
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-wine">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {assistantLabel}
          </div>
        ) : null}
        {children}
      </div>
    </motion.div>
  );
}

function ListeningIndicator({
  interimTranscript,
  label,
}: {
  interimTranscript: string;
  label: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="mx-auto mb-3 flex max-w-3xl items-center gap-3 rounded-xl border border-wine/20 bg-wine/5 px-4 py-2.5 text-sm text-wine"
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className="inline-block h-2 w-2 rounded-full bg-wine"
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1.1, 0.85] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              delay: index * 0.18,
              ease: "easeInOut",
            }}
          />
        ))}
      </span>
      <span className="font-medium">{label}</span>
      {interimTranscript ? (
        <span className="truncate text-foreground/70">{interimTranscript}</span>
      ) : null}
    </motion.div>
  );
}

function ChatComposer({
  input,
  setInput,
  textareaRef,
  isBusy,
  isListening,
  isVoiceSupported,
  voiceError,
  interimTranscript,
  onSubmit,
  onKeyDown,
  onToggleListening,
  onStop,
  copy,
  className,
}: {
  input: string;
  setInput: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  isBusy: boolean;
  isListening: boolean;
  isVoiceSupported: boolean;
  voiceError: string | null;
  interimTranscript: string;
  onSubmit: (event: React.FormEvent) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onToggleListening: () => void;
  onStop: () => void;
  copy: SommelierChatCopy;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <AnimatePresence>
        {isListening ? (
          <ListeningIndicator
            interimTranscript={interimTranscript}
            label={copy.listening}
          />
        ) : null}
      </AnimatePresence>

      {voiceError ? (
        <p className="mb-3 text-center text-xs text-muted-foreground">
          {voiceError}
        </p>
      ) : null}

      <form onSubmit={onSubmit}>
        <div
          className={cn(
            "flex items-center gap-1 rounded-2xl border bg-card/90 p-1.5 shadow-sm backdrop-blur-sm transition-all",
            isListening
              ? "border-wine/35 ring-2 ring-wine/10"
              : "border-border/60 focus-within:border-wine/30 focus-within:shadow-md",
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={copy.placeholder}
            disabled={isBusy || isListening}
            className="min-h-[48px] max-h-36 min-w-0 flex-1 resize-none overflow-hidden bg-transparent px-3 py-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground disabled:opacity-60 sm:text-[15px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            aria-label={copy.messageLabel}
          />

          {isVoiceSupported ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={isBusy}
              onClick={onToggleListening}
              className={cn(
                "h-11 w-11 shrink-0 rounded-xl text-muted-foreground hover:bg-wine/10 hover:text-wine",
                isListening &&
                  "bg-wine/15 text-wine hover:bg-wine/20 hover:text-wine",
              )}
              aria-label={
                isListening ? copy.stopListening : copy.startListening
              }
              aria-pressed={isListening}
            >
              <Mic
                className={cn("h-5 w-5", isListening && "animate-pulse")}
              />
            </Button>
          ) : null}

          {isBusy ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-11 w-11 shrink-0 rounded-xl"
              onClick={onStop}
              aria-label={copy.stopGeneration}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              className="h-11 w-11 shrink-0 rounded-xl bg-wine text-wine-foreground hover:bg-wine/90 disabled:opacity-40"
              aria-label={copy.sendMessage}
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export function SommelierChat({
  locale = "ro",
}: {
  locale?: AppLocale;
}) {
  const copy = SOMMELIER_CHAT_COPY[locale];
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const searchParams = useSearchParams();
  const initialQuerySent = useRef(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<SommelierChatUiMessage>({
        api: "/api/sommelier/chat",
        body: { locale },
      }),
    [locale],
  );

  const { messages, sendMessage, status, error, stop, setMessages } =
    useChat<SommelierChatUiMessage>({
      transport,
    });

  const fetchedRecommendationsRef = useRef(new Set<string>());

  const isBusy = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  const submitText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isBusy) return;
      setInput("");
      await sendMessage({ text: trimmed });
    },
    [isBusy, sendMessage],
  );

  const {
    isSupported: isVoiceSupported,
    isListening,
    interimTranscript,
    error: voiceError,
    toggleListening,
    stopListening,
  } = useSpeechRecognition({
    lang: locale === "en" ? "en-US" : "ro-RO",
    errorMessages: copy.voiceErrors,
    onFinalTranscript: (transcript) => {
      void submitText(transcript);
    },
  });

  useEffect(() => {
    if (isBusy && isListening) {
      stopListening();
    }
  }, [isBusy, isListening, stopListening]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    const maxHeight = 144;
    const nextHeight = Math.min(node.scrollHeight, maxHeight);
    node.style.height = `${nextHeight}px`;
    node.style.overflowY = node.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [input]);

  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    if (!q || initialQuerySent.current || isBusy || messages.length > 0) return;
    initialQuerySent.current = true;
    void sendMessage({ text: q });
  }, [searchParams, isBusy, messages.length, sendMessage]);

  useEffect(() => {
    if (status !== "ready") return;

    void (async () => {
      const pending = messages.filter(
        (message) =>
          message.role === "assistant" &&
          getRecommendationsFromMessage(message).length === 0 &&
          getTextFromMessage(message).trim().length > 0 &&
          !fetchedRecommendationsRef.current.has(message.id),
      );

      if (pending.length === 0) return;

      for (const message of pending) {
        fetchedRecommendationsRef.current.add(message.id);
        const rawText = getTextFromMessage(message);

        try {
          const res = await fetch("/api/sommelier/recommendations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: rawText, locale }),
          });
          if (!res.ok) continue;

          const data = (await res.json()) as {
            recommendations?: ChatWineRecommendation[];
          };
          const recommendations = data.recommendations ?? [];
          if (recommendations.length === 0) continue;

          setMessages((current) =>
            current.map((entry) =>
              entry.id === message.id
                ? {
                    ...entry,
                    parts: [
                      ...entry.parts,
                      {
                        type: "data-recommendations" as const,
                        id: `rec-${entry.id}`,
                        data: recommendations,
                      },
                    ],
                  }
                : entry,
            ),
          );
        } catch {
          fetchedRecommendationsRef.current.delete(message.id);
        }
      }
    })();
  }, [locale, messages, setMessages, status]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submitText(input);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitText(input);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-gradient-to-b from-[#faf7f5] via-background to-background">
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto px-4 sm:px-6",
          hasMessages ? "py-6" : "flex flex-col justify-center py-10 sm:py-14",
        )}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          {!hasMessages ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
              className="flex flex-col items-center text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-wine/15 bg-wine/8 text-wine">
                <Wine className="h-7 w-7" aria-hidden="true" />
              </div>
              <h1 className="mt-5 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {copy.title}
              </h1>
              <p className="mt-3 max-w-md text-balance text-muted-foreground">
                {copy.description}
              </p>

              <ChatComposer
                input={input}
                setInput={setInput}
                textareaRef={textareaRef}
                isBusy={isBusy}
                isListening={isListening}
                isVoiceSupported={isVoiceSupported}
                voiceError={voiceError}
                interimTranscript={interimTranscript}
                onSubmit={handleSubmit}
                onKeyDown={handleKeyDown}
                onToggleListening={toggleListening}
                onStop={stop}
                copy={copy}
                className="mt-8"
              />

              <div className="mt-6 flex w-full flex-wrap justify-center gap-2">
                {copy.quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void submitText(prompt)}
                    disabled={isBusy}
                    className="rounded-full border border-border/60 bg-background/60 px-3.5 py-1.5 text-sm text-foreground/80 transition-colors hover:border-wine/30 hover:bg-wine/5 disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}

          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const rawText = getTextFromMessage(message);
              const text =
                message.role === "assistant"
                  ? sanitizeAssistantChatText(rawText)
                  : rawText;
              const recommendations = getRecommendationsFromMessage(message);
              const isUser = message.role === "user";

              if (!text && recommendations.length === 0 && !isUser) {
                return null;
              }

              return (
                <div key={message.id} className="space-y-4">
                  {text ? (
                    <ChatBubble
                      role={isUser ? "user" : "assistant"}
                      assistantLabel={copy.assistantLabel}
                    >
                      <p className="whitespace-pre-wrap">{text}</p>
                    </ChatBubble>
                  ) : null}

                  {!isUser ? (
                    <AssistantRecommendations
                      recommendations={recommendations}
                      copy={copy}
                      locale={locale}
                    />
                  ) : null}
                </div>
              );
            })}
          </AnimatePresence>

          {isBusy && status === "submitted" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-wine" />
              {copy.analyzing}
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error.message}
            </p>
          ) : null}
        </div>
      </div>

      {hasMessages ? (
        <div className="sticky bottom-0 border-t border-border/40 bg-background/80 px-4 py-4 backdrop-blur-md sm:px-6">
          <ChatComposer
            input={input}
            setInput={setInput}
            textareaRef={textareaRef}
            isBusy={isBusy}
            isListening={isListening}
            isVoiceSupported={isVoiceSupported}
            voiceError={voiceError}
            interimTranscript={interimTranscript}
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
            onToggleListening={toggleListening}
            onStop={stop}
            copy={copy}
            className="mx-auto max-w-2xl"
          />
        </div>
      ) : null}
    </div>
  );
}
