import { useEffect, useRef, useState } from "react";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, Loader2, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCollection } from "@/contexts/CollectionContext";
import { WarrantyCardUpload } from "./WarrantyCardUpload";
import { WatchPhotoUpload } from "./WatchPhotoUpload";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WatchTypeMultiSelect } from "./WatchTypeMultiSelect";

// Watch reference database for auto-population
const WATCH_REFERENCES: Record<string, {
  brand: string;
  model: string;
  dialColor: string;
  type: string;
  cost: number;
}> = {
  "310.": { brand: "Omega", model: "Speedmaster Moonwatch Pro (Sapphire)", dialColor: "Black", type: "Chronograph", cost: 8000 },
  "310.30.42.50.01.001": { brand: "Omega", model: "Speedmaster Moonwatch Pro (Sapphire)", dialColor: "Black", type: "Chronograph", cost: 8000 },
  "220.12.41.21.03.001": { brand: "Omega", model: "Seamaster 300", dialColor: "Blue", type: "Diver", cost: 5900 },
  "522.10.42.21.03.001": { brand: "Omega", model: "Speedmaster '57", dialColor: "Blue", type: "Chronograph", cost: 10700 },
  "IW328201": { brand: "IWC", model: "Mark XX", dialColor: "Black", type: "Pilot", cost: 5600 },
  "AB0138241B1A1": { brand: "Breitling", model: "Navitimer GMT", dialColor: "Black", type: "GMT", cost: 6200 },
  "U10370161B1A1": { brand: "Breitling", model: "Superocean Heritage", dialColor: "Blue", type: "Diver", cost: 5400 },
  "L3.774.1.90.2": { brand: "Longines", model: "Legend Diver Bronze", dialColor: "Bronze", type: "Diver", cost: 3100 },
  "01 917 6746 4063": { brand: "ORIS", model: "Propilot Coulson Ltd Edition", dialColor: "Blue", type: "Pilot", cost: 4700 },
  "01 761 7691 4051": { brand: "ORIS", model: "Artelier Pointer Day Date", dialColor: "Silver", type: "Dress", cost: 2500 },
  "PAM01404": { brand: "Panerai", model: "Luminor Marina Luna Rossa PAM 01404 GMT", dialColor: "Blue", type: "GMT", cost: 10100 },
  "CBK221B.BA0715": { brand: "Tag Heuer", model: "Carrera 5 Day Date", dialColor: "Blue", type: "Chronograph", cost: 3000 },
  "SO33T100": { brand: "Swatch", model: "Moonswatch Earth", dialColor: "Blue", type: "Chronograph", cost: 270 },
  "SO33B100": { brand: "Swatch", model: "Moonswatch Saturn", dialColor: "Beige", type: "Chronograph", cost: 270 },
  "CA-53W": { brand: "Casio", model: "Databank", dialColor: "Black", type: "Digital", cost: 30 },
};

// Extract complications from type, model, and other fields
const extractComplications = (type: string, movement?: string): string[] => {
  const complications: string[] = [];
  const combined = `${type} ${movement || ""}`.toLowerCase();
  const checks: [string, string[]][] = [
    ["GMT", ["gmt", "world time", "dual time"]],
    ["Chronograph", ["chronograph", "chrono"]],
    ["Date", ["date", "day-date", "day date"]],
    ["Day-Date", ["day-date", "day date"]],
    ["Moonphase", ["moonphase", "moon phase", "moon"]],
    ["Annual Calendar", ["annual calendar"]],
    ["Perpetual Calendar", ["perpetual calendar"]],
    ["Tourbillon", ["tourbillon"]],
    ["Power Reserve", ["power reserve"]],
    ["Flyback", ["flyback"]],
    ["Tachymeter", ["tachymeter"]],
    ["Small Seconds", ["small seconds", "sub seconds"]],
    ["Alarm", ["alarm"]],
    ["Minute Repeater", ["minute repeater"]],
    ["World Time", ["world time", "worldtime"]],
  ];
  for (const [name, keywords] of checks) {
    if (keywords.some((kw) => combined.includes(kw))) {
      complications.push(name);
    }
  }
  return complications;
};

const watchSchema = z.object({
  brand: z.string().trim().min(1, "Brand is required").max(100),
  model: z.string().trim().min(1, "Model is required").max(200),
  dialColor: z.string().trim().min(1, "Dial color is required").max(50),
  type: z.string().trim().min(1, "Type is required").max(100),
  cost: z.number().min(0, "Cost must be positive").optional(),
  msrp: z.number().min(0, "MSRP must be positive").optional(),
  averageResalePrice: z.number().min(0, "Resale price must be positive").optional(),
  warrantyDate: z.string().optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'very_rare', 'grail']).optional(),
  historicalSignificance: z.enum(['regular', 'notable', 'historically_significant']).optional(),
});

interface PhotoIdentificationHints {
  bezelType?: string;
  strapType?: string;
  notes?: string;
}

interface AddWatchDialogProps {
  onSuccess: (newWatchId?: string) => void;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  prefill?: {
    brand?: string;
    model?: string;
    dial_color?: string;
    type?: string;
    case_size?: string;
    movement?: string;
    complications?: string[];
    case_shape?: string;
    referenceImageBase64?: string;
  };
}

export const AddWatchDialog = ({ onSuccess, externalOpen, onExternalOpenChange, prefill }: AddWatchDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (onExternalOpenChange) onExternalOpenChange(v);
    else setInternalOpen(v);
  };
  const [loading, setLoading] = useState(false);
  const [modelRef, setModelRef] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>();
  const [uploadedPhotoBase64, setUploadedPhotoBase64] = useState<string | null>(null);
  const uploadedPhotoBase64Ref = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState("photo");
  const [photoHints, setPhotoHints] = useState<PhotoIdentificationHints | null>(null);
  const [formValues, setFormValues] = useState({
    brand: "",
    model: "",
    dialColor: "",
    type: "",
    cost: "",
    msrp: "",
    caseSize: "",
    lugToLugSize: "",
    casebackMaterial: "",
    movement: "",
    hasSapphire: null as boolean | null,
    averageResalePrice: "",
    warrantyDate: "",
    warrantyCardFile: null as File | null,
    rarity: "common" as "common" | "uncommon" | "rare" | "very_rare" | "grail",
    historicalSignificance: "regular" as "regular" | "notable" | "historically_significant",
    availableForTrade: false,
  });
  const { toast } = useToast();
  const { selectedCollectionId } = useCollection();

  const setPhotoReference = (base64: string | null) => {
    uploadedPhotoBase64Ref.current = base64;
    setUploadedPhotoBase64(base64);
  };

  useEffect(() => {
    if (!open || !prefill) return;

    setFormValues((prev) => ({
      ...prev,
      brand: prefill.brand || prev.brand,
      model: prefill.model || prev.model,
      dialColor: prefill.dial_color || prev.dialColor,
      type: prefill.type || prev.type,
      caseSize: prefill.case_size || prev.caseSize,
      movement: prefill.movement || prev.movement,
    }));

    if (prefill.referenceImageBase64) {
      setPhotoReference(prefill.referenceImageBase64);
    }

    setActiveTab("manual");
  }, [open, prefill]);

  const handleLookupReference = async () => {
    const searchBrand = formValues.brand.trim();
    const searchRef = modelRef.trim();
    
    if (!searchBrand || !searchRef) {
      toast({
        title: "Missing Information",
        description: "Please enter both Brand and Model Reference",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // First, try local database for instant results
      const localMatch = WATCH_REFERENCES[searchRef.toUpperCase()];
      if (localMatch && localMatch.brand.toLowerCase().includes(searchBrand.toLowerCase())) {
      setFormValues({
        brand: localMatch.brand,
        model: localMatch.model,
        dialColor: localMatch.dialColor,
        type: localMatch.type,
        cost: localMatch.cost.toString(),
        msrp: "",
        caseSize: "",
        lugToLugSize: "",
        casebackMaterial: "",
        movement: "",
        hasSapphire: null,
        averageResalePrice: "",
        warrantyDate: "",
        warrantyCardFile: null,
        rarity: "common",
        historicalSignificance: "regular",
        availableForTrade: false,
      });
        toast({
          title: "Watch Found",
          description: `Loaded ${localMatch.brand} ${localMatch.model}`
        });
        setLoading(false);
        return;
      }
      
      // If not found locally, search the internet
      const { data, error } = await supabase.functions.invoke('search-watch-info', {
        body: { brand: searchBrand, modelReference: searchRef }
      });
      
      if (error || data?.error) {
        toast({
          title: "Not Found",
          description: `Could not find ${searchBrand} ${searchRef} online. Please enter details manually.`,
          variant: "destructive"
        });
        return;
      }
      
      // Auto-populate the form with internet search results
      setFormValues({
        brand: searchBrand,
        model: data.model,
        dialColor: data.dialColor,
        type: data.type,
        cost: data.cost.toString(),
        msrp: "",
        caseSize: data.caseSize || "",
        lugToLugSize: data.lugToLugSize || "",
        casebackMaterial: data.casebackMaterial || "",
        movement: data.movement || "",
        hasSapphire: data.hasSapphire,
        averageResalePrice: data.averageResalePrice ? data.averageResalePrice.toString() : "",
        warrantyDate: "",
        warrantyCardFile: null,
        rarity: "common",
        historicalSignificance: "regular",
        availableForTrade: false,
      });
      
      toast({
        title: "Watch Found Online",
        description: `Loaded ${searchBrand} ${data.model} from web search`
      });
      
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to search for watch information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data = watchSchema.parse({
        brand: formValues.brand,
        model: formValues.model,
        dialColor: formValues.dialColor,
        type: formValues.type,
        cost: formValues.cost ? parseFloat(formValues.cost) : undefined,
        msrp: formValues.msrp ? parseFloat(formValues.msrp) : undefined,
        averageResalePrice: formValues.averageResalePrice ? parseFloat(formValues.averageResalePrice) : undefined,
        warrantyDate: formValues.warrantyDate || undefined,
      });

      // Upload warranty card if provided
      let warrantyCardUrl = null;
      if (formValues.warrantyCardFile) {
        // Get current user first for the folder path
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          throw new Error("User not authenticated");
        }
        
        const fileExt = formValues.warrantyCardFile.name.split('.').pop();
        const fileName = `${currentUser.id}/${crypto.randomUUID()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('warranty-cards')
          .upload(fileName, formValues.warrantyCardFile);

        if (uploadError) {
          toast({
            title: "Upload Error",
            description: "Failed to upload warranty card",
            variant: "destructive",
          });
          return;
        }
        
        // Create signed URL for private bucket access
        const { data: signedUrlData } = await supabase.storage
          .from('warranty-cards')
          .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year validity
        
        warrantyCardUrl = signedUrlData?.signedUrl || null;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get the maximum sort_order for this collection to add the new watch at the end
      const { data: maxSortData } = await supabase
        .from("watches")
        .select("sort_order")
        .eq("collection_id", selectedCollectionId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextSortOrder = maxSortData?.sort_order ? maxSortData.sort_order + 1 : 1;

      const { data: insertData, error } = await supabase.from("watches").insert({
        brand: data.brand,
        model: data.model,
        dial_color: data.dialColor,
        type: data.type,
        cost: data.cost ?? 0,
        msrp: data.msrp || null,
        case_size: formValues.caseSize || null,
        lug_to_lug_size: formValues.lugToLugSize || null,
        caseback_material: formValues.casebackMaterial || null,
        movement: formValues.movement || null,
        has_sapphire: formValues.hasSapphire,
        average_resale_price: data.averageResalePrice || null,
        warranty_date: data.warrantyDate || null,
        when_bought: purchaseDate ? format(purchaseDate, "yyyy-MM-dd") : null,
        warranty_card_url: warrantyCardUrl,
        collection_id: selectedCollectionId,
        user_id: user.id,
        sort_order: nextSortOrder,
        rarity: data.rarity || 'common',
        historical_significance: data.historicalSignificance || 'regular',
        available_for_trade: formValues.availableForTrade,
        complications: prefill?.complications?.length ? prefill.complications : extractComplications(data.type, formValues.movement),
        case_shape: prefill?.case_shape || null,
      }).select().single();

      if (error) throw error;

      // Auto-analyze metadata and generate AI image after creating the watch
      if (insertData?.id) {
        // Run metadata analysis
        try {
          const { data: aiData } = await supabase.functions.invoke('analyze-watch-metadata', {
            body: { brand: data.brand, model: data.model }
          });

          if (aiData?.rarity && aiData?.historical_significance) {
            await supabase
              .from('watches')
              .update({
                rarity: aiData.rarity,
                historical_significance: aiData.historical_significance,
                metadata_analysis_reasoning: aiData.reasoning || null,
                metadata_analyzed_at: new Date().toISOString()
              })
              .eq('id', insertData.id);
          }
        } catch (aiError) {
          console.error('Auto-analysis failed:', aiError);
        }

        // Generate AI image for the watch (non-blocking)
        try {
          const referenceImageForGeneration =
            uploadedPhotoBase64Ref.current || uploadedPhotoBase64 || prefill?.referenceImageBase64 || null;

          console.log('Generating AI watch image with reference:', {
            hasReferenceImage: Boolean(referenceImageForGeneration),
            referenceLength: referenceImageForGeneration?.length || 0,
          });

          supabase.functions.invoke('generate-watch-image', {
            body: {
              watchId: insertData.id,
              brand: data.brand,
              model: data.model,
              dialColor: data.dialColor,
              type: data.type,
              caseSize: formValues.caseSize || undefined,
              movement: formValues.movement || undefined,
              ...(photoHints?.bezelType ? { bezelType: photoHints.bezelType } : {}),
              ...(photoHints?.strapType ? { strapType: photoHints.strapType } : {}),
              ...(photoHints?.notes ? { specialEditionHint: photoHints.notes } : {}),
              ...(referenceImageForGeneration ? { referenceImageBase64: referenceImageForGeneration } : {}),
            }
          }).then(() => {
            console.log('AI image generated for', data.brand, data.model);
          }).catch((imgErr) => {
            console.error('AI image generation failed:', imgErr);
          });
        } catch (imgError) {
          console.error('AI image generation invoke failed:', imgError);
        }
      }

      toast({
        title: "Success",
        description: "Watch added to your collection",
      });

      setOpen(false);
      setModelRef("");
      setPurchaseDate(undefined);
      setUploadedPhotoBase64(null);
      setPhotoHints(null);
      setFormValues({
        brand: "",
        model: "",
        dialColor: "",
        type: "",
        cost: "",
        msrp: "",
        caseSize: "",
        lugToLugSize: "",
        casebackMaterial: "",
        movement: "",
        hasSapphire: null,
        averageResalePrice: "",
        warrantyDate: "",
        warrantyCardFile: null,
        rarity: "common",
        historicalSignificance: "regular",
        availableForTrade: false,
      });
      onSuccess(insertData?.id);
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
          description: "Failed to add watch",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const isExternallyControlled = externalOpen !== undefined;

  return (
    <>
      {!isExternallyControlled && (
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add to Collection
        </Button>
      )}
      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Add New Watch" className="max-w-md max-h-[90vh] flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="photo">📸 Photo Upload</TabsTrigger>
            <TabsTrigger value="manual">✍️ Manual Entry</TabsTrigger>
          </TabsList>
          
          <TabsContent value="photo" className="flex-1 overflow-y-auto mt-4">
            <WatchPhotoUpload 
              onIdentified={(info) => {
                // Auto-fill form with identified watch information
                setFormValues(prev => ({
                  ...prev,
                  brand: info.brand,
                  model: info.model,
                  dialColor: info.dial_color,
                  type: info.type,
                  caseSize: info.case_size || prev.caseSize,
                  movement: info.movement || prev.movement,
                  casebackMaterial: info.case_material || prev.casebackMaterial,
                }));

                setPhotoHints({
                  bezelType: info.bezel_type,
                  strapType: info.strap_type,
                  notes: info.notes,
                });
                
                // Show additional details in toast if available
                const additionalInfo = [];
                if (info.bezel_type) additionalInfo.push(`Bezel: ${info.bezel_type}`);
                if (info.strap_type) additionalInfo.push(`Strap: ${info.strap_type}`);
                
                if (additionalInfo.length > 0) {
                  toast({
                    title: "Additional Details",
                    description: additionalInfo.join(' • '),
                  });
                }
              }}
              onPhotoUploaded={(base64) => setUploadedPhotoBase64(base64)}
              onContinueToForm={() => setActiveTab("manual")}
            />
          </TabsContent>
          
          <TabsContent value="manual" className="flex-1 overflow-y-auto">
            <div className="bg-muted/50 p-3 rounded-lg border border-border mb-4">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Quick Add:</strong> Enter Brand and Model Reference, then click Search to auto-fill details from the web.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="space-y-4 overflow-y-auto pr-2 flex-1">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={formValues.brand}
                onChange={(e) => setFormValues({ ...formValues, brand: e.target.value })}
                required
                maxLength={100}
                placeholder="e.g., Omega, Rolex, IWC"
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelRef">Model Reference (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="modelRef"
                  value={modelRef}
                  onChange={(e) => setModelRef(e.target.value)}
                  placeholder="e.g., 310.30.42.50.01.001"
                  className="bg-background border-border"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLookupReference}
                  disabled={!modelRef || !formValues.brand || loading}
                  className="shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-1" />
                  )}
                  {loading ? "Searching..." : "Search"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                With brand entered above, click Search to auto-fill remaining fields
              </p>
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
              <Input
                id="dialColor"
                value={formValues.dialColor}
                onChange={(e) => setFormValues({ ...formValues, dialColor: e.target.value })}
                required
                maxLength={50}
                className="bg-background border-border"
              />
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
              <Label htmlFor="cost">Price Paid ($)</Label>
              <Input
                id="cost"
                value={formValues.cost}
                onChange={(e) => setFormValues({ ...formValues, cost: e.target.value })}
                type="number"
                step="0.01"
                min="0"
                className="bg-background border-border"
                placeholder="Amount you paid (optional)"
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
              <Label htmlFor="averageResalePrice">Avg. US Resale Price (Optional)</Label>
              <Input
                id="averageResalePrice"
                value={formValues.averageResalePrice}
                onChange={(e) => setFormValues({ ...formValues, averageResalePrice: e.target.value })}
                type="number"
                step="0.01"
                min="0"
                placeholder="Auto-filled from online sources"
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whenBought">Date of Purchase (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background border-border",
                      !purchaseDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {purchaseDate ? format(purchaseDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={purchaseDate}
                    onSelect={setPurchaseDate}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={2000}
                    toYear={new Date().getFullYear()}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="warrantyCard">Warranty Card (Optional)</Label>
              <Input
                id="warrantyCard"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setFormValues({ ...formValues, warrantyCardFile: e.target.files?.[0] || null })}
                className="bg-background border-border"
              />
            </div>

            {/* Optional Specifications Section */}
            {(formValues.caseSize || formValues.lugToLugSize || formValues.casebackMaterial || 
              formValues.movement || formValues.hasSapphire !== null) && (
              <div className="space-y-3 pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground">Additional Specifications</h3>
                
                {formValues.caseSize && (
                  <div className="space-y-1">
                    <Label htmlFor="caseSize" className="text-xs">Case Size</Label>
                    <Input
                      id="caseSize"
                      value={formValues.caseSize}
                      onChange={(e) => setFormValues({ ...formValues, caseSize: e.target.value })}
                      className="bg-background border-border text-sm"
                      placeholder="e.g., 41mm"
                    />
                  </div>
                )}
                
                {formValues.lugToLugSize && (
                  <div className="space-y-1">
                    <Label htmlFor="lugToLugSize" className="text-xs">Lug to Lug</Label>
                    <Input
                      id="lugToLugSize"
                      value={formValues.lugToLugSize}
                      onChange={(e) => setFormValues({ ...formValues, lugToLugSize: e.target.value })}
                      className="bg-background border-border text-sm"
                      placeholder="e.g., 48mm"
                    />
                  </div>
                )}
                
                {formValues.casebackMaterial && (
                  <div className="space-y-1">
                    <Label htmlFor="casebackMaterial" className="text-xs">Caseback Material</Label>
                    <Input
                      id="casebackMaterial"
                      value={formValues.casebackMaterial}
                      onChange={(e) => setFormValues({ ...formValues, casebackMaterial: e.target.value })}
                      className="bg-background border-border text-sm"
                      placeholder="e.g., Stainless Steel"
                    />
                  </div>
                )}
                
                {formValues.movement && (
                  <div className="space-y-1">
                    <Label htmlFor="movement" className="text-xs">Movement</Label>
                    <Input
                      id="movement"
                      value={formValues.movement}
                      onChange={(e) => setFormValues({ ...formValues, movement: e.target.value })}
                      className="bg-background border-border text-sm"
                      placeholder="e.g., Omega Co-Axial 8800"
                    />
                  </div>
                )}
                
                {formValues.hasSapphire !== null && (
                  <div className="space-y-1">
                    <Label className="text-xs">Sapphire Crystal</Label>
                    <div className="text-sm text-foreground">
                      {formValues.hasSapphire ? "Yes" : "No"}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t border-border mt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Adding..." : "Add Watch"}
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
          </TabsContent>
        </Tabs>
      </ResponsiveDialog>
    </>
  );
};
