import { useState } from "react";
import { Camera, Upload, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WatchInfo {
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

interface WatchPhotoUploadProps {
  onIdentified: (info: WatchInfo) => void;
  onPhotoUploaded?: (base64: string) => void;
  onContinueToForm?: () => void;
}

export const WatchPhotoUpload = ({ onIdentified, onPhotoUploaded, onContinueToForm }: WatchPhotoUploadProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [identifiedWatch, setIdentifiedWatch] = useState<WatchInfo | null>(null);

  const processImage = async (file: File) => {
    try {
      setIsProcessing(true);
      setIdentifiedWatch(null);
      
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Image = reader.result as string;
        setPreview(base64Image);
        
        // Pass the photo to parent for AI image generation
        onPhotoUploaded?.(base64Image);

        try {
          const { data, error } = await supabase.functions.invoke('identify-watch-from-photo', {
            body: { image: base64Image }
          });

          if (error) throw error;

          setIdentifiedWatch(data);
          
          const confidenceColor = 
            data.confidence === 'high' ? 'text-green-500' : 
            data.confidence === 'medium' ? 'text-yellow-500' : 
            'text-orange-500';
          
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
        } finally {
          setIsProcessing(false);
        }
      };

      reader.onerror = () => {
        toast.error('Failed to read image file');
        setIsProcessing(false);
      };
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image');
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    processImage(file);
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
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setPreview(null);
                        setIdentifiedWatch(null);
                      }}
                    >
                      Cancel
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
                onClick={() => document.getElementById('watch-photo-input')?.click()}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isProcessing}
                onClick={() => document.getElementById('watch-camera-input')?.click()}
              >
                <Camera className="w-4 h-4 mr-2" />
                Take a Photo
              </Button>
              <input
                id="watch-photo-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isProcessing}
              />
              <input
                id="watch-camera-input"
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
  );
};
