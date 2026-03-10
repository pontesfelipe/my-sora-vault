import { useState, useEffect, useRef } from "react";
import { Search, X, Watch, User, Hash, Plus, Clock, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchData } from "@/hooks/useWatchData";
import { useCollection } from "@/contexts/CollectionContext";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useWristCheck } from "@/contexts/WristCheckContext";

interface SearchResult {
  type: "watch" | "user" | "tag";
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedCollectionId } = useCollection();
  const { watches } = useWatchData(selectedCollectionId);
  const { t } = useTranslation();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const q = query.toLowerCase();
      const searchResults: SearchResult[] = [];

      // Search own watches
      watches.forEach((w) => {
        if (
          w.brand.toLowerCase().includes(q) ||
          w.model.toLowerCase().includes(q)
        ) {
          searchResults.push({
            type: "watch",
            id: w.id,
            title: `${w.brand} ${w.model}`,
            subtitle: w.type || undefined,
            imageUrl: w.ai_image_url || undefined,
          });
        }
      });

      // Search users (by username)
      try {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .ilike("username", `%${q}%`)
          .limit(5);

        if (profiles) {
          profiles.forEach((p) => {
            if (p.id !== user?.id) {
              searchResults.push({
                type: "user",
                id: p.id,
                title: p.username || "Unknown",
                imageUrl: p.avatar_url || undefined,
              });
            }
          });
        }
      } catch (e) {
        // ignore search errors
      }

      // Search tags
      try {
        const { data: tags } = await supabase
          .from("tags")
          .select("id, name, category, usage_count")
          .ilike("name", `%${q}%`)
          .order("usage_count", { ascending: false })
          .limit(5);

        if (tags) {
          tags.forEach((t: any) => {
            searchResults.push({
              type: "tag",
              id: t.id,
              title: t.name,
              subtitle: t.category ? `${t.category} · ${t.usage_count || 0} uses` : `${t.usage_count || 0} uses`,
            });
          });
        }
      } catch (e) {
        // ignore search errors
      }

      setResults(searchResults.slice(0, 10));
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, watches, user?.id]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === "watch") {
      navigate(`/watch/${result.id}`);
    } else if (result.type === "user") {
      navigate(`/user/${result.id}`);
    } else if (result.type === "tag") {
      navigate(`/log`);
    }
    setIsOpen(false);
    setQuery("");
  };

  const handleQuickLog = () => {
    navigate("/log");
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textMuted" />
        <Input
          ref={inputRef}
          placeholder={t("search.placeholder")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-9 h-9 rounded-full bg-surfaceMuted border-none text-sm"
          aria-label={t("search.placeholder")}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            aria-label={t("search.clear")}
          >
            <X className="h-4 w-4 text-textMuted" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (query.trim() || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-2 left-0 right-0 bg-surface border border-borderSubtle rounded-xl shadow-luxury overflow-hidden z-50"
          >
            {loading ? (
              <div className="p-4 text-center text-sm text-textMuted">{t("search.searching")}</div>
            ) : results.length === 0 && query.trim() ? (
              <div className="p-4 space-y-3">
                <p className="text-sm text-textMuted text-center">{t("search.noResults", { query })}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleQuickLog}
                  className="w-full justify-start gap-2 text-accent"
                >
                  <Plus className="h-4 w-4" />
                  {t("search.logAsWristCheck", { query })}
                </Button>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surfaceMuted transition-colors text-left"
                  >
                    <div className="h-8 w-8 rounded-lg bg-accentSubtle flex items-center justify-center shrink-0">
                      {result.type === "watch" ? (
                        result.imageUrl ? (
                          <img src={result.imageUrl} alt={result.title} className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <Watch className="h-4 w-4 text-accent" />
                        )
                      ) : result.type === "tag" ? (
                        <Tag className="h-4 w-4 text-accent" />
                      ) : (
                        <User className="h-4 w-4 text-accent" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-textMain truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-textMuted truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-textMuted font-medium">
                      {result.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
