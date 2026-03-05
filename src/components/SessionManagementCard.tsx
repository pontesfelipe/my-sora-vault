import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Monitor, Smartphone, Globe, LogOut, MapPin, Clock } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface SessionInfo {
  id: string;
  created_at: string;
  updated_at: string;
  user_agent: string;
  ip: string;
  isCurrent: boolean;
}

const parseUserAgent = (ua: string): { device: string; browser: string; icon: React.ReactNode } => {
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  let browser = "Unknown Browser";
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";
  else if (ua.includes("Opera")) browser = "Opera";
  let device = isMobile ? "Mobile Device" : "Desktop";
  if (ua.includes("Windows")) device = "Windows";
  else if (ua.includes("Mac")) device = "Mac";
  else if (ua.includes("Linux")) device = "Linux";
  else if (ua.includes("iPhone")) device = "iPhone";
  else if (ua.includes("iPad")) device = "iPad";
  else if (ua.includes("Android")) device = "Android";
  const icon = isMobile ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />;
  return { device, browser, icon };
};

export const SessionManagementCard = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) { setSessions([]); return; }
      const sessionInfo: SessionInfo = {
        id: currentSession.access_token.slice(-8),
        created_at: new Date(currentSession.expires_at! * 1000 - 3600000).toISOString(),
        updated_at: new Date().toISOString(),
        user_agent: navigator.userAgent,
        ip: "Current Location",
        isCurrent: true
      };
      setSessions([sessionInfo]);
    } catch (error: any) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutAllDevices = async () => {
    setRevoking(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      toast.success(t("settings.signedOutAll"));
    } catch (error: any) {
      console.error("Error signing out all devices:", error);
      toast.error(error.message || t("settings.failed"));
    } finally {
      setRevoking(false);
      setShowRevokeAllConfirm(false);
    }
  };

  const handleSignOutOtherDevices = async () => {
    setRevoking(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;
      toast.success(t("settings.signedOutOther"));
      fetchSessions();
    } catch (error: any) {
      console.error("Error signing out other devices:", error);
      toast.error(error.message || t("settings.failed"));
    } finally {
      setRevoking(false);
      setShowRevokeConfirm(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("settings.activeSessions")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("settings.activeSessions")}
          </CardTitle>
          <CardDescription>{t("settings.activeSessionsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("settings.noActiveSessions")}</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const { device, browser, icon } = parseUserAgent(session.user_agent);
                return (
                  <div key={session.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="p-2 bg-muted rounded-lg">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{device}</span>
                        {session.isCurrent && <Badge variant="secondary" className="text-xs">{t("settings.current")}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{browser}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{session.ip}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t("settings.activeNow")}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowRevokeConfirm(true)}>
              <LogOut className="w-4 h-4 mr-2" />{t("settings.signOutOtherDevices")}
            </Button>
            <Button variant="outline" className="flex-1 text-destructive border-destructive/50 hover:bg-destructive/10" onClick={() => setShowRevokeAllConfirm(true)}>
              <LogOut className="w-4 h-4 mr-2" />{t("settings.signOutAllDevices")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showRevokeConfirm} onOpenChange={setShowRevokeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.signOutOtherTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.signOutOtherDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>{t("settings.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOutOtherDevices} disabled={revoking}>
              {revoking ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("settings.signingOut")}</>) : t("settings.signOutOtherDevices")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRevokeAllConfirm} onOpenChange={setShowRevokeAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.signOutAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.signOutAllDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>{t("settings.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOutAllDevices} disabled={revoking} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {revoking ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("settings.signingOut")}</>) : t("settings.signOutAllDevices")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
