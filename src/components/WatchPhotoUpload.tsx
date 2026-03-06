import { useRef, useState } from "react";
import { Camera, Upload, Loader2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CameraViewfinder } from "@/components/CameraViewfinder";

interface WatchInfo {
  is_watch?: boolean;
  brand: string;
  model: string;
  dial_color: string;
  type: string;
  case_size?: string;
  movement?: string;
  case_material?: string;
  bezel_type?: string;
  strap_type?: string;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

const MAX_REJECTIONS_PER_PHOTO = 3;

interface WatchPhotoUploadProps {
  onIdentified: (info: WatchInfo) => void;
  onPhotoUploaded?: (base64: string) => void;
  onContinueToForm?: () => void;
}

export const WatchPhotoUpload = ({ onIdentified, onPhotoUploaded, onContinueToForm }: WatchPhotoUploadProps) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [identifiedWatch, setIdentifiedWatch] = useState<WatchInfo | null>(null);
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Array<{ brand: string; model: string }>>([]);
  const [sessionRejectionCount, setSessionRejectionCount] = useState(0);
  const [maxRetriesReached, setMaxRetriesReached] = useState(false);
  const [notAWatch, setNotAWatch] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);

  const isIPhone = typeof navigator !== "undefined" && (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );

  const openCamera = () => {
    if (isIPhone) {
      captureInputRef.current?.click();
      return;
    }

    // On desktop/Android, check if camera API is available
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setCameraOpen(true);
    } else {
      // Fallback: open file picker for upload
      toast.info("Camera not available — opening file picker instead.");
      uploadInputRef.current?.click();
    }
  };

  const identifyFromImage = async (base64Image: string, exclusions: Array<{ brand: string; model: string }>) => {
    setIsProcessing(true);
    try {
      const body: any = { image: base64Image };
      if (exclusions.length > 0) body.excluded_suggestions = exclusions;

      const { data, error } = await supabase.functions.invoke('identify-watch-from-photo', { body });

      if (error) throw error;

      setIdentifiedWatch(data);
      toast.success(`Watch identified with ${data.confidence} confidence!`, {
        description: `${data.brand} ${data.model}`
      });
      onIdentified(data);
    } catch (error: any) {
      console.error('Error identifying watch:', error);
      if (error.message?.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (error.message?.includes('quota')) {
        toast.error('AI usage quota exceeded. Please add credits.');
      } else {
        toast.error('Failed to identify watch from photo');
      }
      setPreview(null);
      setIdentifiedWatch(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const processImage = async (file: File) => {
    setIdentifiedWatch(null);
    setRejectedSuggestions([]);

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result as string;
      setPreview(base64Image);
      onPhotoUploaded?.(base64Image);

      // Load past rejections
      let pastRejections: Array<{ brand: string; model: string }> = [];
      if (user) {
        const { data: pastData } = await supabase
          .from("watch_id_rejections")
          .select("rejected_brand, rejected_model")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        if (pastData) {
          pastRejections = pastData.map(r => ({ brand: r.rejected_brand, model: r.rejected_model }));
          setRejectedSuggestions(pastRejections);
        }
      }

      await identifyFromImage(base64Image, pastRejections);
    };

    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
  };

  const handleNotMyWatch = async () => {
    if (!identifiedWatch || !preview || !user) return;
    const rejection = { brand: identifiedWatch.brand || "", model: identifiedWatch.model || "" };
    const updatedRejections = [...rejectedSuggestions, rejection];
    setRejectedSuggestions(updatedRejections);

    // Persist rejection
    supabase.from("watch_id_rejections").insert({
      user_id: user.id,
      rejected_brand: rejection.brand,
      rejected_model: rejection.model,
    }).then(() => {});

    toast.info("Got it — trying again with a different identification...");
    setIdentifiedWatch(null);
    await identifyFromImage(preview, updatedRejections);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      e.target.value = '';
      return;
    }

    processImage(file);
    e.target.value = '';
  };

  const handleCameraCapture = async (base64Image: string) => {
    setIdentifiedWatch(null);
    setRejectedSuggestions([]);
    setPreview(base64Image);
    onPhotoUploaded?.(base64Image);

    let pastRejections: Array<{ brand: string; model: string }> = [];
    if (user) {
      const { data: pastData } = await supabase
        .from("watch_id_rejections")
        .select("rejected_brand, rejected_model")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (pastData) {
        pastRejections = pastData.map(r => ({ brand: r.rejected_brand, model: r.rejected_model }));
        setRejectedSuggestions(pastRejections);
      }
    }
    await identifyFromImage(base64Image, pastRejections);
  };

  const getConfidenceBadgeVariant = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <>
    <Card className="border-2 border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Identify Watch from Photo
        </CardTitle>
        <CardDescription>
          Upload a photo of your watch to automatically identify brand, model, and specifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {preview && (
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden border">
              <img 
                src={preview} 
                alt="Watch photo preview" 
                className="w-full h-64 object-contain bg-muted"
              />
            </div>
            
            {identifiedWatch && (
              <Alert className="border-primary/50 bg-primary/5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="space-y-3">
                  <div className="flex items-center gap-2">
                    <strong>Identified:</strong> {identifiedWatch.brand} {identifiedWatch.model}
                    <Badge variant={getConfidenceBadgeVariant(identifiedWatch.confidence)}>
                      {identifiedWatch.confidence} confidence
                    </Badge>
                  </div>
                  {identifiedWatch.notes && (
                    <p className="text-sm text-muted-foreground">{identifiedWatch.notes}</p>
                  )}
                  {rejectedSuggestions.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Previously rejected: {rejectedSuggestions.map(r => `${r.brand} ${r.model}`).join(", ")}
                    </p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleNotMyWatch}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Retrying...</>
                      ) : (
                        <><X className="w-4 h-4 mr-1" />Not My Watch</>
                      )}
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        onContinueToForm?.();
                      }}
                    >
                      Continue to Add Watch
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {isProcessing && !identifiedWatch && (
              <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Analyzing...</span>
              </div>
            )}
          </div>
        )}
        
        {!preview && (
          <>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isProcessing}
                onClick={() => uploadInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isProcessing}
                onClick={openCamera}
              >
                <Camera className="w-4 h-4 mr-2" />
                Take a Photo
              </Button>
              <input
                ref={uploadInputRef}
                id="watch-photo-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isProcessing}
              />
              <input
                ref={captureInputRef}
                id="watch-photo-capture-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isProcessing}
              />
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>📸 Tips for best results:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Ensure good lighting</li>
                <li>Capture the full watch face clearly</li>
                <li>Include the dial, hands, and any visible text</li>
                <li>Avoid reflections and glare</li>
              </ul>
              <p className="mt-2">Supported: JPG, PNG, WEBP (max 10MB)</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
    <CameraViewfinder
      open={cameraOpen}
      onClose={() => setCameraOpen(false)}
      onCapture={handleCameraCapture}
      onFallbackToUpload={() => {
        setCameraOpen(false);
        uploadInputRef.current?.click();
      }}
    />
    </>
  );
};
