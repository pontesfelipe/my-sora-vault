import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ExcelJS from "exceljs";

interface CollectionWithOwner {
  id: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string;
}

export function ExportWatchInventoryDialog() {
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
        .eq('collection_id', selectedCollectionId)
        .order('brand', { ascending: true });

      if (watchesError) throw watchesError;

      if (!watches || watches.length === 0) {
        toast.error('No watches found in this collection');
        setIsExporting(false);
        return;
      }

      const watchIds = watches.map(w => w.id);

      const { data: watchSpecs } = await supabase
        .from('watch_specs')
        .select('*')
        .in('watch_id', watchIds);

      const specsMap = new Map(watchSpecs?.map(s => [s.watch_id, s]) || []);

      const exportData = watches.map(watch => {
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

      // Create workbook with ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Watch Inventory');

      if (exportData.length > 0) {
        worksheet.columns = Object.keys(exportData[0]).map(key => ({ header: key, key }));
        exportData.forEach(row => worksheet.addRow(row));
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const selectedCollection = collections.find(c => c.id === selectedCollectionId);
      const collectionName = selectedCollection?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'collection';
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `watch_inventory_${collectionName}_${timestamp}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${exportData.length} watches`);
      setOpen(false);
    } catch (error) {
      console.error('Error exporting watch inventory:', error);
      toast.error('Failed to export watch inventory');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Package className="w-4 h-4 mr-2" />
          Export Inventory
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Watch Inventory</DialogTitle>
          <DialogDescription>
            Select a collection to export its watch inventory data (without wear entries)
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
                  <Package className="w-4 h-4 mr-2" />
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
