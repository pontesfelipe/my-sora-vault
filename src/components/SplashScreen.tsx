import { useEffect, useState } from "react";
import { Watch } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SplashScreenProps {
  onComplete?: () => void;
  minDuration?: number;
}

export const SplashScreen = ({ onComplete, minDuration = 1500 }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFading(true);
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 500);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/10" />
      
      {/* Animated glow effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="relative">
          <div 
            className="flex h-28 w-28 items-center justify-center rounded-3xl bg-accent/15 text-5xl font-bold text-accent shadow-2xl shadow-accent/30 animate-scale-in"
            style={{ animationDuration: '0.6s' }}
          >
            LV
          </div>
          {/* Decorative ring */}
          <div className="absolute -inset-4 rounded-[2.5rem] border-2 border-accent/20 animate-pulse" />
          <div className="absolute -inset-8 rounded-[3rem] border border-accent/10 animate-pulse" style={{ animationDelay: '0.2s' }} />
        </div>

        {/* Brand name */}
        <div 
          className="flex flex-col items-center gap-2 animate-fade-in"
          style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}
        >
          <h1 className="text-4xl font-bold tracking-tight text-textMain">
            {t("splash.brandName")}
          </h1>
          <p className="text-sm text-textMuted tracking-widest uppercase">
            {t("splash.tagline")}
          </p>
        </div>

        {/* Collection type icon */}
        <div 
          className="flex items-center gap-6 animate-fade-in"
          style={{ animationDelay: '0.5s', animationFillMode: 'backwards' }}
        >
          <div className="flex flex-col items-center gap-2 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 transition-all group-hover:bg-accent/20">
              <Watch className="h-6 w-6 text-accent" />
            </div>
            <span className="text-xs text-textMuted">{t("splash.watches")}</span>
          </div>
        </div>

        {/* Loading indicator */}
        <div 
          className="flex items-center gap-2 mt-4 animate-fade-in"
          style={{ animationDelay: '0.7s', animationFillMode: 'backwards' }}
        >
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div 
        className="absolute bottom-8 text-xs text-textMuted/50 animate-fade-in"
        style={{ animationDelay: '0.9s', animationFillMode: 'backwards' }}
      >
        {t("splash.footer")}
      </div>
    </div>
  );
};
