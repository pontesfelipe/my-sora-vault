import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, MapPin, Clock, Eye, EyeOff, Pencil, Trash2, FileText } from "lucide-react";
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

interface SportWatch {
  watchId: string;
  brand: string;
  model: string;
  days: number;
}

interface Sport {
  id: string;
  activity_date: string;
  sport_type: string;
  location: string | null;
  duration_minutes: number | null;
  notes: string | null;
  linkedWatches: SportWatch[];
}

interface SportTimelineProps {
  sports: Sport[];
  limit?: number;
  onUpdate: () => void;
}

const sportTypes = [
  "Running",
  "Swimming",
  "Cycling",
  "Gym/Weights",
  "Hiking",
  "Golf",
  "Tennis",
  "Skiing",
  "Diving",
  "Yoga",
  "Other",
];

export const SportTimeline = ({ sports, limit, onUpdate }: SportTimelineProps) => {
  const { t } = useTranslation();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSportType, setSelectedSportType] = useState<string>("all");
  
  // Get available years and sport types from sports
  const availableYears = Array.from(
    new Set(sports.map(sport => {
      const date = new Date(sport.activity_date);
      return date.getFullYear();
    }))
  ).sort((a, b) => b - a);

  const availableSportTypes = Array.from(
    new Set(sports.map(sport => sport.sport_type))
  ).sort();
  
  // Filter sports by year and type
  let filteredSports = sports;
  if (selectedYear !== "all") {
    filteredSports = filteredSports.filter(sport => {
      const date = new Date(sport.activity_date);
      return date.getFullYear().toString() === selectedYear;
    });
  }
  if (selectedSportType !== "all") {
    filteredSports = filteredSports.filter(sport => sport.sport_type === selectedSportType);
  }
  
  const displaySports = limit ? filteredSports.slice(0, limit) : filteredSports;
  const { isAdmin } = useAuth();
  const { isVerified, requestVerification } = usePasscode();
  const [showLocation, setShowLocation] = useState(isAdmin);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Sport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    activity_date: "",
    sport_type: "",
    location: "",
    duration_minutes: "",
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
      const { error } = await supabase.from("sports").delete().eq("id", deleteId);
      
      if (error) throw error;
      
      toast.success("Sport activity deleted successfully");
      setDeleteId(null);
      onUpdate();
    } catch (error) {
      console.error("Error deleting sport:", error);
      toast.error("Failed to delete sport activity");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedItems.size === 0) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("sports")
        .delete()
        .in("id", Array.from(selectedItems));
      
      if (error) throw error;
      
      toast.success(`${selectedItems.size} sport activit${selectedItems.size > 1 ? "ies" : "y"} deleted successfully`);
      setSelectedItems(new Set());
      await onUpdate();
    } catch (error) {
      console.error("Error deleting sports:", error);
      toast.error("Failed to delete sport activities");
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
    if (selectedItems.size === displaySports.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(displaySports.map(s => s.id)));
    }
  };

  const handleEdit = (sport: Sport) => {
    setEditItem(sport);
    setFormData({
      activity_date: sport.activity_date,
      sport_type: sport.sport_type,
      location: sport.location || "",
      duration_minutes: sport.duration_minutes?.toString() || "",
      notes: sport.notes || "",
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from("sports").update({
        activity_date: formData.activity_date,
        sport_type: formData.sport_type,
        location: formData.location || null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        notes: formData.notes || null,
      }).eq("id", editItem.id);
      
      if (error) throw error;
      
      toast.success("Sport activity updated successfully");
      setEditItem(null);
      onUpdate();
    } catch (error) {
      console.error("Error updating sport:", error);
      toast.error("Failed to update sport activity");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <>
      <div className="space-y-4">
        {sports.length > 0 && (
          <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
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
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Type:</label>
                <Select value={selectedSportType} onValueChange={setSelectedSportType}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {availableSportTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(isVerified || isAdmin) && displaySports.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedItems.size === displaySports.length && displaySports.length > 0}
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
                  Delete {selectedItems.size} Activit{selectedItems.size > 1 ? "ies" : "y"}
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

        {displaySports.length === 0 ? (
          <Card className="border-border bg-card p-8 text-center">
            <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No sport activities yet</h3>
            <p className="text-sm text-muted-foreground">
              Link sport activities when logging wear entries to see them here.
            </p>
          </Card>
        ) : (
          displaySports.map((sport) => (
            <Card key={sport.id} className="border-border bg-card p-6 hover:shadow-[var(--shadow-luxury)] transition-all duration-300">
              <div className="flex items-start gap-4">
                {(isVerified || isAdmin) && (
                  <Checkbox
                    checked={selectedItems.has(sport.id)}
                    onCheckedChange={() => toggleItemSelection(sport.id)}
                    className="mt-3"
                  />
                )}
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1">
                        {sport.sport_type}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{sport.activity_date}</span>
                        </div>
                        {sport.location && (
                          <span>
                            {showLocation ? sport.location : "••••••"}
                          </span>
                        )}
                        {sport.duration_minutes && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(sport.duration_minutes)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">
                        {sport.sport_type}
                      </Badge>
                      {(isVerified || isAdmin) && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(sport)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(sport.id)}
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
                      {sport.linkedWatches && sport.linkedWatches.length > 0 ? (
                        sport.linkedWatches.map((lw) => (
                          <p key={lw.watchId} className="text-sm">
                            <span className="font-medium text-foreground">{lw.brand} {lw.model}</span>
                            <span className="mx-2 text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{lw.days} {lw.days === 1 ? 'day' : 'days'}</span>
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No watches linked via wear log</p>
                      )}
                    </div>
                    {sport.notes && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sport.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sport Activity?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this sport activity.
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
            <DialogTitle>Edit Sport Activity</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-activity-date">Date</Label>
              <Input
                id="edit-activity-date"
                type="date"
                value={formData.activity_date}
                onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-sport-type">Sport Type</Label>
              <Select
                value={formData.sport_type}
                onValueChange={(value) => setFormData({ ...formData, sport_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sportTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-location">Location (Optional)</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Local Gym"
              />
            </div>
            <div>
              <Label htmlFor="edit-duration">Duration (minutes, Optional)</Label>
              <Input
                id="edit-duration"
                type="number"
                min="1"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                placeholder="e.g., 60"
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
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details..."
                className="resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
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
