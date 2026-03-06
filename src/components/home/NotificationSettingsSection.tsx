import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

interface NotificationPrefs {
  likes_enabled: boolean;
  trades_enabled: boolean;
  friends_enabled: boolean;
}

export function NotificationSettingsSection() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    likes_enabled: true,
    trades_enabled: true,
    friends_enabled: true,
  });
  const [loading, setLoading] = useState(true);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!user) return;
    const fetchPrefs = async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setPrefs({
          likes_enabled: data.likes_enabled,
          trades_enabled: data.trades_enabled,
          friends_enabled: data.friends_enabled,
        });
      }
      setLoading(false);
    };
    fetchPrefs();
  }, [user]);

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!user) return;
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);

    await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: user.id,
          ...newPrefs,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
  };

  if (!isNative) return null;
  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t("settings.notifications")}
        </CardTitle>
        <CardDescription>{t("settings.notificationsDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="likes-notif">{t("settings.likesNotifications")}</Label>
          <Switch
            id="likes-notif"
            checked={prefs.likes_enabled}
            onCheckedChange={(v) => updatePref("likes_enabled", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="trades-notif">{t("settings.tradeNotifications")}</Label>
          <Switch
            id="trades-notif"
            checked={prefs.trades_enabled}
            onCheckedChange={(v) => updatePref("trades_enabled", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="friends-notif">{t("settings.friendNotifications")}</Label>
          <Switch
            id="friends-notif"
            checked={prefs.friends_enabled}
            onCheckedChange={(v) => updatePref("friends_enabled", v)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
