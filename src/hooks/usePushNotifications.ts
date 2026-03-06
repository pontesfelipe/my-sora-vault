import { useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePushNotifications() {
  const { user } = useAuth();

  const registerPush = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !user) return;

    try {
      // Dynamic import — only available in native builds
      const mod = await import("@capacitor/push-notifications" as any);
      const PushNotifications = mod.PushNotifications;

      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== "granted") return;

      await PushNotifications.register();

      PushNotifications.addListener("registration", async (token: any) => {
        await (supabase as any).from("push_tokens").upsert(
          {
            user_id: user.id,
            token: token.value,
            platform: Capacitor.getPlatform(),
          },
          { onConflict: "user_id,token" }
        );
      });

      PushNotifications.addListener("pushNotificationReceived", (notification: any) => {
        console.log("Push notification received:", notification);
      });

      PushNotifications.addListener("pushNotificationActionPerformed", (action: any) => {
        const data = action.notification.data;
        if (data?.route) {
          window.location.href = data.route;
        }
      });
    } catch (e) {
      console.warn("Push notifications not available:", e);
    }
  }, [user]);

  useEffect(() => {
    registerPush();
  }, [registerPush]);
}
