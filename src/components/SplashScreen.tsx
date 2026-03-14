import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import logoImg from "@/assets/logo-transparent.png";

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
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--gold)/0.05)] via-transparent to-[hsl(var(--gold)/0.08)]" />
      
      {/* Animated glow effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[hsl(var(--gold)/0.08)] rounded-full blur-[100px] animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="relative">
          <div 
            className="flex h-24 w-24 items-center justify-center animate-scale-in"
            style={{ animationDuration: '0.6s' }}
          >
            <img src={logoImg} alt="Luxury Vault" className="h-full w-full object-contain drop-shadow-[0_0_20px_hsl(var(--gold)/0.4)]" />
          </div>
          {/* Decorative ring */}
          <div className="absolute -inset-6 rounded-full border border-[hsl(var(--gold)/0.15)] animate-pulse" />
          <div className="absolute -inset-12 rounded-full border border-[hsl(var(--gold)/0.08)] animate-pulse" style={{ animationDelay: '0.2s' }} />
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


        {/* Loading indicator */}
        <div 
          className="flex items-center gap-2 mt-4 animate-fade-in"
          style={{ animationDelay: '0.7s', animationFillMode: 'backwards' }}
        >
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--gold))] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--gold))] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--gold))] animate-bounce" style={{ animationDelay: '300ms' }} />
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
