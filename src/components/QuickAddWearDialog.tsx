import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useCollection } from "@/contexts/CollectionContext";
import { CollectionType, getCollectionConfig, isWatchCollection } from "@/types/collection";

const wearSchema = z.object({
  watchId: z.string().uuid(),
  wearDate: z.string().min(1, "Date is required"),
  duration: z.enum(["1", "0.5", "0.25"]),
});

interface QuickAddWearDialogProps {
  watches: Array<{ id: string; brand: string; model: string }>;
  onSuccess: () => void;
  collectionType?: CollectionType;
}

export const QuickAddWearDialog = ({ watches, onSuccess, collectionType: propType }: QuickAddWearDialogProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedWatchId, setSelectedWatchId] = useState("");
  const [isTrip, setIsTrip] = useState(false);
  const [isEvent, setIsEvent] = useState(false);
  const [isWaterActivity, setIsWaterActivity] = useState(false);
  const [isSport, setIsSport] = useState(false);
  const [tripNotes, setTripNotes] = useState("");
  const [sportLocation, setSportLocation] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentCollectionType } = useCollection();
  
  const collectionType = propType || currentCollectionType || 'watches';
  const config = getCollectionConfig(collectionType);
  const isWatch = isWatchCollection(collectionType);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const data = wearSchema.parse({
        watchId: selectedWatchId,
        wearDate: formData.get("wearDate"),
        duration: formData.get("duration") as "1" | "0.5" | "0.25",
      });

      const days = parseFloat(data.duration);
      
      // Fix timezone issue: ensure the date is stored as-is without timezone conversion
      const dateObj = new Date(data.wearDate + 'T00:00:00');
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      let tripId = null;
      let eventId = null;
      let waterUsageId = null;
      let sportId = null;

      // Create trip if checkbox is checked
      if (isTrip) {
        const tripLocation = formData.get("tripLocation") as string;
        const tripPurpose = formData.get("tripPurpose") as string;

        if (tripLocation && tripPurpose) {
          const { data: tripData, error: tripError } = await supabase
            .from("trips")
            .insert({
              location: tripLocation,
              purpose: tripPurpose,
              start_date: formattedDate,
              days: days,
              notes: tripNotes || null,
              user_id: user?.id,
            })
            .select()
            .single();

          if (tripError) throw tripError;
          tripId = tripData.id;
        }
      }

      // Create event if checkbox is checked
      if (isEvent) {
        const eventLocation = formData.get("eventLocation") as string;
        const eventPurpose = formData.get("eventPurpose") as string;

        if (eventLocation && eventPurpose) {
          const { data: eventData, error: eventError } = await supabase
            .from("events")
            .insert({
              location: eventLocation,
              purpose: eventPurpose,
              start_date: formattedDate,
              days: days,
              user_id: user?.id,
            })
            .select()
            .single();

          if (eventError) throw eventError;
          eventId = eventData.id;
        }
      }

      // Create water usage if checkbox is checked
      if (isWaterActivity) {
        const waterActivityType = formData.get("waterActivityType") as string;
        const depthMeters = formData.get("depthMeters") as string;
        const durationMinutes = formData.get("durationMinutes") as string;
        const waterNotes = formData.get("waterNotes") as string;

        if (waterActivityType) {
          const { data: waterData, error: waterError } = await supabase
            .from("water_usage")
            .insert({
              watch_id: data.watchId,
              activity_type: waterActivityType,
              activity_date: formattedDate,
              depth_meters: depthMeters ? parseFloat(depthMeters) : null,
              duration_minutes: durationMinutes ? parseFloat(durationMinutes) : null,
              notes: waterNotes || null,
              user_id: user?.id,
            })
            .select()
            .single();

          if (waterError) throw waterError;
          waterUsageId = waterData.id;
        }
      }

      // Create sport if checkbox is checked
      if (isSport) {
        const sportType = formData.get("sportType") as string;
        const sportDuration = formData.get("sportDuration") as string;
        const sportNotes = formData.get("sportNotes") as string;

        if (sportType) {
          const { data: sportData, error: sportError } = await (supabase.from("sports" as any) as any)
            .insert({
              activity_date: formattedDate,
              sport_type: sportType,
              location: sportLocation || null,
              duration_minutes: sportDuration ? parseInt(sportDuration) : null,
              notes: sportNotes || null,
              user_id: user?.id,
            })
            .select()
            .single();

          if (sportError) throw sportError;
          sportId = sportData.id;
        }
      }
      
      // Check if entry already exists for this watch
      const { data: existing } = await supabase
        .from("wear_entries")
        .select("id, days")
        .eq("watch_id", data.watchId)
        .eq("wear_date", formattedDate)
        .eq("user_id", user?.id)
        .single();

      // Get all other entries for this date (excluding current watch)
      const { data: otherEntries } = await supabase
        .from("wear_entries")
        .select("id, watch_id, days")
        .eq("wear_date", formattedDate)
        .eq("user_id", user?.id)
        .neq("watch_id", data.watchId);

      // Calculate total duration of other entries
      const otherTotal = otherEntries?.reduce((sum, e) => sum + (e.days || 0), 0) || 0;
      
      // Calculate what the new total would be
      const newTotal = otherTotal + days;

      // Validate that total doesn't exceed 1 day
      if (newTotal > 1) {
        const remainingCapacity = Math.max(0, 1 - otherTotal);
        toast({
          title: t("quickAddWear.cannotAdd"),
          description: t("quickAddWear.exceedsDay", { remaining: remainingCapacity === 0 ? t("quickAddWear.noRemaining") : remainingCapacity, other: otherTotal }),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check for other watches logged on the same day with full day
      // If current entry is less than full day, we need to check and adjust existing full-day entries
      if (days < 1 && otherEntries && otherEntries.length > 0) {
        const fullDayEntries = otherEntries.filter(e => e.days === 1);
        
        if (fullDayEntries.length > 0) {
          // Get watch names for the affected entries
          const watchIds = fullDayEntries.map(e => e.watch_id);
          const { data: watchData } = await supabase
            .from("watches")
            .select("id, brand, model")
            .in("id", watchIds);

          const watchNames = watchData?.map(w => `${w.brand} ${w.model}`).join(", ") || "another watch";

          // Update the existing full-day entries to half-day
          for (const entry of fullDayEntries) {
            await supabase
              .from("wear_entries")
              .update({ days: 0.5 })
              .eq("id", entry.id);
          }

          toast({
            title: t("quickAddWear.adjustedEntry"),
            description: t("quickAddWear.adjustedDesc", { watches: watchNames }),
          });
        }
      }

      let error;
      if (existing) {
        // Update existing entry
        const result = await supabase
          .from("wear_entries")
          .update({
            days: days,
            trip_id: tripId,
            event_id: eventId,
            water_usage_id: waterUsageId,
            sport_id: sportId,
          } as any)
          .eq("id", existing.id);
        error = result.error;
      } else {
        // Insert new entry
        const result = await supabase.from("wear_entries").insert({
          watch_id: data.watchId,
          wear_date: formattedDate,
          days: days,
          trip_id: tripId,
          event_id: eventId,
          water_usage_id: waterUsageId,
          sport_id: sportId,
          user_id: user?.id,
        } as any);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: t("quickAddWear.success"),
        description: existing ? t("quickAddWear.entryUpdated") : t("quickAddWear.entryAdded"),
      });

      setOpen(false);
      setSelectedWatchId("");
      setIsTrip(false);
      setIsEvent(false);
      setIsWaterActivity(false);
      setIsSport(false);
      setSportLocation("");
      onSuccess();
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: t("quickAddWear.validationError"),
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t("quickAddWear.error"),
          description: t("quickAddWear.failedAdd"),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const sortedWatches = [...watches].sort((a, b) => {
    const brandCompare = a.brand.localeCompare(b.brand);
    if (brandCompare !== 0) return brandCompare;
    return a.model.localeCompare(b.model);
  });

  // Get today's date in local timezone
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          {t("quickAddWear.logUsage", { noun: config.usageNoun.charAt(0).toUpperCase() + config.usageNoun.slice(1) })}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{t("quickAddWear.quickAddTitle", { noun: config.usageNoun.charAt(0).toUpperCase() + config.usageNoun.slice(1) })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="watch">{t("quickAddWear.selectItem", { item: config.singularLabel })}</Label>
            <Select value={selectedWatchId} onValueChange={setSelectedWatchId} required>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder={t("quickAddWear.chooseItem", { item: config.singularLabel.toLowerCase() })} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border max-h-[300px]">
                {sortedWatches.map((watch) => (
                  <SelectItem key={watch.id} value={watch.id}>
                    {watch.brand} - {watch.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wearDate">{t("quickAddWear.date")}</Label>
            <Input
              id="wearDate"
              name="wearDate"
              type="date"
              required
              max={getTodayDate()}
              defaultValue={getTodayDate()}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("quickAddWear.duration", { noun: config.usageNoun.charAt(0).toUpperCase() + config.usageNoun.slice(1) })}</Label>
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="duration"
                  value="1"
                  defaultChecked
                  className="w-4 h-4"
                />
                <span className="text-sm">{t("quickAddWear.fullDay")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="duration"
                  value="0.5"
                  className="w-4 h-4"
                />
                <span className="text-sm">{t("quickAddWear.halfDay")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="duration"
                  value="0.25"
                  className="w-4 h-4"
                />
                <span className="text-sm">{t("quickAddWear.quarterDay")}</span>
              </label>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isTrip"
                checked={isTrip}
                onChange={(e) => setIsTrip(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="isTrip" className="cursor-pointer">{t("quickAddWear.linkToTrip")}</Label>
            </div>

            {isTrip && (
              <div className="space-y-2 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="tripLocation">{t("quickAddWear.location")}</Label>
                  <Input
                    id="tripLocation"
                    name="tripLocation"
                    placeholder={t("quickAddWear.locationPlaceholder")}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tripPurpose">{t("quickAddWear.purpose")}</Label>
                  <Select name="tripPurpose" defaultValue="Business">
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder={t("quickAddWear.selectPurpose")} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="Business">{t("quickAddWear.business")}</SelectItem>
                      <SelectItem value="Vacation">{t("quickAddWear.vacation")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tripNotes">{t("quickAddWear.notesOptional")}</Label>
                  <Textarea
                    id="tripNotes"
                    value={tripNotes}
                    onChange={(e) => setTripNotes(e.target.value)}
                    placeholder={t("quickAddWear.notesPlaceholder")}
                    className="bg-background border-border resize-none"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isEvent"
                checked={isEvent}
                onChange={(e) => setIsEvent(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="isEvent" className="cursor-pointer">{t("quickAddWear.linkToEvent")}</Label>
            </div>

            {isEvent && (
              <div className="space-y-2 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="eventLocation">{t("quickAddWear.location")}</Label>
                  <Input
                    id="eventLocation"
                    name="eventLocation"
                    placeholder={t("quickAddWear.eventLocationPlaceholder")}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventPurpose">{t("quickAddWear.purpose")}</Label>
                  <Input
                    id="eventPurpose"
                    name="eventPurpose"
                    placeholder={t("quickAddWear.eventPurposePlaceholder")}
                    className="bg-background border-border"
                  />
                </div>
              </div>
            )}

            {/* Water Activity - Only show for watches */}
            {isWatch && (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isWaterActivity"
                    checked={isWaterActivity}
                    onChange={(e) => setIsWaterActivity(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="isWaterActivity" className="cursor-pointer">{t("quickAddWear.linkToWaterActivity")}</Label>
                </div>

                {isWaterActivity && (
                  <div className="space-y-2 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="waterActivityType">{t("quickAddWear.activityType")}</Label>
                      <Select name="waterActivityType" defaultValue="Pool">
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder={t("quickAddWear.selectActivity")} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border z-50">
                          <SelectItem value="Pool">Pool</SelectItem>
                          <SelectItem value="Lake">Lake</SelectItem>
                          <SelectItem value="Beach">Beach</SelectItem>
                          <SelectItem value="Hot Tub">Hot Tub</SelectItem>
                          <SelectItem value="Diving">Diving</SelectItem>
                          <SelectItem value="Water Sports">Water Sports</SelectItem>
                          <SelectItem value="Snorkeling">Snorkeling</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="depthMeters">{t("quickAddWear.depthMeters")}</Label>
                        <Input
                          id="depthMeters"
                          name="depthMeters"
                          type="number"
                          step="0.1"
                          placeholder="e.g., 10"
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="durationMinutes">{t("quickAddWear.durationMinutes")}</Label>
                        <Input
                          id="durationMinutes"
                          name="durationMinutes"
                          type="number"
                          placeholder="e.g., 45"
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="waterNotes">{t("quickAddWear.notes")}</Label>
                      <Input
                        id="waterNotes"
                        name="waterNotes"
                        placeholder={t("quickAddWear.additionalDetails")}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Sport Activity */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isSport"
                checked={isSport}
                onChange={(e) => setIsSport(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="isSport" className="cursor-pointer flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                {t("quickAddWear.linkToSport")}
              </Label>
            </div>

            {isSport && (
              <div className="space-y-2 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="sportType">{t("quickAddWear.sportType")}</Label>
                  <Select name="sportType" defaultValue="Running">
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder={t("quickAddWear.selectSport")} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      <SelectItem value="Running">Running</SelectItem>
                      <SelectItem value="Cycling">Cycling</SelectItem>
                      <SelectItem value="Hiking">Hiking</SelectItem>
                      <SelectItem value="Golf">Golf</SelectItem>
                      <SelectItem value="Tennis">Tennis</SelectItem>
                      <SelectItem value="Basketball">Basketball</SelectItem>
                      <SelectItem value="Soccer">Soccer</SelectItem>
                      <SelectItem value="Gym">Gym</SelectItem>
                      <SelectItem value="Yoga">Yoga</SelectItem>
                      <SelectItem value="CrossFit">CrossFit</SelectItem>
                      <SelectItem value="Skiing">Skiing</SelectItem>
                      <SelectItem value="Snowboarding">Snowboarding</SelectItem>
                      <SelectItem value="Surfing">Surfing</SelectItem>
                      <SelectItem value="Climbing">Climbing</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sportLocation">{t("quickAddWear.sportLocationOptional")}</Label>
                  <Input
                    id="sportLocation"
                    value={sportLocation}
                    onChange={(e) => setSportLocation(e.target.value)}
                    placeholder={t("quickAddWear.sportLocationPlaceholder")}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sportDuration">{t("quickAddWear.sportDuration")}</Label>
                  <Input
                    id="sportDuration"
                    name="sportDuration"
                    type="number"
                    min="1"
                    placeholder="e.g., 60"
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sportNotes">{t("quickAddWear.sportNotesOptional")}</Label>
                  <Input
                    id="sportNotes"
                    name="sportNotes"
                    placeholder={t("quickAddWear.additionalDetails")}
                    className="bg-background border-border"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !selectedWatchId} className="flex-1">
              {loading ? t("quickAddWear.adding") : t("quickAddWear.addEntry")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              {t("quickAddWear.cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
