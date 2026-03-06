import { useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePushNotifications() {
  const { user } = useAuth();

  const registerPush = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !user) return;

    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");

      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== "granted") return;

      await PushNotifications.register();

      PushNotifications.addListener("registration", async (token) => {
        // Store token in database
        await supabase.from("push_tokens").upsert(
          {
            user_id: user.id,
            token: token.value,
            platform: Capacitor.getPlatform(),
          },
          { onConflict: "user_id,token" }
        );
      });

      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("Push notification received:", notification);
      });

      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
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
