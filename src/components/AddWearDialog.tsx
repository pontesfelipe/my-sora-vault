import { useState } from "react";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Flag, Droplets, Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";


const wearSchema = z.object({
  watchId: z.string().uuid(),
  wearDate: z.string().min(1, "Date is required"),
  duration: z.enum(["1", "0.5", "0.25"]),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
});

export const AddWearDialog = ({ watchId, onSuccess }: { watchId: string; onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTrip, setIsTrip] = useState(false);
  const [isEvent, setIsEvent] = useState(false);
  const [isWaterActivity, setIsWaterActivity] = useState(false);
  const [isSport, setIsSport] = useState(false);
  const [tripLocation, setTripLocation] = useState("");
  const [tripNotes, setTripNotes] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [sportLocation, setSportLocation] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const data = wearSchema.parse({
        watchId,
        wearDate: formData.get("wearDate"),
        duration: formData.get("duration") as "1" | "0.5" | "0.25",
        notes: formData.get("notes") || undefined,
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

      // Create trip if marked
      if (isTrip) {
        const tripPurpose = formData.get("tripPurpose") as string;
        
        const { data: tripData, error: tripError } = await supabase
          .from("trips")
          .insert({
            location: tripLocation,
            start_date: formattedDate,
            days: days,
            purpose: tripPurpose,
            notes: tripNotes || null,
            watch_model: { [`${watchId}`]: days },
            user_id: user?.id,
          })
          .select()
          .single();
        
        if (tripError) throw tripError;
        tripId = tripData.id;
      }

      // Create event if marked
      if (isEvent) {
        const eventPurpose = formData.get("eventPurpose") as string;
        
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .insert({
            location: eventLocation,
            start_date: formattedDate,
            days: days,
            purpose: eventPurpose,
            watch_model: { [`${watchId}`]: days },
            user_id: user?.id,
          })
          .select()
          .single();
        
        if (eventError) throw eventError;
        eventId = eventData.id;
      }

      // Create water usage if marked
      if (isWaterActivity) {
        const activityType = formData.get("waterActivityType") as string;
        const depthMeters = formData.get("depthMeters") ? parseFloat(formData.get("depthMeters") as string) : null;
        const durationMinutes = formData.get("durationMinutes") ? parseFloat(formData.get("durationMinutes") as string) : null;
        const waterNotes = formData.get("waterNotes") as string || null;
        
        const { data: waterData, error: waterError } = await supabase
          .from("water_usage")
          .insert({
            watch_id: watchId,
            activity_date: formattedDate,
            activity_type: activityType,
            depth_meters: depthMeters,
            duration_minutes: durationMinutes,
            notes: waterNotes,
            user_id: user?.id,
          })
          .select()
          .single();
        
        if (waterError) throw waterError;
        waterUsageId = waterData.id;
      }

      // Create sport if marked
      if (isSport) {
        const sportType = formData.get("sportType") as string;
        const sportDuration = formData.get("sportDuration") ? parseInt(formData.get("sportDuration") as string) : null;
        const sportNotes = formData.get("sportNotes") as string || null;
        
        const { data: sportData, error: sportError } = await (supabase.from("sports" as any) as any)
          .insert({
            activity_date: formattedDate,
            sport_type: sportType,
            location: sportLocation || null,
            duration_minutes: sportDuration,
            notes: sportNotes,
            user_id: user?.id,
          })
          .select()
          .single();
        
        if (sportError) throw sportError;
        sportId = sportData.id;
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
          title: "Cannot add wear entry",
          description: `Total wear for this date would exceed 1 day. You have ${remainingCapacity === 0 ? 'no' : remainingCapacity} remaining capacity. Other watches are already logged for ${otherTotal} day(s).`,
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
            title: "Adjusted existing entry",
            description: `${watchNames} was logged for a full day on this date. Changed to half day to accommodate this entry.`,
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
            notes: data.notes,
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
          notes: data.notes,
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
        title: "Success",
        description: existing ? "Wear entry updated" : "Wear entry added",
      });

      setOpen(false);
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
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add wear entry",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="gap-2">
        <Calendar className="w-4 h-4" />
        Log Wear
      </Button>
      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Add Wear Entry" className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wearDate">Date</Label>
            <Input
              id="wearDate"
              name="wearDate"
              type="date"
              required
              max={new Date().toISOString().split('T')[0]}
              defaultValue={new Date().toISOString().split('T')[0]}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label>Wear Duration</Label>
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="duration"
                  value="1"
                  defaultChecked
                  className="w-4 h-4"
                />
                <span className="text-sm">Full Day</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="duration"
                  value="0.5"
                  className="w-4 h-4"
                />
                <span className="text-sm">Half Day</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="duration"
                  value="0.25"
                  className="w-4 h-4"
                />
                <span className="text-sm">Quarter Day</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Add any notes about this wear session..."
              maxLength={500}
              className="bg-background border-border resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-4 pt-2 border-t border-border">
            <Label className="text-sm font-semibold">Link to Activity (Optional)</Label>
            
            {/* Trip Checkbox and Fields */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isTrip"
                  checked={isTrip}
                  onCheckedChange={(checked) => setIsTrip(checked as boolean)}
                />
                <Label htmlFor="isTrip" className="flex items-center gap-2 cursor-pointer font-normal">
                  <MapPin className="w-4 h-4 text-primary" />
                  This wear was during a trip
                </Label>
              </div>
              {isTrip && (
                <div className="ml-6 space-y-3 p-3 bg-muted/50 rounded-md">
                  <div>
                    <Label htmlFor="tripLocation" className="text-sm">Location</Label>
                    <Input
                      id="tripLocation"
                      value={tripLocation}
                      onChange={(e) => setTripLocation(e.target.value)}
                      placeholder="Enter trip location..."
                      className="bg-background"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tripPurpose" className="text-sm">Purpose</Label>
                    <Select name="tripPurpose" defaultValue="Vacation">
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Vacation">Vacation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tripNotes" className="text-sm">Notes (Optional)</Label>
                    <Textarea
                      id="tripNotes"
                      value={tripNotes}
                      onChange={(e) => setTripNotes(e.target.value)}
                      placeholder="Add any notes about this trip..."
                      className="bg-background resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Event Checkbox and Fields */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isEvent"
                  checked={isEvent}
                  onCheckedChange={(checked) => setIsEvent(checked as boolean)}
                />
                <Label htmlFor="isEvent" className="flex items-center gap-2 cursor-pointer font-normal">
                  <Flag className="w-4 h-4 text-primary" />
                  This wear was during an event
                </Label>
              </div>
              {isEvent && (
                <div className="ml-6 space-y-3 p-3 bg-muted/50 rounded-md">
                  <div>
                    <Label htmlFor="eventLocation" className="text-sm">Location</Label>
                    <Input
                      id="eventLocation"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      placeholder="Enter event location..."
                      className="bg-background"
                    />
                  </div>
                  <div>
                    <Label htmlFor="eventPurpose" className="text-sm">Event Name/Purpose</Label>
                    <Input
                      id="eventPurpose"
                      name="eventPurpose"
                      placeholder="e.g., Wedding, Conference"
                      required={isEvent}
                      className="bg-background"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Water Activity Checkbox and Fields */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isWaterActivity"
                  checked={isWaterActivity}
                  onCheckedChange={(checked) => setIsWaterActivity(checked as boolean)}
                />
                <Label htmlFor="isWaterActivity" className="flex items-center gap-2 cursor-pointer font-normal">
                  <Droplets className="w-4 h-4 text-primary" />
                  This wear involved water activity
                </Label>
              </div>
              {isWaterActivity && (
                <div className="ml-6 space-y-3 p-3 bg-muted/50 rounded-md">
                  <div>
                    <Label htmlFor="waterActivityType" className="text-sm">Activity Type</Label>
                    <Select name="waterActivityType" defaultValue="Lake">
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="depthMeters" className="text-sm">Depth (meters)</Label>
                      <Input
                        id="depthMeters"
                        name="depthMeters"
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                        className="bg-background"
                      />
                    </div>
                    <div>
                      <Label htmlFor="durationMinutes" className="text-sm">Duration (min)</Label>
                      <Input
                        id="durationMinutes"
                        name="durationMinutes"
                        type="number"
                        min="1"
                        placeholder="30"
                        className="bg-background"
                      />
            </div>

            {/* Sport Activity Checkbox and Fields */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isSport"
                  checked={isSport}
                  onCheckedChange={(checked) => setIsSport(checked as boolean)}
                />
                <Label htmlFor="isSport" className="flex items-center gap-2 cursor-pointer font-normal">
                  <Dumbbell className="w-4 h-4 text-primary" />
                  This wear was during a sport activity
                </Label>
              </div>
              {isSport && (
                <div className="ml-6 space-y-3 p-3 bg-muted/50 rounded-md">
                  <div>
                    <Label htmlFor="sportType" className="text-sm">Sport Type</Label>
                    <Select name="sportType" defaultValue="Running">
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
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
                  <div>
                    <Label htmlFor="sportLocation" className="text-sm">Location (Optional)</Label>
                    <Input
                      id="sportLocation"
                      value={sportLocation}
                      onChange={(e) => setSportLocation(e.target.value)}
                      placeholder="e.g., Central Park, Local Gym"
                      className="bg-background"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sportDuration" className="text-sm">Duration (minutes)</Label>
                    <Input
                      id="sportDuration"
                      name="sportDuration"
                      type="number"
                      min="1"
                      placeholder="60"
                      className="bg-background"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sportNotes" className="text-sm">Sport Notes (Optional)</Label>
                    <Textarea
                      id="sportNotes"
                      name="sportNotes"
                      placeholder="Additional details..."
                      className="bg-background resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
                  <div>
                    <Label htmlFor="waterNotes" className="text-sm">Water Activity Notes</Label>
                    <Textarea
                      id="waterNotes"
                      name="waterNotes"
                      placeholder="Additional details..."
                      className="bg-background resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Adding..." : "Add Entry"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </ResponsiveDialog>
    </>
  );
};
