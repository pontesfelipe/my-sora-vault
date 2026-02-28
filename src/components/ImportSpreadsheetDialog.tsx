import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import ExcelJS from "exceljs";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";

export const ImportSpreadsheetDialog = () => {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const parseSpreadsheet = async (file: File): Promise<any> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const sheet1 = workbook.worksheets[0];
    const page1: any[] = [];
    sheet1.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return;
      const vals = row.values as any[];
      if (!vals[1] || !vals[2]) return;
      page1.push({
        brand: vals[1], model: vals[2],
        jan: parseFloat(vals[5]) || 0, feb: parseFloat(vals[6]) || 0,
        mar: parseFloat(vals[7]) || 0, apr: parseFloat(vals[8]) || 0,
        may: parseFloat(vals[9]) || 0, jun: parseFloat(vals[10]) || 0,
        jul: parseFloat(vals[11]) || 0, aug: parseFloat(vals[12]) || 0,
        sep: parseFloat(vals[13]) || 0, oct: parseFloat(vals[14]) || 0,
        nov: parseFloat(vals[15]) || 0, dec: parseFloat(vals[16]) || 0,
      });
    });

    const sheet3 = workbook.worksheets[2];
    const page3: any[] = [];
    sheet3.eachRow((row, rowNumber) => {
      if (rowNumber <= 1) return;
      const vals = row.values as any[];
      if (!vals[1] || !vals[2]) return;
      page3.push({
        brand: vals[1], model: vals[2], price: vals[3], movement: vals[4],
        powerReserve: vals[5], crystal: vals[6], caseMaterial: vals[7],
        caseSize: vals[8], lugToLug: vals[9], waterResistance: vals[10],
        caseback: vals[11], band: vals[12],
      });
    });

    const sheet4 = workbook.worksheets[3];
    const page4: any[] = [];
    sheet4.eachRow((row, rowNumber) => {
      if (rowNumber <= 1) return;
      const vals = row.values as any[];
      if (!vals[1] || !vals[2]) return;
      page4.push({
        brand: vals[1], model: vals[2], whyBought: vals[3],
        whenBought: vals[4], whatILike: vals[5], whatIDontLike: vals[6],
      });
    });

    const sheet5 = workbook.worksheets[4];
    const page5: any[] = [];
    sheet5.eachRow((row, rowNumber) => {
      if (rowNumber <= 1) return;
      const vals = row.values as any[];
      if (!vals[1] || !vals[2]) return;
      page5.push({
        brand: vals[1], model: vals[2], dialColors: vals[3],
        rank: parseInt(vals[4]) || 0,
      });
    });

    return { page1, page3, page4, page5 };
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      setCurrentPhase("Parsing spreadsheet...");
      setProgress(10);
      
      const spreadsheetData = await parseSpreadsheet(file);

      setCurrentPhase("Phase 1: Clearing and repopulating wear entries...");
      setProgress(20);

      const { data, error } = await supabase.functions.invoke('import-spreadsheet-data', {
        body: { spreadsheetData }
      });

      if (error) throw error;

      setProgress(100);
      toast.success("Data import completed successfully!", {
        description: `Phase 1: ${data.results.phase1.message}\nPhase 2: ${data.results.phase2.message}\nPhase 3: ${data.results.phase3.message}\nPhase 4: ${data.results.phase4.message}\nPhase 5: ${data.results.phase5.message}`,
      });

      setOpen(false);
      setTimeout(() => { window.location.reload(); }, 2000);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error("Failed to import data", { description: error.message });
    } finally {
      setImporting(false);
      setProgress(0);
      setCurrentPhase("");
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Import Spreadsheet Data
      </Button>
      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Import Spreadsheet Data">
        <p className="text-sm text-muted-foreground mb-4">
          This will import and synchronize all data from your Watch Track spreadsheet, including wear entries, specifications, personal notes, wishlist items, and AI analysis.
        </p>

        {importing && (
          <div className="space-y-4">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">{currentPhase}</p>
          </div>
        )}

        {!importing && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Spreadsheet File</label>
            <Input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>Cancel</Button>
          <Button onClick={handleImport} disabled={importing || !file}>
            {importing ? "Importing..." : "Start Import"}
          </Button>
        </div>
      </ResponsiveDialog>
    </>
  );
};
