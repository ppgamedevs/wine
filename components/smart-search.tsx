"use client";

import { motion } from "framer-motion";
import { Building2, Loader2, Search, Wine } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { EASE_OUT } from "@/lib/motion";
import type { SearchSuggestion } from "@/lib/queries";
import {
  EXISTING_WINE_CATALOG_MESSAGE,
  WINE_ALREADY_PENDING_MESSAGE,
  WINE_PENDING_REVIEW_MESSAGE,
} from "@/lib/wine-submission-messages";
import { isWineUrl, looksLikeUrlAttempt } from "@/lib/wine-url";
import { cn } from "@/lib/utils";

export const WINE_LINK_HELPER_TEXT =
  "Adauga un link de vin romanesc (eMag, site crama etc.)";

export const WINE_SUBMITTED_FOR_REVIEW_MESSAGE = WINE_PENDING_REVIEW_MESSAGE;

interface SmartSearchProps {
  className?: string;
  placeholder?: string;
  enableLinkAnalysis?: boolean;
}

export function SmartSearch({
  className,
  placeholder = "Cauta vin, crama sau lipeste link (https://...)",
  enableLinkAnalysis = true,
}: SmartSearchProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSuccess, setAnalysisSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || isWineUrl(trimmed)) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("request failed");
        const data: { suggestions: SearchSuggestion[] } = await res.json();
        setSuggestions(data.suggestions);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function analyzeWineUrl(url: string) {
    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisSuccess(null);
    setOpen(false);

    try {
      const res = await fetch("/api/analyze-wine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data: {
        error?: string;
        message?: string;
        redirectUrl?: string;
        slug?: string;
        status?: string;
      } = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? "Analiza a esuat.");
      }

      const target = data.redirectUrl ?? (data.slug ? `/wines/${data.slug}` : null);

      if (data.status === "pending_review") {
        setQuery("");
        setAnalysisSuccess(data.message ?? WINE_PENDING_REVIEW_MESSAGE);
        return;
      }

      if (data.status === "existing" && target) {
        if (data.message === EXISTING_WINE_CATALOG_MESSAGE) {
          router.push(`${target}?notice=existing`);
          return;
        }

        setQuery("");
        setAnalysisSuccess(data.message ?? WINE_ALREADY_PENDING_MESSAGE);
        return;
      }

      throw new Error("Nu am primit un rezultat valid.");
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "Analiza a esuat.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    if (enableLinkAnalysis && isWineUrl(trimmed)) {
      await analyzeWineUrl(trimmed);
      return;
    }

    setOpen(false);
    router.push(`/cauta?q=${encodeURIComponent(trimmed)}`);
  }

  function hrefFor(suggestion: SearchSuggestion) {
    return suggestion.type === "wine"
      ? `/wines/${suggestion.slug}`
      : `/wineries/${suggestion.slug}`;
  }

  const trimmed = query.trim();
  const isUrl = enableLinkAnalysis && isWineUrl(trimmed);
  const showLinkHelper =
    enableLinkAnalysis && !analysisSuccess && looksLikeUrlAttempt(trimmed);
  const showDropdown = open && trimmed.length >= 2 && !isUrl;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.25, ease: EASE_OUT }}
      className={cn("relative w-full", className)}
    >
      <form
        onSubmit={handleSubmit}
        role="search"
        className={cn(
          "flex w-full flex-col gap-2 rounded-2xl border bg-card/80 p-2 shadow-sm backdrop-blur transition-all duration-300",
          focused
            ? "border-wine/60 shadow-lg ring-4 ring-wine/10"
            : "border-border hover:border-wine/40",
        )}
      >
        <div className="flex w-full items-center gap-2">
          <Search
            aria-hidden="true"
            className={cn(
              "ml-2 h-5 w-5 shrink-0 transition-colors",
              focused ? "text-wine" : "text-muted-foreground",
            )}
          />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setAnalysisError(null);
              setAnalysisSuccess(null);
              setOpen(true);
            }}
            onFocus={() => {
              setFocused(true);
              setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            aria-label="Cauta vinuri, crame sau adauga link"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            role="combobox"
            aria-controls="search-suggestions"
            disabled={analyzing}
            className="h-11 w-full flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/80 disabled:opacity-60"
          />
          <Button
            type="submit"
            size="lg"
            disabled={analyzing}
            className="shrink-0 rounded-xl bg-wine px-6 text-wine-foreground hover:bg-wine/90"
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analizez...
              </>
            ) : isUrl ? (
              "Trimite"
            ) : (
              "Cauta"
            )}
          </Button>
        </div>
      </form>

      {analysisError && isUrl ? (
        <p className="mt-2 text-left text-sm text-destructive">{analysisError}</p>
      ) : null}

      {analysisSuccess ? (
        <p
          role="status"
          className="mt-2 rounded-xl border border-wine/20 bg-wine/5 px-4 py-3 text-left text-sm text-foreground"
        >
          {analysisSuccess}
        </p>
      ) : null}

      {showLinkHelper ? (
        <p className="mt-2 text-left text-sm text-muted-foreground">
          {WINE_LINK_HELPER_TEXT}
        </p>
      ) : null}

      {showDropdown && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-border bg-popover text-left shadow-xl"
        >
          {loading && suggestions.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cautam...
            </div>
          )}

          {!loading && suggestions.length === 0 && (
            <div className="px-4 py-4 text-sm text-muted-foreground">
              Niciun rezultat. Apasa Enter pentru cautare completa sau lipeste
              un link de vin romanesc.
            </div>
          )}

          {suggestions.length > 0 && (
            <ul className="max-h-80 overflow-y-auto py-1.5">
              {suggestions.map((suggestion) => (
                <li
                  key={`${suggestion.type}-${suggestion.slug}`}
                  role="option"
                  aria-selected={false}
                >
                  <Link
                    href={hrefFor(suggestion)}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-secondary"
                  >
                    <span
                      className={cn(
                        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                        suggestion.type === "wine"
                          ? "bg-wine/10 text-wine"
                          : "bg-gold/15 text-gold",
                      )}
                    >
                      {suggestion.type === "wine"
                        ? <Wine className="h-4 w-4" />
                        : <Building2 className="h-4 w-4" />}
                    </span>
                    <span className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {suggestion.name}
                        {suggestion.vintage ? (
                          <span className="text-muted-foreground">
                            {" "}
                            {suggestion.vintage}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {suggestion.type === "wine" ? "Vin" : "Crama"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </motion.div>
  );
}
