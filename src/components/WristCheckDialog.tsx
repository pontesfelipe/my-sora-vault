import { useState, useRef, useEffect } from "react";
import { Camera, Check, Plus, Watch, Tag, X, ChevronDown, Sparkles, Loader2, Calendar, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useWatchData } from "@/hooks/useWatchData";
import { useCollection } from "@/contexts/CollectionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWristCheck } from "@/contexts/WristCheckContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { queueWearEntry, syncWearQueue, getWearQueue } from "@/utils/offlineSync";
import { useTranslation } from "react-i18next";
import { AddWatchDialog } from "@/components/AddWatchDialog";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";

import { useUserTags } from "@/hooks/useUserTags";

export function WristCheckDialog() {
  const { isOpen, preSelectedWatchId, closeWristCheck } = useWristCheck();
  const { user } = useAuth();
  const { selectedCollectionId } = useCollection();
  const { watches, refetch } = useWatchData(selectedCollectionId);
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();
  const { tags: userTags, assignTagToWatch, getWatchTagIds } = useUserTags();

  useEffect(() => {
    if (isOnline) {
      const queue = getWearQueue();
      if (queue.length > 0) {
        syncWearQueue().then((synced) => {
          if (synced > 0) {
            toast.success(t("log.syncedOffline", { count: synced }));
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
  const [capturedPhotoBase64, setCapturedPhotoBase64] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifiedWatch, setIdentifiedWatch] = useState<any>(null);
  const [identificationError, setIdentificationError] = useState<string | null>(null);
  const [watchSearch, setWatchSearch] = useState("");
  const [showAddWatch, setShowAddWatch] = useState(false);
  const [addWatchPrefill, setAddWatchPrefill] = useState<any>(null);
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Array<{ brand: string; model: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedWatchId(preSelectedWatchId || "");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setTags([]);
      setCustomTag("");
      setNotes("");
      setPhotoFile(null);
      setPhotoPreview(null);
      setCapturedPhotoBase64(null);
      setIdentifiedWatch(null);
      setIdentificationError(null);
      setWatchSearch("");
      setShowAddWatch(false);
      setAddWatchPrefill(null);
      setRejectedSuggestions([]);
    }
  }, [isOpen, preSelectedWatchId]);

  const selectedWatch = watches.find((w) => w.id === selectedWatchId);

  const filteredWatches = watches.filter(
    (w) =>
      w.brand.toLowerCase().includes(watchSearch.toLowerCase()) ||
      w.model.toLowerCase().includes(watchSearch.toLowerCase())
  );

  const normalizeForCompare = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9\s.-]/g, " ").replace(/\s+/g, " ").trim();

  const modelStopWords: Set<string> = new Set([
    "automatic", "chronometer", "co", "axial", "master",
    "professional", "watch", "edition", "chronograph",
  ]);

  const extractModelTokens = (value: string): string[] =>
    normalizeForCompare(value)
      .split(/[\s/-]+/)
      .map((token) => token.replace(/^\.+|\.+$/g, ""))
      .filter((token) => {
        if (modelStopWords.has(token)) return false;
        if (/^\d+$/.test(token)) return token.length >= 2;
        return token.length >= 3;
      });

  const extractReferenceTokens = (value: string): string[] =>
    (normalizeForCompare(value).match(/[a-z0-9]{2,}(?:[.-][a-z0-9]{2,}){1,}/g) ?? []).filter((token) => /\d/.test(token));

  const mapTypeToFamily = (value?: string) => {
    const v = normalizeForCompare(value || "");
    if (!v) return "";
    if (v.includes("diver") || v.includes("dive")) return "diver";
    if (v.includes("chronograph") || v.includes("chrono")) return "chronograph";
    if (v.includes("gmt")) return "gmt";
    if (v.includes("dress")) return "dress";
    if (v.includes("pilot") || v.includes("aviation")) return "pilot";
    if (v.includes("field")) return "field";
    return "";
  };

  const extractColorFamily = (value?: string) => {
    const v = normalizeForCompare(value || "");
    if (!v) return "";
    const colors = ["black", "blue", "white", "silver", "green", "red", "brown", "gold", "grey", "gray", "orange", "yellow", "purple", "pink", "beige"];
    const match = colors.find((color) => v.includes(color));
    if (!match) return "";
    return match === "gray" ? "grey" : match;
  };

  const mapMovementFamily = (value?: string) => {
    const v = normalizeForCompare(value || "");
    if (!v) return "";
    if (v.includes("quartz")) return "quartz";
    if (v.includes("manual") || v.includes("hand wind") || v.includes("handwound")) return "manual";
    if (v.includes("automatic") || v.includes("self winding") || v.includes("self-winding") || v.includes("calibre") || v.includes("caliber")) return "automatic";
    return "";
  };

  const extractCaseSizeMm = (value?: string) => {
    const v = normalizeForCompare(value || "");
    if (!v) return null;
    const mmMatch = v.match(/(\d{2}(?:\.\d+)?)\s*mm/);
    if (mmMatch?.[1]) return Number(mmMatch[1]);
    const looseMatch = v.match(/\b(\d{2}(?:\.\d+)?)\b/);
    if (looseMatch?.[1]) return Number(looseMatch[1]);
    return null;
  };

  const findBestMatch = (
    brand: string, model: string, identifiedType?: string,
    identifiedDialColor?: string, identifiedCaseSize?: string,
    identifiedMovement?: string, identifiedComplications?: string[],
    identifiedCaseShape?: string
  ) => {
    const identifiedTypeFamily = mapTypeToFamily(identifiedType);
    const identifiedColorFamily = extractColorFamily(identifiedDialColor);
    const identifiedMovementFamily = mapMovementFamily(identifiedMovement);
    const identifiedCaseMm = extractCaseSizeMm(identifiedCaseSize);
    const normalizedIdentifiedComplications = (identifiedComplications || []).map(c => c.toLowerCase());

    const normalizedBrand = normalizeForCompare(brand).replace(/\s+/g, "");
    const normalizedModel = normalizeForCompare(model).replace(/[^a-z0-9]/g, "");
    if (!normalizedBrand || !normalizedModel) return null;

    const brandTokens = new Set(normalizeForCompare(brand).split(/\s+/).filter(t => t.length >= 3));
    const stripBrand = (tokens: string[]) => tokens.filter(t => !brandTokens.has(t));

    const identifiedTokens = stripBrand(extractModelTokens(model));
    const identifiedRefs = extractReferenceTokens(model);
    const identifiedPrimaryToken = identifiedTokens.find(
      (token) => /[a-z]/.test(token) && !/^\d/.test(token) && token !== "ref"
    );

    const brandMatches = watches.filter((w) => {
      const candidateBrand = normalizeForCompare(w.brand).replace(/\s+/g, "");
      return candidateBrand === normalizedBrand || candidateBrand.includes(normalizedBrand) || normalizedBrand.includes(candidateBrand);
    });

    if (brandMatches.length === 0) return null;

    let best: { watch: any; score: number } | null = null;

    for (const candidate of brandMatches) {
      const candidateBrandTokens = new Set(normalizeForCompare(candidate.brand).split(/\s+/).filter(t => t.length >= 3));
      const stripCandidateBrand = (tokens: string[]) => tokens.filter(t => !candidateBrandTokens.has(t));
      const candidateModelNormalized = normalizeForCompare(candidate.model).replace(/[^a-z0-9]/g, "");
      const candidateTokens = stripCandidateBrand(extractModelTokens(candidate.model));
      const candidateRefs = extractReferenceTokens(candidate.model);
      const candidatePrimaryToken = candidateTokens.find(
        (token) => /[a-z]/.test(token) && !/^\d/.test(token) && token !== "ref"
      );

      const candidateTypeFamily = mapTypeToFamily(candidate.type);
      const candidateColorFamily = extractColorFamily(candidate.dial_color);
      const candidateMovementFamily = mapMovementFamily(candidate.movement);
      const candidateCaseMm = extractCaseSizeMm(candidate.case_size);
      const candidateComplications = ((candidate as any).complications || []).map((c: string) => c.toLowerCase());

      const hasExactModel = candidateModelNormalized === normalizedModel;
      const hasReferenceMatch = identifiedRefs.length > 0 && candidateRefs.some((ref) => identifiedRefs.includes(ref));

      if (identifiedPrimaryToken && candidatePrimaryToken && identifiedPrimaryToken !== candidatePrimaryToken) continue;

      const hasComplicationOverlap = normalizedIdentifiedComplications.length > 0 && candidateComplications.length > 0 &&
        normalizedIdentifiedComplications.some((c: string) => candidateComplications.includes(c));

      if (identifiedTypeFamily && candidateTypeFamily && identifiedTypeFamily !== candidateTypeFamily && !hasComplicationOverlap) continue;
      if (identifiedColorFamily && candidateColorFamily && identifiedColorFamily !== candidateColorFamily) continue;
      if (identifiedMovementFamily && candidateMovementFamily && identifiedMovementFamily !== candidateMovementFamily) continue;
      if (identifiedCaseMm !== null && candidateCaseMm !== null && Math.abs(identifiedCaseMm - candidateCaseMm) > 2) continue;

      const sharedTokenCount = identifiedTokens.filter((token) => candidateTokens.includes(token)).length;
      const coverage = sharedTokenCount / Math.max(identifiedTokens.length || 1, candidateTokens.length || 1);
      const complicationMatches = normalizedIdentifiedComplications.filter((c: string) => candidateComplications.includes(c)).length;

      const matchedSignals = [
        identifiedTypeFamily && candidateTypeFamily && identifiedTypeFamily === candidateTypeFamily,
        identifiedColorFamily && candidateColorFamily && identifiedColorFamily === candidateColorFamily,
        identifiedMovementFamily && candidateMovementFamily && identifiedMovementFamily === candidateMovementFamily,
        identifiedCaseMm !== null && candidateCaseMm !== null && Math.abs(identifiedCaseMm - candidateCaseMm) <= 1,
        complicationMatches >= 2,
      ].filter(Boolean).length;

      if (!hasExactModel && !hasReferenceMatch && (sharedTokenCount < 2 || coverage < 0.5)) continue;
      if (!hasExactModel && !hasReferenceMatch && matchedSignals < 1) continue;

      const score = (hasExactModel ? 12 : 0) + (hasReferenceMatch ? 10 : 0) + sharedTokenCount + coverage + matchedSignals + complicationMatches * 2;

      if (!best || score > best.score) {
        best = { watch: candidate, score };
      }
    }

    return best?.watch ?? null;
  };

  const identifyFromImage = async (base64: string, exclusions: Array<{ brand: string; model: string }>) => {
    setIsIdentifying(true);
    setIdentifiedWatch(null);
    setIdentificationError(null);
    try {
      let data: any = null;
      let lastError: string | null = null;

      const body: any = { image: base64 };
      if (exclusions.length > 0) body.excluded_suggestions = exclusions;

      const res1 = await supabase.functions.invoke("identify-watch-from-photo", { body });

      if (res1.error || res1.data?.error) {
        lastError = res1.data?.error || res1.error?.message || "Identification failed";
        if (photoFile) {
          const compressed = await compressImage(photoFile, 1200, 0.6);
          const compressedBody: any = { image: compressed };
          if (exclusions.length > 0) compressedBody.excluded_suggestions = exclusions;
          const res2 = await supabase.functions.invoke("identify-watch-from-photo", { body: compressedBody });
          if (res2.error || res2.data?.error) {
            lastError = res2.data?.error || res2.error?.message || "Identification failed";
          } else if (res2.data) {
            data = res2.data;
            lastError = null;
          }
        }
      } else if (res1.data) {
        data = res1.data;
      }

      if (lastError || !data) {
        setIdentificationError(t("log.couldNotIdentifyAuto"));
        toast.error(lastError || t("log.couldNotIdentifyAuto"));
      } else {
        setIdentifiedWatch(data);
        const match = findBestMatch(data.brand, data.model, data.type, data.dial_color, data.case_size, data.movement, data.complications, data.case_shape);
        if (match) {
          setSelectedWatchId(match.id);
          setIdentifiedWatch(null);
          setIdentificationError(null);
          toast.success(t("log.matched", { name: `${match.brand} ${match.model}` }));
        } else {
          setIdentificationError(null);
          toast.info(t("log.identified", { name: `${data.brand || ""} ${data.model || ""}`.trim() }));
        }
      }
    } catch (err) {
      console.error("AI identification failed:", err);
      setIdentificationError(t("log.couldNotIdentifyAuto"));
      toast.error(`${t("log.couldNotIdentifyAuto")} ${t("log.addManuallyHint")}`);
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleNotMyWatch = async () => {
    if (!identifiedWatch || !photoPreview || !user) return;
    const rejection = { brand: identifiedWatch.brand || "", model: identifiedWatch.model || "" };
    const updatedRejections = [...rejectedSuggestions, rejection];
    setRejectedSuggestions(updatedRejections);

    supabase.from("watch_id_rejections").insert({
      user_id: user.id,
      rejected_brand: rejection.brand,
      rejected_model: rejection.model,
    }).then(() => {});

    toast.info(t("log.tryingAgain"));
    await identifyFromImage(photoPreview, updatedRejections);
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    setSelectedWatchId("");
    setIdentifiedWatch(null);
    setIdentificationError(null);
    setRejectedSuggestions([]);

    setIsIdentifying(true);
    try {
      const base64 = await fileToBase64(file);
      setPhotoPreview(base64);
      setCapturedPhotoBase64(base64);

      let pastRejections: Array<{ brand: string; model: string }> = [];
      if (user) {
        const { data: pastData } = await supabase
          .from("watch_id_rejections")
          .select("rejected_brand, rejected_model")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        if (pastData) {
          pastRejections = pastData.map(r => ({ brand: r.rejected_brand, model: r.rejected_model }));
          setRejectedSuggestions(pastRejections);
        }
      }

      setIsIdentifying(false);
      await identifyFromImage(base64, pastRejections);
    } catch (err) {
      console.error("AI identification failed:", err);
      setIdentificationError(t("log.couldNotIdentifyAuto"));
      toast.error(t("log.couldNotIdentifyAuto"));
      setIsIdentifying(false);
    }
  };

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const addCustomTag = () => {
    const tVal = customTag.trim();
    if (tVal && !tags.includes(tVal)) {
      setTags((prev) => [...prev, tVal]);
      setCustomTag("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedWatchId || !user) {
      toast.error(t("log.selectWatch"));
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
        toast.success(t("log.savedOffline"));
        closeWristCheck();
        return;
      }

      const { error } = await supabase.from("wear_entries").insert(entryData);

      if (error) throw error;

      toast.success(t("log.wristCheckLogged"));
      refetch();
      closeWristCheck();
    } catch (err: any) {
      if (!navigator.onLine) {
        queueWearEntry({
          watch_id: selectedWatchId,
          wear_date: date,
          days: 1,
          user_id: user!.id,
          notes: [notes, ...tags.map((t) => `#${t}`)].filter(Boolean).join(" ") || null,
          queued_at: Date.now(),
        });
        toast.success(t("log.savedOffline"));
        closeWristCheck();
      } else {
        toast.error(err.message || t("log.failedToLog"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ResponsiveDialog
        open={isOpen}
        onOpenChange={(open) => { if (!open) closeWristCheck(); }}
        title={t("log.title")}
        className="sm:max-w-lg"
      >
        <div className="space-y-5">
          {/* Date picker */}
          <div className="flex justify-end">
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
          <Card className="border-dashed border-2 border-borderSubtle rounded-2xl overflow-hidden cursor-pointer hover:border-accent/50 transition-colors">
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
            <input ref={uploadInputRef} type="file" accept="image/*" onChange={handlePhotoCapture} className="hidden" />
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="Watch photo" className="w-full h-48 object-cover" />
                {isIdentifying && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-accent">
                      <Sparkles className="h-5 w-5 animate-pulse" />
                      <span className="text-sm font-medium">{t("log.identifyingWatch")}</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoPreview(null);
                    setCapturedPhotoBase64(null);
                    setPhotoFile(null);
                    setIdentifiedWatch(null);
                    setIdentificationError(null);
                    setSelectedWatchId("");
                  }}
                  className="absolute top-2 right-2 h-8 w-8 bg-background/80 rounded-full flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4 py-10">
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 text-textMuted hover:text-accent transition-colors px-4">
                  <Camera className="h-8 w-8" />
                  <span className="text-sm font-medium">{t("log.takePhoto")}</span>
                </button>
                <div className="w-px h-12 bg-borderSubtle" />
                <button onClick={() => uploadInputRef.current?.click()} className="flex flex-col items-center gap-2 text-textMuted hover:text-accent transition-colors px-4">
                  <Upload className="h-8 w-8" />
                  <span className="text-sm font-medium">{t("log.upload")}</span>
                </button>
              </div>
            )}
          </Card>

          {/* AI Identification Result */}
          <AnimatePresence>
            {identifiedWatch && !selectedWatchId && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <Card className="p-4 bg-accentSubtle/30 border-accent/20">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-textMain">{identifiedWatch.brand} {identifiedWatch.model}</p>
                      {identifiedWatch.reference && <p className="text-xs text-textMuted">{t("log.ref", { ref: identifiedWatch.reference })}</p>}
                      <p className="text-xs text-textMuted mt-1">{t("log.notInCollection")}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Button size="sm" variant="default" onClick={() => {
                          const match = findBestMatch(identifiedWatch.brand, identifiedWatch.model, identifiedWatch.type, identifiedWatch.dial_color, identifiedWatch.case_size, identifiedWatch.movement);
                          if (match) {
                            setSelectedWatchId(match.id);
                            setIdentifiedWatch(null);
                            setIdentificationError(null);
                            toast.success(t("log.matched", { name: `${match.brand} ${match.model}` }));
                          } else {
                            setAddWatchPrefill({
                              brand: identifiedWatch.brand || "", model: identifiedWatch.model || "",
                              dial_color: identifiedWatch.dial_color || "", type: identifiedWatch.type || "automatic",
                              case_size: identifiedWatch.case_size || "", movement: identifiedWatch.movement || "",
                              referenceImageBase64: capturedPhotoBase64 || photoPreview || undefined,
                            });
                            setShowAddWatch(true);
                            setIdentifiedWatch(null);
                            setIdentificationError(null);
                          }
                        }}>
                          <Plus className="h-4 w-4 mr-1" />{t("log.addToCollection")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleNotMyWatch} disabled={isIdentifying}>
                          {isIdentifying ? (<><Loader2 className="h-4 w-4 mr-1 animate-spin" />{t("log.retrying")}</>) : (<><X className="h-4 w-4 mr-1" />{t("log.notMyWatch")}</>)}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setIdentifiedWatch(null)}>{t("log.dismiss")}</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {identificationError && !identifiedWatch && !selectedWatchId && !isIdentifying && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <Card className="p-4 bg-surfaceMuted border-borderSubtle">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-textMain">{t("log.couldNotIdentifyAuto")}</p>
                    <p className="text-xs text-textMuted">{t("log.addManuallyHint")}</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => {
                        setAddWatchPrefill({ referenceImageBase64: capturedPhotoBase64 || photoPreview || undefined });
                        setShowAddWatch(true);
                      }}>
                        <Plus className="h-4 w-4 mr-1" />{t("log.addWatchManually")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setIdentificationError(null); setShowWatchPicker(true); }}>
                        {t("log.pickFromCollection")}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Watch Selector */}
          <div>
            <label className="text-sm font-medium text-textMain mb-2 block">{t("log.watch")}</label>
            {selectedWatch ? (
              <Card
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surfaceMuted transition-colors border-borderSubtle"
                onClick={() => { setSelectedWatchId(""); setShowWatchPicker(true); }}
              >
                <div className="h-10 w-10 rounded-xl bg-surfaceMuted overflow-hidden shrink-0">
                  {selectedWatch.ai_image_url ? (
                    <img src={selectedWatch.ai_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center"><Watch className="h-4 w-4 text-textMuted" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-textMain truncate">{selectedWatch.brand} {selectedWatch.model}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-textMuted" />
              </Card>
            ) : (
              <div className="space-y-2">
                <Input placeholder={t("log.searchCollection")} value={watchSearch} onChange={(e) => setWatchSearch(e.target.value)} onFocus={() => setShowWatchPicker(true)} />
                <AnimatePresence>
                  {(showWatchPicker || watchSearch) && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="max-h-48 overflow-y-auto rounded-xl border border-borderSubtle">
                      {filteredWatches.length === 0 ? (
                        <div className="p-4 text-center space-y-2">
                          <p className="text-sm text-textMuted">{t("log.noWatchesFound")}</p>
                          {watchSearch.trim() && (
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setAddWatchPrefill({ brand: watchSearch.trim(), model: "" }); setShowAddWatch(true); }}>
                              <Plus className="h-4 w-4" />{t("log.addToCollectionSearch", { query: watchSearch.trim() })}
                            </Button>
                          )}
                        </div>
                      ) : (
                        filteredWatches.map((w) => (
                          <button key={w.id} onClick={() => { setSelectedWatchId(w.id); setShowWatchPicker(false); setWatchSearch(""); }} className="w-full flex items-center gap-3 p-3 hover:bg-surfaceMuted transition-colors text-left">
                            <div className="h-8 w-8 rounded-lg bg-surfaceMuted overflow-hidden shrink-0">
                              {w.ai_image_url ? <img src={w.ai_image_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center"><Watch className="h-3 w-3 text-textMuted" /></div>}
                            </div>
                            <span className="text-sm text-textMain truncate">{w.brand} {w.model}</span>
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
              <Tag className="h-3.5 w-3.5 inline mr-1" />{t("log.tags")}
            </label>
            {userTags.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-2">
                {userTags.map((ut) => (
                  <Badge key={ut.id} variant={tags.includes(ut.name) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors py-2 px-4 ${tags.includes(ut.name) ? "bg-accent text-accent-foreground" : "hover:bg-surfaceMuted"}`}
                    onClick={() => toggleTag(ut.name)}>{ut.name}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mb-2">No tags created yet. Create tags in Settings or Canvas.</p>
            )}
            <div className="flex gap-2">
              <Input placeholder={t("log.addCustomTag")} value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTag())} className="text-sm" />
              {customTag && <Button size="sm" variant="outline" onClick={addCustomTag}><Plus className="h-4 w-4" /></Button>}
            </div>
            {tags.filter((tg) => !userTags.some(ut => ut.name === tg)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.filter((tg) => !userTags.some(ut => ut.name === tg)).map((tag) => (
                  <Badge key={tag} className="gap-1 bg-accent text-accent-foreground">{tag}<X className="h-3 w-3 cursor-pointer" onClick={() => toggleTag(tag)} /></Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <details className="group">
            <summary className="text-sm font-medium text-textMuted cursor-pointer list-none flex items-center gap-1">
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />{t("log.addNotes")}
            </summary>
            <Textarea placeholder={t("log.notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2 min-h-[60px]" />
          </details>

          {/* Submit */}
          <Button onClick={handleSubmit} disabled={!selectedWatchId || isSubmitting} className="w-full h-12 rounded-2xl text-base font-semibold" size="lg">
            {isSubmitting ? (<><Loader2 className="h-5 w-5 animate-spin mr-2" />{t("log.logging")}</>) : (<><Check className="h-5 w-5 mr-2" />{t("log.logWristCheck")}</>)}
          </Button>
        </div>
      </ResponsiveDialog>

      {/* Inline AddWatchDialog */}
      <AddWatchDialog
        onSuccess={(newWatchId) => {
          refetch().then(() => {
            if (newWatchId) {
              setSelectedWatchId(newWatchId);
              toast.success(t("log.watchAddedSelected"));
            }
          });
          setShowAddWatch(false);
          setAddWatchPrefill(null);
          setIdentifiedWatch(null);
          setIdentificationError(null);
        }}
        externalOpen={showAddWatch}
        onExternalOpenChange={setShowAddWatch}
        prefill={addWatchPrefill}
      />
    </>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImage(file: File, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
