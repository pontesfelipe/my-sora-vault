import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface StrengthResult {
  score: number;
  labelKey: string;
  color: string;
}

const calculateStrength = (password: string): StrengthResult => {
  if (!password) return { score: 0, labelKey: "", color: "" };

  let score = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  if (checks.length) score++;
  if (checks.lowercase) score++;
  if (checks.uppercase) score++;
  if (checks.numbers) score++;
  if (checks.special) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  if (score <= 2) return { score: 1, labelKey: "settings.passwordWeak", color: "bg-destructive" };
  if (score <= 4) return { score: 2, labelKey: "settings.passwordFair", color: "bg-orange-500" };
  if (score <= 5) return { score: 3, labelKey: "settings.passwordGood", color: "bg-yellow-500" };
  return { score: 4, labelKey: "settings.passwordStrong", color: "bg-green-500" };
};

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const { t } = useTranslation();
  const strength = useMemo(() => calculateStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div key={level} className={cn("h-1.5 flex-1 rounded-full transition-colors", level <= strength.score ? strength.color : "bg-muted")} />
        ))}
      </div>
      <p className={cn(
        "text-xs transition-colors",
        strength.score === 1 && "text-destructive",
        strength.score === 2 && "text-orange-500",
        strength.score === 3 && "text-yellow-600",
        strength.score === 4 && "text-green-600"
      )}>
        {strength.labelKey ? t(strength.labelKey) : ""}
      </p>
    </div>
  );
};
