import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ExcelJS from "exceljs";

interface CollectionWithOwner {
  id: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string;
}

export function ExportWearLogsDialog() {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<CollectionWithOwner[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCollections();
    }
  }, [open]);

  const fetchCollections = async () => {
    setIsLoading(true);
    try {
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select('id, name, created_by')
        .order('name');

      if (collectionsError) throw collectionsError;

      const ownerIds = [...new Set(collectionsData?.map(c => c.created_by) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ownerIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const collectionsWithOwners: CollectionWithOwner[] = (collectionsData || []).map(c => {
        const owner = profilesMap.get(c.created_by);
        return {
          id: c.id,
          name: c.name,
          ownerName: owner?.full_name || null,
          ownerEmail: owner?.email || 'Unknown',
        };
      });

      setCollections(collectionsWithOwners);
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error('Failed to load collections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedCollectionId) {
      toast.error('Please select a collection');
      return;
    }

    setIsExporting(true);
    try {
      const { data: watches, error: watchesError } = await supabase
        .from('watches')
        .select('*')
        .eq('collection_id', selectedCollectionId);

      if (watchesError) throw watchesError;

      const watchIds = watches?.map(w => w.id) || [];

      if (watchIds.length === 0) {
        toast.error('No watches found in this collection');
        setIsExporting(false);
        return;
      }

      const { data: wearEntries, error: wearError } = await supabase
        .from('wear_entries')
        .select('*')
        .in('watch_id', watchIds)
        .order('wear_date', { ascending: false });

      if (wearError) throw wearError;

      if (!wearEntries || wearEntries.length === 0) {
        toast.error('No wear entries found for this collection');
        setIsExporting(false);
        return;
      }

      const tripIds = wearEntries.filter(e => e.trip_id).map(e => e.trip_id);
      const eventIds = wearEntries.filter(e => e.event_id).map(e => e.event_id);
      const waterIds = wearEntries.filter(e => e.water_usage_id).map(e => e.water_usage_id);

      const [tripsResult, eventsResult, waterResult, specsResult] = await Promise.all([
        tripIds.length > 0 ? supabase.from('trips').select('*').in('id', tripIds) : { data: [] },
        eventIds.length > 0 ? supabase.from('events').select('*').in('id', eventIds) : { data: [] },
        waterIds.length > 0 ? supabase.from('water_usage').select('*').in('id', waterIds) : { data: [] },
        supabase.from('watch_specs').select('*').in('watch_id', watchIds),
      ]);

      const trips = tripsResult.data || [];
      const events = eventsResult.data || [];
      const waterUsages = waterResult.data || [];
      const watchSpecs = specsResult.data || [];

      const watchMap = new Map(watches?.map(w => [w.id, w]));
      const tripMap = new Map(trips.map((t: any) => [t.id, t]));
      const eventMap = new Map(events.map((e: any) => [e.id, e]));
      const waterMap = new Map(waterUsages.map((w: any) => [w.id, w]));
      const specsMap = new Map(watchSpecs.map((s: any) => [s.watch_id, s]));

      const exportData = wearEntries.map(entry => {
        const watch = watchMap.get(entry.watch_id);
        const trip = entry.trip_id ? tripMap.get(entry.trip_id) : null;
        const event = entry.event_id ? eventMap.get(entry.event_id) : null;
        const water = entry.water_usage_id ? waterMap.get(entry.water_usage_id) : null;
        const specs = watch ? specsMap.get(watch.id) : null;

        return {
          'Wear Date': entry.wear_date,
          'Days Worn': entry.days,
          'Wear Notes': entry.notes || '',
          'Watch Brand': watch?.brand || '',
          'Watch Model': watch?.model || '',
          'Watch Type': watch?.type || '',
          'Dial Color': watch?.dial_color || '',
          'Cost': watch?.cost || '',
          'MSRP': watch?.msrp || '',
          'Average Resale Price': watch?.average_resale_price || '',
          'Movement': watch?.movement || '',
          'Case Size': watch?.case_size || '',
          'Lug to Lug': watch?.lug_to_lug_size || '',
          'Caseback Material': watch?.caseback_material || '',
          'Has Sapphire': watch?.has_sapphire ? 'Yes' : (watch?.has_sapphire === false ? 'No' : ''),
          'Warranty Date': watch?.warranty_date || '',
          'When Bought': watch?.when_bought || '',
          'Why Bought': watch?.why_bought || '',
          'What I Like': watch?.what_i_like || '',
          "What I Don't Like": watch?.what_i_dont_like || '',
          'Rarity': watch?.rarity || '',
          'Historical Significance': watch?.historical_significance || '',
          'Available for Trade': watch?.available_for_trade ? 'Yes' : 'No',
          'Sentiment': watch?.sentiment || '',
          'Specs Case Material': specs?.case_material || '',
          'Specs Crystal': specs?.crystal || '',
          'Specs Caseback': specs?.caseback || '',
          'Specs Band': specs?.band || '',
          'Specs Power Reserve': specs?.power_reserve || '',
          'Specs Water Resistance': specs?.water_resistance || '',
          'Trip Location': trip?.location || '',
          'Trip Purpose': trip?.purpose || '',
          'Trip Start Date': trip?.start_date || '',
          'Trip Days': trip?.days || '',
          'Trip Notes': trip?.notes || '',
          'Event Location': event?.location || '',
          'Event Purpose': event?.purpose || '',
          'Event Start Date': event?.start_date || '',
          'Event Days': event?.days || '',
          'Water Activity Type': water?.activity_type || '',
          'Water Activity Date': water?.activity_date || '',
          'Water Depth (meters)': water?.depth_meters || '',
          'Water Duration (minutes)': water?.duration_minutes || '',
          'Water Notes': water?.notes || '',
        };
      });

      // Create workbook with ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Wear Logs');

      if (exportData.length > 0) {
        worksheet.columns = Object.keys(exportData[0]).map(key => ({ header: key, key }));
        exportData.forEach(row => worksheet.addRow(row));
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const selectedCollection = collections.find(c => c.id === selectedCollectionId);
      const collectionName = selectedCollection?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'collection';
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `wear_logs_${collectionName}_${timestamp}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${exportData.length} wear entries`);
      setOpen(false);
    } catch (error) {
      console.error('Error exporting wear logs:', error);
      toast.error('Failed to export wear logs');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Wear Logs
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Wear Logs</DialogTitle>
          <DialogDescription>
            Select a collection to export its wear log data
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a collection" />
              </SelectTrigger>
              <SelectContent>
                {collections.map(collection => (
                  <SelectItem key={collection.id} value={collection.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{collection.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {collection.ownerName || collection.ownerEmail}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting || !selectedCollectionId}>
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
