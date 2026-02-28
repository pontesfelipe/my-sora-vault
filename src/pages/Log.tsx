import { useState, useRef, useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";
import { useNavigate } from "react-router-dom";
import { Camera, Check, Plus, Watch, Tag, X, ChevronDown, Sparkles, Loader2, Calendar, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useWatchData } from "@/hooks/useWatchData";
import { useCollection } from "@/contexts/CollectionContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { queueWearEntry, syncWearQueue, getWearQueue } from "@/utils/offlineSync";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddWatchDialog } from "@/components/AddWatchDialog";

const SUGGESTED_TAGS = [
  "Daily", "Office", "Casual", "Formal", "Trip", "Event",
  "Sport", "Date Night", "Weekend", "Special Occasion",
];

const Log = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedCollectionId } = useCollection();
  const { watches, refetch } = useWatchData(selectedCollectionId);
  const isOnline = useOnlineStatus();

  // Sync queued entries when coming back online
  useEffect(() => {
    if (isOnline) {
      const queue = getWearQueue();
      if (queue.length > 0) {
        syncWearQueue().then((synced) => {
          if (synced > 0) {
            toast.success(`Synced ${synced} offline wear ${synced === 1 ? "entry" : "entries"}`);
            refetch();
          }
        });
      }
    }
  }, [isOnline]);

  const [selectedWatchId, setSelectedWatchId] = useState<string>("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWatchPicker, setShowWatchPicker] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifiedWatch, setIdentifiedWatch] = useState<any>(null);
  const [watchSearch, setWatchSearch] = useState("");
  const [showAddWatch, setShowAddWatch] = useState(false);
  const [addWatchPrefill, setAddWatchPrefill] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const selectedWatch = watches.find((w) => w.id === selectedWatchId);

  const filteredWatches = watches.filter(
    (w) =>
      w.brand.toLowerCase().includes(watchSearch.toLowerCase()) ||
      w.model.toLowerCase().includes(watchSearch.toLowerCase())
  );

  // Fuzzy match: checks if brand matches and model shares significant keywords
  const findBestMatch = (brand: string, model: string) => {
    const b = brand?.toLowerCase().trim() || "";
    const m = model?.toLowerCase().trim() || "";
    if (!b) return null;

    // Try exact match first
    const exact = watches.find(
      (w) => w.brand.toLowerCase() === b && w.model.toLowerCase() === m
    );
    if (exact) return exact;

    // Try brand match + model keyword overlap
    const brandMatches = watches.filter(
      (w) => w.brand.toLowerCase().includes(b) || b.includes(w.brand.toLowerCase())
    );

    if (brandMatches.length === 0) return null;

    // Score each by shared model words (4+ char)
    const modelWords = m.replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length >= 3);
    let best: { watch: any; score: number } | null = null;

    for (const w of brandMatches) {
      const wWords = w.model.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((x: string) => x.length >= 3);
      const score = modelWords.filter((word) => wWords.some((ww: string) => ww.includes(word) || word.includes(ww))).length;
      if (score > 0 && (!best || score > best.score)) {
        best = { watch: w, score };
      }
    }

    // If only one brand match and no model keywords, still suggest it
    if (!best && brandMatches.length === 1) return brandMatches[0];

    return best?.watch || null;
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Try AI identification
    setIsIdentifying(true);
    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("identify-watch-from-photo", {
        body: { image: base64 },
      });

      if (error) {
        console.error("Identification error:", error);
        toast.error("Could not identify watch. Try selecting manually.");
      } else if (data?.error) {
        console.error("Identification error:", data.error);
        toast.error(data.error);
      } else if (data) {
        setIdentifiedWatch(data);

        // Auto-match to collection
        const match = findBestMatch(data.brand, data.model);
        if (match) {
          setSelectedWatchId(match.id);
          toast.success(`Matched: ${match.brand} ${match.model}`);
          setIdentifiedWatch(null); // Clear since we auto-matched
        } else {
          toast.info(`Identified: ${data.brand || ""} ${data.model || ""}`.trim() + " — not in your collection");
        }
      }
    } catch (err) {
      console.error("AI identification failed:", err);
      toast.error("Could not identify watch. Try selecting manually.");
    } finally {
      setIsIdentifying(false);
    }
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const t = customTag.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
      setCustomTag("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedWatchId || !user) {
      toast.error("Please select a watch");
      return;
    }

    setIsSubmitting(true);
    try {
      const entryData = {
        watch_id: selectedWatchId,
        wear_date: date,
        days: 1,
        user_id: user.id,
        notes: [notes, ...tags.map((t) => `#${t}`)].filter(Boolean).join(" ") || null,
      };

      if (!isOnline) {
        queueWearEntry({ ...entryData, queued_at: Date.now() });
        toast.success("Saved offline — will sync when reconnected");
        navigate("/");
        return;
      }

      const { error } = await supabase.from("wear_entries").insert(entryData);

      if (error) throw error;

      toast.success("Wrist check logged! 🎉");
      refetch();
      navigate("/");
    } catch (err: any) {
      // If network error, queue offline
      if (!navigator.onLine) {
        queueWearEntry({
          watch_id: selectedWatchId,
          wear_date: date,
          days: 1,
          user_id: user.id,
          notes: [notes, ...tags.map((t) => `#${t}`)].filter(Boolean).join(" ") || null,
          queued_at: Date.now(),
        });
        toast.success("Saved offline — will sync when reconnected");
        navigate("/");
      } else {
        toast.error(err.message || "Failed to log");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
    <div className="space-y-5 pb-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textMain">Wrist Check</h1>
          <p className="text-sm text-textMuted">What are you wearing today?</p>
        </div>
        <button
          onClick={() => {
            const input = document.createElement("input");
            input.type = "date";
            input.value = date;
            input.onchange = (e) => setDate((e.target as HTMLInputElement).value);
            input.showPicker?.();
            input.click();
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surfaceMuted text-sm font-medium text-textMain border border-borderSubtle active:scale-95 transition-transform"
        >
          <Calendar className="h-4 w-4 text-accent" />
          {format(new Date(date + "T00:00:00"), "MMM d")}
        </button>
      </div>

      {/* Photo Capture */}
      <Card
        className="border-dashed border-2 border-borderSubtle rounded-2xl overflow-hidden cursor-pointer hover:border-accent/50 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoCapture}
          className="hidden"
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoCapture}
          className="hidden"
        />
        {photoPreview ? (
          <div className="relative">
            <img
              src={photoPreview}
              alt="Watch photo"
              className="w-full h-48 object-cover"
            />
            {isIdentifying && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="flex items-center gap-2 text-accent">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                  <span className="text-sm font-medium">Identifying watch...</span>
                </div>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPhotoPreview(null);
                setPhotoFile(null);
                setIdentifiedWatch(null);
                setSelectedWatchId("");
              }}
              className="absolute top-2 right-2 h-8 w-8 bg-background/80 rounded-full flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4 py-10">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 text-textMuted hover:text-accent transition-colors px-4"
            >
              <Camera className="h-8 w-8" />
              <span className="text-sm font-medium">Take Photo</span>
            </button>
            <div className="w-px h-12 bg-borderSubtle" />
            <button
              onClick={() => uploadInputRef.current?.click()}
              className="flex flex-col items-center gap-2 text-textMuted hover:text-accent transition-colors px-4"
            >
              <Upload className="h-8 w-8" />
              <span className="text-sm font-medium">Upload</span>
            </button>
          </div>
        )}
      </Card>

      {/* AI Identified — not in collection */}
      <AnimatePresence>
        {identifiedWatch && !selectedWatchId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4 bg-accentSubtle/30 border-accent/20">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-textMain">
                    {identifiedWatch.brand} {identifiedWatch.model}
                  </p>
                  {identifiedWatch.reference && (
                    <p className="text-xs text-textMuted">Ref: {identifiedWatch.reference}</p>
                  )}
                  <p className="text-xs text-textMuted mt-1">Not found in your collection</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="default" onClick={() => {
                      // Try fuzzy match one more time
                      const match = findBestMatch(identifiedWatch.brand, identifiedWatch.model);
                      if (match) {
                        setSelectedWatchId(match.id);
                        setIdentifiedWatch(null);
                        toast.success(`Matched: ${match.brand} ${match.model}`);
                      } else {
                        // Open AddWatchDialog with pre-filled data
                        setAddWatchPrefill({
                          brand: identifiedWatch.brand || "",
                          model: identifiedWatch.model || "",
                          dial_color: identifiedWatch.dial_color || "",
                          type: identifiedWatch.type || "automatic",
                          case_size: identifiedWatch.case_size || "",
                          movement: identifiedWatch.movement || "",
                        });
                        setShowAddWatch(true);
                        setIdentifiedWatch(null);
                      }
                    }}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add to Collection
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIdentifiedWatch(null)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Watch Selector */}
      <div>
        <label className="text-sm font-medium text-textMain mb-2 block">Watch</label>
        {selectedWatch ? (
          <Card
            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surfaceMuted transition-colors border-borderSubtle"
            onClick={() => {
              setSelectedWatchId("");
              setShowWatchPicker(true);
            }}
          >
            <div className="h-10 w-10 rounded-xl bg-surfaceMuted overflow-hidden shrink-0">
              {selectedWatch.ai_image_url ? (
                <img src={selectedWatch.ai_image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Watch className="h-4 w-4 text-textMuted" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-textMain truncate">
                {selectedWatch.brand} {selectedWatch.model}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-textMuted" />
          </Card>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="Search your collection..."
              value={watchSearch}
              onChange={(e) => setWatchSearch(e.target.value)}
              onFocus={() => setShowWatchPicker(true)}
            />
            <AnimatePresence>
              {(showWatchPicker || watchSearch) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="max-h-48 overflow-y-auto rounded-xl border border-borderSubtle"
                >
                  {filteredWatches.length === 0 ? (
                    <div className="p-4 text-center space-y-2">
                      <p className="text-sm text-textMuted">No watches found</p>
                      {watchSearch.trim() && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => {
                            setAddWatchPrefill({ brand: watchSearch.trim(), model: "" });
                            setShowAddWatch(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          Add "{watchSearch.trim()}" to collection
                        </Button>
                      )}
                    </div>
                  ) : (
                    filteredWatches.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => {
                          setSelectedWatchId(w.id);
                          setShowWatchPicker(false);
                          setWatchSearch("");
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-surfaceMuted transition-colors text-left"
                      >
                        <div className="h-8 w-8 rounded-lg bg-surfaceMuted overflow-hidden shrink-0">
                          {w.ai_image_url ? (
                            <img src={w.ai_image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Watch className="h-3 w-3 text-textMuted" />
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-textMain truncate">
                          {w.brand} {w.model}
                        </span>
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="text-sm font-medium text-textMain mb-2 block">
          <Tag className="h-3.5 w-3.5 inline mr-1" />
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {SUGGESTED_TAGS.map((tag) => (
            <Badge
              key={tag}
              variant={tags.includes(tag) ? "default" : "outline"}
              className={`cursor-pointer transition-colors py-2 px-4 ${
                tags.includes(tag)
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-surfaceMuted"
              }`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add custom tag..."
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTag())}
            className="text-sm"
          />
          {customTag && (
            <Button size="sm" variant="outline" onClick={addCustomTag}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        {tags.filter((t) => !SUGGESTED_TAGS.includes(t)).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags
              .filter((t) => !SUGGESTED_TAGS.includes(t))
              .map((tag) => (
                <Badge key={tag} className="gap-1 bg-accent text-accent-foreground">
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => toggleTag(tag)} />
                </Badge>
              ))}
          </div>
        )}
      </div>

      {/* Notes (optional, progressive disclosure) */}
      <details className="group">
        <summary className="text-sm font-medium text-textMuted cursor-pointer list-none flex items-center gap-1">
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          Add notes (optional)
        </summary>
        <Textarea
          placeholder="How's it wearing today?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-2 min-h-[60px]"
        />
      </details>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!selectedWatchId || isSubmitting}
        className="w-full h-12 rounded-2xl text-base font-semibold"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Logging...
          </>
        ) : (
          <>
            <Check className="h-5 w-5 mr-2" />
            Log Wrist Check
          </>
        )}
      </Button>

      {/* Inline AddWatchDialog for adding from wrist check */}
      <AddWatchDialog
        onSuccess={() => {
          refetch();
          setShowAddWatch(false);
          setAddWatchPrefill(null);
          toast.success("Watch added! Now select it to log your wrist check.");
        }}
        externalOpen={showAddWatch}
        onExternalOpenChange={setShowAddWatch}
        prefill={addWatchPrefill}
      />
    </div>
    </PageTransition>
  );
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Return the full data URI (data:image/...;base64,...) — required by the AI Gateway
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default Log;
