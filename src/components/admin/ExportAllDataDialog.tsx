import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ExcelJS from 'exceljs';

interface CollectionWithOwner {
  id: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string;
}

export function ExportAllDataDialog() {
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

  const addSheetFromData = (workbook: ExcelJS.Workbook, sheetName: string, data: Record<string, any>[]) => {
    if (data.length === 0) return;
    const ws = workbook.addWorksheet(sheetName);
    const headers = Object.keys(data[0]);
    ws.addRow(headers);
    data.forEach(row => ws.addRow(Object.values(row)));
    ws.getRow(1).font = { bold: true };
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
        .eq('collection_id', selectedCollectionId)
        .order('brand', { ascending: true });

      if (watchesError) throw watchesError;

      if (!watches || watches.length === 0) {
        toast.error('No watches found in this collection');
        setIsExporting(false);
        return;
      }

      const watchIds = watches.map(w => w.id);

      const [wearResult, specsResult, tripsResult, eventsResult, waterResult] = await Promise.all([
        supabase.from('wear_entries').select('*').in('watch_id', watchIds).order('wear_date', { ascending: false }),
        supabase.from('watch_specs').select('*').in('watch_id', watchIds),
        supabase.from('trips').select('*').order('start_date', { ascending: false }),
        supabase.from('events').select('*').order('start_date', { ascending: false }),
        supabase.from('water_usage').select('*').in('watch_id', watchIds).order('activity_date', { ascending: false }),
      ]);

      const wearEntries = wearResult.data || [];
      const watchSpecs = specsResult.data || [];
      const trips = tripsResult.data || [];
      const events = eventsResult.data || [];
      const waterUsages = waterResult.data || [];

      const watchMap = new Map(watches.map(w => [w.id, w]));
      const specsMap = new Map(watchSpecs.map(s => [s.watch_id, s]));
      const tripMap = new Map(trips.map(t => [t.id, t]));
      const eventMap = new Map(events.map(e => [e.id, e]));
      const waterMap = new Map(waterUsages.map(w => [w.id, w]));

      const workbook = new ExcelJS.Workbook();

      // Sheet 1: Watch Inventory
      const inventoryData = watches.map(watch => {
        const specs = specsMap.get(watch.id);
        return {
          'Brand': watch.brand || '',
          'Model': watch.model || '',
          'Type': watch.type || '',
          'Dial Color': watch.dial_color || '',
          'Cost': watch.cost || '',
          'MSRP': watch.msrp || '',
          'Average Resale Price': watch.average_resale_price || '',
          'Movement': watch.movement || '',
          'Case Size': watch.case_size || '',
          'Lug to Lug': watch.lug_to_lug_size || '',
          'Caseback Material': watch.caseback_material || '',
          'Has Sapphire': watch.has_sapphire ? 'Yes' : (watch.has_sapphire === false ? 'No' : ''),
          'Warranty Date': watch.warranty_date || '',
          'When Bought': watch.when_bought || '',
          'Why Bought': watch.why_bought || '',
          'What I Like': watch.what_i_like || '',
          "What I Don't Like": watch.what_i_dont_like || '',
          'Rarity': watch.rarity || '',
          'Historical Significance': watch.historical_significance || '',
          'Available for Trade': watch.available_for_trade ? 'Yes' : 'No',
          'Sentiment': watch.sentiment || '',
          'Specs Case Material': specs?.case_material || '',
          'Specs Crystal': specs?.crystal || '',
          'Specs Caseback': specs?.caseback || '',
          'Specs Band': specs?.band || '',
          'Specs Power Reserve': specs?.power_reserve || '',
          'Specs Water Resistance': specs?.water_resistance || '',
          'Specs Price': specs?.price || '',
          'Created At': watch.created_at ? new Date(watch.created_at).toLocaleDateString() : '',
          'Updated At': watch.updated_at ? new Date(watch.updated_at).toLocaleDateString() : '',
        };
      });
      addSheetFromData(workbook, 'Watch Inventory', inventoryData);

      // Sheet 2: Wear Logs
      const wearData = wearEntries.map(entry => {
        const watch = watchMap.get(entry.watch_id);
        const trip = entry.trip_id ? tripMap.get(entry.trip_id) : null;
        const event = entry.event_id ? eventMap.get(entry.event_id) : null;
        const water = entry.water_usage_id ? waterMap.get(entry.water_usage_id) : null;
        return {
          'Wear Date': entry.wear_date,
          'Days Worn': entry.days,
          'Wear Notes': entry.notes || '',
          'Watch Brand': watch?.brand || '',
          'Watch Model': watch?.model || '',
          'Watch Type': watch?.type || '',
          'Dial Color': watch?.dial_color || '',
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
      addSheetFromData(workbook, 'Wear Logs', wearData);

      // Sheet 3: Trips
      const tripData = trips.map(trip => ({
        'Location': trip.location || '',
        'Purpose': trip.purpose || '',
        'Start Date': trip.start_date || '',
        'Days': trip.days || '',
        'Notes': trip.notes || '',
        'Created At': trip.created_at ? new Date(trip.created_at).toLocaleDateString() : '',
      }));
      addSheetFromData(workbook, 'Trips', tripData);

      // Sheet 4: Events
      const eventData = events.map(event => ({
        'Location': event.location || '',
        'Purpose': event.purpose || '',
        'Start Date': event.start_date || '',
        'Days': event.days || '',
        'Created At': event.created_at ? new Date(event.created_at).toLocaleDateString() : '',
      }));
      addSheetFromData(workbook, 'Events', eventData);

      // Sheet 5: Water Usage
      const waterData = waterUsages.map(water => {
        const watch = watchMap.get(water.watch_id);
        return {
          'Watch Brand': watch?.brand || '',
          'Watch Model': watch?.model || '',
          'Activity Type': water.activity_type || '',
          'Activity Date': water.activity_date || '',
          'Depth (meters)': water.depth_meters || '',
          'Duration (minutes)': water.duration_minutes || '',
          'Notes': water.notes || '',
          'Created At': water.created_at ? new Date(water.created_at).toLocaleDateString() : '',
        };
      });
      addSheetFromData(workbook, 'Water Usage', waterData);

      // Download
      const selectedCollection = collections.find(c => c.id === selectedCollectionId);
      const collectionName = selectedCollection?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'collection';
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `collection_export_${collectionName}_${timestamp}.xlsx`;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      const sheetCount = workbook.worksheets.length;
      toast.success(`Exported ${watches.length} watches across ${sheetCount} sheets`);
      setOpen(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export All
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export All Collection Data</DialogTitle>
          <DialogDescription>
            Export watch inventory, wear logs, trips, events, and water usage in a single Excel file with multiple sheets
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

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Includes sheets for:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Watch Inventory</li>
              <li>Wear Logs</li>
              <li>Trips</li>
              <li>Events</li>
              <li>Water Usage</li>
            </ul>
          </div>

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
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export All
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
