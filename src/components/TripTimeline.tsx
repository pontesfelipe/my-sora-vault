import { useTranslation } from "react-i18next";
import { Trip } from "@/types/watch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, Palmtree, Eye, EyeOff, Pencil, Trash2, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { usePasscode } from "@/contexts/PasscodeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface TripTimelineProps {
  trips: Trip[];
  limit?: number;
  type: "trip" | "event";
  watches: { id: string; brand: string; model: string }[];
  onUpdate: () => void;
}

export const TripTimeline = ({ trips, limit, type, watches, onUpdate }: TripTimelineProps) => {
  const { t } = useTranslation();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  
  // Get available years from trips
  const availableYears = Array.from(
    new Set(trips.map(trip => {
      const date = new Date(trip.startDate);
      return date.getFullYear();
    }))
  ).sort((a, b) => b - a);
  
  // Filter trips by year
  const filteredTrips = selectedYear === "all" 
    ? trips 
    : trips.filter(trip => {
        const date = new Date(trip.startDate);
        return date.getFullYear().toString() === selectedYear;
      });
  
  const displayTrips = limit ? filteredTrips.slice(0, limit) : filteredTrips;
  const { isAdmin } = useAuth();
  const { isVerified, requestVerification } = usePasscode();
  const [showLocation, setShowLocation] = useState(isAdmin);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    location: "",
    startDate: "",
    watchDays: {} as Record<string, number>,
    totalDays: "1",
    purpose: "",
    notes: "",
  });

  const handleToggleLocation = () => {
    if (!showLocation) {
      if (isVerified) {
        setShowLocation(true);
      } else {
        requestVerification(() => {
          setShowLocation(true);
        });
      }
    } else {
      setShowLocation(false);
    }
  };

  // Auto-show location if already verified or if admin
  useEffect(() => {
    if (isVerified || isAdmin) {
      setShowLocation(true);
    }
  }, [isVerified, isAdmin]);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setLoading(true);
    try {
      const table = type === "trip" ? "trips" : "events";
      const { error } = await supabase.from(table).delete().eq("id", deleteId);
      
      if (error) throw error;
      
      toast.success(`${type === "trip" ? "Trip" : "Event"} deleted successfully`);
      setDeleteId(null);
      onUpdate();
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      toast.error(`Failed to delete ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedItems.size === 0) return;
    
    setLoading(true);
    try {
      const table = type === "trip" ? "trips" : "events";
      const { error } = await supabase
        .from(table)
        .delete()
        .in("id", Array.from(selectedItems));
      
      if (error) throw error;
      
      toast.success(`${selectedItems.size} ${type === "trip" ? "trip" : "event"}${selectedItems.size > 1 ? "s" : ""} deleted successfully`);
      setSelectedItems(new Set());
      await onUpdate(); // Wait for refresh
    } catch (error) {
      console.error(`Error deleting ${type}s:`, error);
      toast.error(`Failed to delete ${type}s`);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === displayTrips.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(displayTrips.map(t => t.id)));
    }
  };

  const handleEdit = (trip: Trip) => {
    setEditItem(trip);
    setFormData({
      location: trip.location,
      startDate: trip.startDate,
      watchDays: {},
      totalDays: trip.days.toString(),
      purpose: trip.purpose,
      notes: trip.notes || "",
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    
    setLoading(true);
    try {
      const totalDays = parseFloat(formData.totalDays);

      const table = type === "trip" ? "trips" : "events";
      const { error } = await supabase.from(table).update({
        location: formData.location,
        start_date: formData.startDate,
        days: totalDays,
        purpose: formData.purpose,
        notes: formData.notes || null,
      }).eq("id", editItem.id);
      
      if (error) throw error;
      
      toast.success(`${type === "trip" ? "Trip" : "Event"} updated successfully`);
      setEditItem(null);
      onUpdate();
    } catch (error) {
      console.error(`Error updating ${type}:`, error);
      toast.error(`Failed to update ${type}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {trips.length > 0 && (
          <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Year:</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(isVerified || isAdmin) && displayTrips.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedItems.size === displayTrips.length && displayTrips.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
                    Select All
                  </label>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedItems.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                  disabled={loading}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete {selectedItems.size} {type === "trip" ? "Trip" : "Event"}{selectedItems.size > 1 ? "s" : ""}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleLocation}
                className="gap-2 text-xs"
              >
                {showLocation ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Hide Locations
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Show Locations
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
        {displayTrips.map((trip, index) => {
          // Check if this trip is part of a consecutive group (same location + purpose)
          const prevTrip = index > 0 ? displayTrips[index - 1] : null;
          const nextTrip = index < displayTrips.length - 1 ? displayTrips[index + 1] : null;
          
          const isSameGroup = (t1: Trip | null, t2: Trip | null) => {
            if (!t1 || !t2) return false;
            return t1.location === t2.location && t1.purpose === t2.purpose;
          };
          
          const isFirstInGroup = !isSameGroup(prevTrip, trip);
          const isLastInGroup = !isSameGroup(trip, nextTrip);
          const isInGroup = isSameGroup(prevTrip, trip) || isSameGroup(trip, nextTrip);
          
          return (
          <div key={index} className="relative">
            {/* Connecting line for grouped items */}
            {isInGroup && !isLastInGroup && (
              <div className="absolute left-[52px] top-[72px] bottom-[-16px] w-0.5 bg-primary/30 z-0" />
            )}
            <Card className={`border-border bg-card p-6 hover:shadow-[var(--shadow-luxury)] transition-all duration-300 relative z-10 ${
              isInGroup && !isFirstInGroup ? 'border-l-2 border-l-primary/50' : ''
            } ${isInGroup ? 'ml-0' : ''}`}>
            <div className="flex items-start gap-4">
              {(isVerified || isAdmin) && (
                <Checkbox
                  checked={selectedItems.has(trip.id)}
                  onCheckedChange={() => toggleItemSelection(trip.id)}
                  className="mt-3"
                />
              )}
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                {trip.purpose === "Vacation" ? (
                  <Palmtree className="w-5 h-5 text-primary" />
                ) : (
                  <Briefcase className="w-5 h-5 text-primary" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">
                      {showLocation ? trip.location : "••••••"}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{trip.startDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={trip.purpose === "Vacation" ? "default" : "secondary"}>
                      {trip.purpose}
                    </Badge>
                    {(isVerified || isAdmin) && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(trip)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(trip.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="space-y-1">
                    {trip.linkedWatches && trip.linkedWatches.length > 0 ? (
                      trip.linkedWatches.map((lw) => (
                        <p key={lw.watchId} className="text-sm">
                          <span className="font-medium text-foreground">{lw.brand} {lw.model}</span>
                          <span className="mx-2 text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{lw.days} {lw.days === 1 ? 'day' : 'days'}</span>
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No watches linked via wear log</p>
                    )}
                    <p className="text-xs text-muted-foreground pt-1">
                      Total: {trip.days} {trip.days === 1 ? 'day' : 'days'}
                    </p>
                  </div>
                  {trip.notes && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{trip.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
          </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {type === "trip" ? "Trip" : "Event"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {type === "trip" ? "trip" : "event"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {type === "trip" ? "Trip" : "Event"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-startDate">{type === "trip" ? "Start Date" : "Date"}</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-totalDays">Total {type === "trip" ? "Trip" : "Event"} Days</Label>
              <Input
                id="edit-totalDays"
                type="number"
                step="0.5"
                min="0.5"
                value={formData.totalDays}
                onChange={(e) => setFormData({ ...formData, totalDays: e.target.value })}
                required
              />
            </div>
            {editItem?.linkedWatches && editItem.linkedWatches.length > 0 && (
              <div className="p-3 bg-muted/50 rounded-md">
                <Label className="text-sm text-muted-foreground">Linked Watches (from wear logs)</Label>
                <div className="mt-2 space-y-1">
                  {editItem.linkedWatches.map((lw) => (
                    <p key={lw.watchId} className="text-sm">
                      {lw.brand} {lw.model} • {lw.days} {lw.days === 1 ? 'day' : 'days'}
                    </p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  To change linked watches, edit the wear logs directly.
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="edit-purpose">{type === "trip" ? "Purpose" : "Purpose/Name"}</Label>
              {type === "trip" ? (
                <Select
                  value={formData.purpose}
                  onValueChange={(value) => setFormData({ ...formData, purpose: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="Vacation">Vacation</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="edit-purpose"
                  value={formData.purpose}
                  placeholder="e.g., Wedding, Gala, Conference"
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  required
                />
              )}
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional trip details, memories, etc..."
                className="bg-background border-border resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
