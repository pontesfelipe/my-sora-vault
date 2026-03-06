import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Camera, RotateCcw, SwitchCamera, Upload } from "lucide-react";

interface CameraViewfinderProps {
  open: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
  onFallbackToUpload?: () => void;
}

export function CameraViewfinder({ open, onClose, onCapture, onFallbackToUpload }: CameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    stopStream();
    setError(null);
    setIsStarting(true);

    const attempts: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1920 },
        },
        audio: false,
      },
      { video: { facingMode: facing }, audio: false },
      { video: true, audio: false },
    ];

    let lastError: unknown = null;

    try {
      for (const constraints of attempts) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          streamRef.current = stream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => undefined);
          }

          setIsStarting(false);
          return;
        } catch (err) {
          lastError = err;
        }
      }

      throw lastError;
    } catch (err: any) {
      console.error("Camera error:", err);
      const errorName = err?.name ?? "UnknownError";

      if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
        setError("Camera permission was denied. Please allow camera access and try again.");
      } else if (errorName === "NotFoundError") {
        setError("No camera was found on this device.");
      } else {
        setError("Could not open the camera. Use retry or upload a photo instead.");
      }
    } finally {
      setIsStarting(false);
    }
  }, [stopStream]);

  useEffect(() => {
    if (open) {
      startCamera(facingMode);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [open, facingMode, startCamera, stopStream]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    const base64 = canvas.toDataURL("image/jpeg", 0.92);
    onCapture(base64);
    handleClose();
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="flex items-center justify-between p-4 z-10">
        <Button variant="ghost" size="icon" onClick={handleClose} className="text-foreground hover:bg-muted/50">
          <X className="w-6 h-6" />
        </Button>
        <span className="text-foreground/80 text-sm font-medium">Position watch in frame</span>
        <Button variant="ghost" size="icon" onClick={toggleCamera} className="text-foreground hover:bg-muted/50" disabled={isStarting}>
          <SwitchCamera className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {error ? (
          <div className="text-center text-foreground/80 px-8 space-y-4">
            <p>{error}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => startCamera(facingMode)}>
                <RotateCcw className="w-4 h-4 mr-2" /> Retry
              </Button>
              {onFallbackToUpload && (
                <Button variant="secondary" onClick={onFallbackToUpload}>
                  <Upload className="w-4 h-4 mr-2" /> Use iPhone Camera
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="absolute inset-0 bg-background/45" />
              <div
                className="relative rounded-full border-2 border-foreground/70 shadow-[0_0_0_9999px_hsl(var(--background)/0.45)]"
                style={{ width: "70vmin", height: "70vmin", maxWidth: 400, maxHeight: 400 }}
              >
                <div className="absolute inset-3 rounded-full border border-dashed border-foreground/40" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-6 h-px bg-foreground/50" />
                  <div className="h-6 w-px bg-foreground/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="absolute bottom-28 left-0 right-0 text-center pointer-events-none">
              <p className="text-foreground text-sm font-medium bg-background/80 inline-block px-4 py-2 rounded-full">
                Fill the circle with the watch face
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-center py-8 bg-background">
        <button
          onClick={handleCapture}
          disabled={!!error || isStarting}
          className="rounded-full border-4 border-foreground flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
          style={{ width: 72, height: 72 }}
          aria-label="Capture photo"
        >
          {isStarting ? (
            <Camera className="w-7 h-7 text-foreground/70" />
          ) : (
            <div className="rounded-full bg-foreground" style={{ width: 56, height: 56 }} />
          )}
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

