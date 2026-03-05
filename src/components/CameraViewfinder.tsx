import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Camera, RotateCcw, SwitchCamera } from "lucide-react";

interface CameraViewfinderProps {
  open: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
}

export function CameraViewfinder({ open, onClose, onCapture }: CameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please allow camera permissions.");
    }
  }, []);

  useEffect(() => {
    if (open) {
      startCamera(facingMode);
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [open, facingMode, startCamera]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Capture a square crop centered on the video
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    onClose();
  };

  const toggleCamera = () => {
    setFacingMode(prev => (prev === "environment" ? "user" : "environment"));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 z-10">
        <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20">
          <X className="w-6 h-6" />
        </Button>
        <span className="text-white/80 text-sm font-medium">Position watch in frame</span>
        <Button variant="ghost" size="icon" onClick={toggleCamera} className="text-white hover:bg-white/20">
          <SwitchCamera className="w-5 h-5" />
        </Button>
      </div>

      {/* Camera feed + overlay */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {error ? (
          <div className="text-center text-white/70 px-8 space-y-4">
            <p>{error}</p>
            <Button variant="outline" onClick={() => startCamera(facingMode)} className="text-white border-white/30">
              <RotateCcw className="w-4 h-4 mr-2" /> Retry
            </Button>
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
            {/* Guide overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Dimmed corners */}
              <div className="absolute inset-0 bg-black/40" />
              {/* Clear center circle */}
              <div
                className="relative rounded-full border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"
                style={{ width: "70vmin", height: "70vmin", maxWidth: 400, maxHeight: 400 }}
              >
                {/* Inner guide ring */}
                <div className="absolute inset-3 rounded-full border border-dashed border-white/40" />
                {/* Center crosshair */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-6 h-px bg-white/50" />
                  <div className="h-6 w-px bg-white/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
            {/* Instruction text */}
            <div className="absolute bottom-28 left-0 right-0 text-center pointer-events-none">
              <p className="text-white/90 text-sm font-medium bg-black/50 inline-block px-4 py-2 rounded-full">
                Fill the circle with the watch face
              </p>
            </div>
          </>
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center py-8 bg-black">
        <button
          onClick={handleCapture}
          disabled={!!error}
          className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
          style={{ width: 72, height: 72 }}
        >
          <div className="w-14 h-14 rounded-full bg-white" style={{ width: 56, height: 56 }} />
        </button>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
