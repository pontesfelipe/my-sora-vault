import { useState, useEffect } from "react";
import { DIAL_COLORS } from "@/constants/dialColors";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { logAccess } from "@/utils/accessLogging";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { WarrantyCardUpload } from "./WarrantyCardUpload";
import { Separator } from "@/components/ui/separator";
import { WatchTypeMultiSelect } from "./WatchTypeMultiSelect";

const watchSchema = z.object({
  brand: z.string().trim().min(1, "Brand is required").max(100),
  model: z.string().trim().min(1, "Model is required").max(200),
  dialColor: z.string().trim().min(1, "Dial color is required").max(50),
  type: z.string().trim().min(1, "Type is required").max(100),
  cost: z.number().min(0, "Cost must be positive"),
  msrp: z.number().min(0, "MSRP must be positive").optional(),
  averageResalePrice: z.number().min(0, "Resale price must be positive").optional(),
  warrantyDate: z.string().optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'very_rare', 'grail']).optional(),
  historicalSignificance: z.enum(['regular', 'notable', 'historically_significant']).optional(),
});

interface Watch {
  id: string;
  brand: string;
  model: string;
  dial_color: string;
  type: string;
  cost: number;
  msrp?: number;
  case_size?: string;
  lug_to_lug_size?: string;
  caseback_material?: string;
  movement?: string;
  has_sapphire?: boolean;
  average_resale_price?: number;
  warranty_date?: string;
  warranty_card_url?: string;
  when_bought?: string;
  rarity?: string;
  historical_significance?: string;
  available_for_trade?: boolean;
  complications?: string[];
  case_shape?: string;
}

export const EditWatchDialog = ({ watch, onSuccess }: { watch: Watch; onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [specRowId, setSpecRowId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    brand: watch.brand,
    model: watch.model,
    dialColor: watch.dial_color,
    type: watch.type,
    cost: watch.cost.toString(),
    msrp: watch.msrp?.toString() || "",
    caseSize: watch.case_size || "",
    lugToLugSize: watch.lug_to_lug_size || "",
    casebackMaterial: watch.caseback_material || "",
    movement: watch.movement || "",
    powerReserve: "",
    crystal: "",
    caseMaterial: "",
    waterResistance: "",
    caseback: "",
    band: "",
    hasSapphire: watch.has_sapphire,
    averageResalePrice: watch.average_resale_price?.toString() || "",
    warrantyDate: watch.warranty_date || "",
    warrantyCardFile: null as File | null,
    whenBought: watch.when_bought || "",
    rarity: (watch.rarity || "common") as "common" | "uncommon" | "rare" | "very_rare" | "grail",
    historicalSignificance: (watch.historical_significance || "regular") as "regular" | "notable" | "historically_significant",
    availableForTrade: watch.available_for_trade || false,
    complications: watch.complications || [],
    caseShape: watch.case_shape || "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    setFormValues({
      brand: watch.brand,
      model: watch.model,
      dialColor: watch.dial_color,
      type: watch.type,
      cost: watch.cost.toString(),
      msrp: watch.msrp?.toString() || "",
      caseSize: watch.case_size || "",
      lugToLugSize: watch.lug_to_lug_size || "",
      casebackMaterial: watch.caseback_material || "",
      movement: watch.movement || "",
      powerReserve: "",
      crystal: "",
      caseMaterial: "",
      waterResistance: "",
      caseback: "",
      band: "",
      hasSapphire: watch.has_sapphire,
      averageResalePrice: watch.average_resale_price?.toString() || "",
      warrantyDate: watch.warranty_date || "",
      warrantyCardFile: null,
      whenBought: watch.when_bought || "",
      rarity: (watch.rarity || "common") as any,
      historicalSignificance: (watch.historical_significance || "regular") as any,
      availableForTrade: watch.available_for_trade || false,
      complications: watch.complications || [],
      caseShape: watch.case_shape || "",
    });

    const loadSpecs = async () => {
      const { data, error } = await supabase
        .from("watch_specs")
        .select("*")
        .eq("watch_id", watch.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        // Non-blocking: still allow editing watch fields even if specs fetch fails
        console.warn("Failed to load watch_specs:", error);
        setSpecRowId(null);
        return;
      }

      if (!data) {
        setSpecRowId(null);
        return;
      }

      setSpecRowId(data.id);
      setFormValues((prev) => ({
        ...prev,
        powerReserve: data.power_reserve || "",
        crystal: data.crystal || "",
        caseMaterial: data.case_material || "",
        waterResistance: data.water_resistance || "",
        caseback: data.caseback || "",
        band: data.band || "",
      }));
    };

    loadSpecs();

    return () => {
      cancelled = true;
    };
  }, [open, watch]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = watchSchema.parse({
        brand: formValues.brand,
        model: formValues.model,
        dialColor: formValues.dialColor,
        type: formValues.type,
        cost: parseFloat(formValues.cost),
        msrp: formValues.msrp ? parseFloat(formValues.msrp) : undefined,
        averageResalePrice: formValues.averageResalePrice ? parseFloat(formValues.averageResalePrice) : undefined,
        warrantyDate: formValues.warrantyDate || undefined,
        rarity: formValues.rarity,
        historicalSignificance: formValues.historicalSignificance,
      });

      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Upload warranty card if provided
      let warrantyCardUrl = watch.warranty_card_url;
      if (formValues.warrantyCardFile) {
        const fileExt = formValues.warrantyCardFile.name.split('.').pop();
        const fileName = `${currentUser.id}/${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('warranty-cards')
          .upload(fileName, formValues.warrantyCardFile);

        if (uploadError) {
          toast({
            title: "Upload Error",
            description: "Failed to upload warranty card",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Create signed URL for private bucket access
        const { data: signedUrlData } = await supabase.storage
          .from('warranty-cards')
          .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year validity

        warrantyCardUrl = signedUrlData?.signedUrl || null;
      }

      const { error } = await supabase
        .from("watches")
        .update({
          brand: data.brand,
          model: data.model,
          dial_color: data.dialColor,
          type: data.type,
          cost: data.cost,
          msrp: data.msrp || null,
          case_size: formValues.caseSize || null,
          lug_to_lug_size: formValues.lugToLugSize || null,
          caseback_material: formValues.casebackMaterial || null,
          movement: formValues.movement || null,
          has_sapphire: formValues.hasSapphire,
          average_resale_price: data.averageResalePrice || null,
          warranty_date: data.warrantyDate || null,
          warranty_card_url: warrantyCardUrl,
          when_bought: formValues.whenBought || null,
          rarity: data.rarity || 'common',
          historical_significance: data.historicalSignificance || 'regular',
          available_for_trade: formValues.availableForTrade,
          complications: formValues.complications,
          case_shape: formValues.caseShape || null,
        })
        .eq("id", watch.id);

      if (error) throw error;

      // Keep watch_specs (the data used in the Details → Specifications tab) in sync
      const shouldWriteSpecs = Boolean(
        formValues.movement ||
          formValues.caseSize ||
          formValues.lugToLugSize ||
          formValues.powerReserve ||
          formValues.crystal ||
          formValues.caseMaterial ||
          formValues.waterResistance ||
          formValues.caseback ||
          formValues.band
      );

      if (shouldWriteSpecs) {
        const specsValues = {
          movement: formValues.movement || null,
          case_size: formValues.caseSize || null,
          lug_to_lug: formValues.lugToLugSize || null,
          power_reserve: formValues.powerReserve || null,
          crystal: formValues.crystal || null,
          case_material: formValues.caseMaterial || null,
          water_resistance: formValues.waterResistance || null,
          caseback: formValues.caseback || null,
          band: formValues.band || null,
        };

        if (specRowId) {
          const { error: specsError } = await supabase
            .from("watch_specs")
            .update(specsValues)
            .eq("id", specRowId);

          if (specsError) throw specsError;
        } else {
          const { error: specsError } = await supabase.from("watch_specs").insert({
            watch_id: watch.id,
            user_id: currentUser.id,
            ...specsValues,
          });

          if (specsError) throw specsError;
        }
      }

      toast({
        title: "Success",
        description: "Watch updated successfully",
      });

      setOpen(false);
      onSuccess();
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
          description: "Failed to update watch",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      title="Edit Watch"
      trigger={
        <Button variant="outline" size="sm" className="gap-2">
          <Edit className="w-4 h-4" />
          Edit
        </Button>
      }
      className="max-w-md max-h-[90vh] overflow-y-auto"
    >

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={formValues.brand}
              onChange={(e) => setFormValues({ ...formValues, brand: e.target.value })}
              required
              maxLength={100}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={formValues.model}
              onChange={(e) => setFormValues({ ...formValues, model: e.target.value })}
              required
              maxLength={200}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dialColor">Dial Color</Label>
            <Select
              value={formValues.dialColor}
              onValueChange={(value) => setFormValues({ ...formValues, dialColor: value })}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select dial color" />
              </SelectTrigger>
              <SelectContent>
                {DIAL_COLORS.map((color) => (
                  <SelectItem key={color} value={color}>{color}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <WatchTypeMultiSelect
              value={formValues.type}
              onChange={(value) => setFormValues({ ...formValues, type: value })}
            />
            <p className="text-xs text-muted-foreground">
              Select one or more watch types
            </p>
          </div>

          <div className="space-y-2">
            <Label>Functions / Complications</Label>
            <div className="flex flex-wrap gap-2">
              {["GMT", "Chronograph", "Date", "Day-Date", "Moonphase", "Annual Calendar", "Perpetual Calendar", "Tourbillon", "Power Reserve", "Flyback", "Tachymeter", "Small Seconds", "World Time", "Alarm", "Minute Repeater"].map((comp) => (
                <Badge
                  key={comp}
                  variant={formValues.complications.includes(comp) ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => {
                    setFormValues((prev) => ({
                      ...prev,
                      complications: prev.complications.includes(comp)
                        ? prev.complications.filter((c) => c !== comp)
                        : [...prev.complications, comp],
                    }));
                  }}
                >
                  {comp}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Tap to toggle complications</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="caseShape">Case Shape</Label>
            <Select
              value={formValues.caseShape || ""}
              onValueChange={(value) => setFormValues({ ...formValues, caseShape: value })}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select case shape" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Round">Round</SelectItem>
                <SelectItem value="Tonneau">Tonneau</SelectItem>
                <SelectItem value="Rectangular">Rectangular</SelectItem>
                <SelectItem value="Square">Square</SelectItem>
                <SelectItem value="Cushion">Cushion</SelectItem>
                <SelectItem value="Octagonal">Octagonal</SelectItem>
                <SelectItem value="Oval">Oval</SelectItem>
                <SelectItem value="Barrel">Barrel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Price Paid ($)</Label>
            <Input
              id="cost"
              value={formValues.cost}
              onChange={(e) => setFormValues({ ...formValues, cost: e.target.value })}
              type="number"
              step="0.01"
              min="0"
              required
              className="bg-background border-border"
              placeholder="Amount you paid"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msrp">MSRP (Optional)</Label>
            <Input
              id="msrp"
              value={formValues.msrp}
              onChange={(e) => setFormValues({ ...formValues, msrp: e.target.value })}
              type="number"
              step="0.01"
              min="0"
              className="bg-background border-border"
              placeholder="Manufacturer's suggested retail price"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rarity">Rarity</Label>
            <Select
              value={formValues.rarity}
              onValueChange={(value) => setFormValues({ ...formValues, rarity: value as any })}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select rarity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="common">Common</SelectItem>
                <SelectItem value="uncommon">Uncommon</SelectItem>
                <SelectItem value="rare">Rare</SelectItem>
                <SelectItem value="very_rare">Very Rare</SelectItem>
                <SelectItem value="grail">Grail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="historicalSignificance">Historical Significance</Label>
            <Select
              value={formValues.historicalSignificance}
              onValueChange={(value) => setFormValues({ ...formValues, historicalSignificance: value as any })}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select significance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="notable">Notable</SelectItem>
                <SelectItem value="historically_significant">Historically Significant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="availableForTrade"
              checked={formValues.availableForTrade}
              onCheckedChange={(checked) =>
                setFormValues({ ...formValues, availableForTrade: checked === true })
              }
            />
            <Label
              htmlFor="availableForTrade"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Open to Trade
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="averageResalePrice">Avg. US Resale Price (Market Data) - Optional</Label>
            <Input
              id="averageResalePrice"
              value={formValues.averageResalePrice}
              onChange={(e) => setFormValues({ ...formValues, averageResalePrice: e.target.value })}
              type="number"
              step="0.01"
              min="0"
              placeholder="From online reference sources"
              className="bg-background border-border"
            />
            <p className="text-xs text-muted-foreground">
              Based on data from Chrono24, Bob's Watches, WatchBox, and Crown & Caliber
            </p>
          </div>

          <Separator className="my-6" />
          
          <WarrantyCardUpload 
            onExtracted={(info) => {
              // Auto-fill form with extracted warranty information
              if (info.warranty_date) {
                setFormValues(prev => ({ ...prev, warrantyDate: info.warranty_date }));
              }
              if (info.brand && !formValues.brand) {
                setFormValues(prev => ({ ...prev, brand: info.brand! }));
              }
              if (info.model && !formValues.model) {
                setFormValues(prev => ({ ...prev, model: info.model! }));
              }
              
              // Show toast with additional extracted info
              const additionalInfo = [];
              if (info.serial_number) additionalInfo.push(`Serial: ${info.serial_number}`);
              if (info.warranty_period) additionalInfo.push(`Period: ${info.warranty_period}`);
              if (info.retailer) additionalInfo.push(`Retailer: ${info.retailer}`);
              
              if (additionalInfo.length > 0) {
                toast({
                  title: "Additional Information",
                  description: additionalInfo.join(' • '),
                });
              }
            }}
          />

          <Separator className="my-6" />

          <div className="space-y-2">
            <Label htmlFor="warrantyDate">Warranty Date</Label>
            <Input
              id="warrantyDate"
              value={formValues.warrantyDate}
              onChange={(e) => setFormValues({ ...formValues, warrantyDate: e.target.value })}
              type="date"
              className="bg-background border-border"
            />
            {formValues.warrantyDate && new Date(formValues.warrantyDate) < new Date() && (
              <p className="text-xs text-destructive">Warranty has expired</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="warrantyCard">Warranty Card - Optional</Label>
            <Input
              id="warrantyCard"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFormValues({ ...formValues, warrantyCardFile: e.target.files?.[0] || null })}
              className="bg-background border-border"
            />
            {watch.warranty_card_url && !formValues.warrantyCardFile && (
              <p className="text-xs text-muted-foreground">
                Current: <a href={watch.warranty_card_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View existing card</a>
              </p>
            )}
            {formValues.warrantyCardFile && (
              <p className="text-xs text-green-500">New file selected: {formValues.warrantyCardFile.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="caseSize">Case Size - Optional</Label>
            <Input
              id="caseSize"
              value={formValues.caseSize}
              onChange={(e) => setFormValues({ ...formValues, caseSize: e.target.value })}
              placeholder="e.g., 41mm"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lugToLugSize">Lug to Lug - Optional</Label>
            <Input
              id="lugToLugSize"
              value={formValues.lugToLugSize}
              onChange={(e) => setFormValues({ ...formValues, lugToLugSize: e.target.value })}
              placeholder="e.g., 48mm"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="movement">Movement - Optional</Label>
            <Input
              id="movement"
              value={formValues.movement}
              onChange={(e) => setFormValues({ ...formValues, movement: e.target.value })}
              placeholder="e.g., Automatic"
              className="bg-background border-border"
            />
          </div>

          <Separator className="my-6" />

          <div className="space-y-2">
            <Label htmlFor="powerReserve">Power Reserve - Optional</Label>
            <Input
              id="powerReserve"
              value={formValues.powerReserve}
              onChange={(e) => setFormValues({ ...formValues, powerReserve: e.target.value })}
              placeholder="e.g., 70 hours"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="crystal">Crystal - Optional</Label>
            <Input
              id="crystal"
              value={formValues.crystal}
              onChange={(e) => setFormValues({ ...formValues, crystal: e.target.value })}
              placeholder="e.g., Sapphire"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="caseMaterial">Case Material - Optional</Label>
            <Input
              id="caseMaterial"
              value={formValues.caseMaterial}
              onChange={(e) => setFormValues({ ...formValues, caseMaterial: e.target.value })}
              placeholder="e.g., Stainless steel"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waterResistance">Water Resistance - Optional</Label>
            <Input
              id="waterResistance"
              value={formValues.waterResistance}
              onChange={(e) => setFormValues({ ...formValues, waterResistance: e.target.value })}
              placeholder="e.g., 300m"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="caseback">Caseback (Type/Notes) - Optional</Label>
            <Input
              id="caseback"
              value={formValues.caseback}
              onChange={(e) => setFormValues({ ...formValues, caseback: e.target.value })}
              placeholder="e.g., Exhibition"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="band">Band/Bracelet - Optional</Label>
            <Input
              id="band"
              value={formValues.band}
              onChange={(e) => setFormValues({ ...formValues, band: e.target.value })}
              placeholder="e.g., Rubber strap"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whenBought">When Bought - Optional</Label>
            <Input
              id="whenBought"
              value={formValues.whenBought}
              onChange={(e) => setFormValues({ ...formValues, whenBought: e.target.value })}
              placeholder="e.g., January 2023 or 2023"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="casebackMaterial">Caseback Material - Optional</Label>
            <Input
              id="casebackMaterial"
              value={formValues.casebackMaterial}
              onChange={(e) => setFormValues({ ...formValues, casebackMaterial: e.target.value })}
              placeholder="e.g., Sapphire crystal, Solid steel"
              className="bg-background border-border"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasSapphire"
              checked={formValues.hasSapphire || false}
              onCheckedChange={(checked) =>
                setFormValues({ ...formValues, hasSapphire: checked === true })
              }
            />
            <Label
              htmlFor="hasSapphire"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Has Sapphire Crystal
            </Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
    </ResponsiveDialog>
  );
};
