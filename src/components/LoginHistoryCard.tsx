import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Monitor, Smartphone, Tablet, MapPin, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface LoginEntry {
  id: string;
  login_at: string;
  ip_address: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  success: boolean;
  failure_reason: string | null;
}

export const LoginHistoryCard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [history, setHistory] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('login_history').select('*').eq('user_id', user.id).order('login_at', { ascending: false }).limit(20);
      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching login history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [user]);

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle>{t("settings.loginHistory")}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchHistory} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>{t("settings.loginHistoryDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t("settings.noLoginHistory")}</p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
                    {getDeviceIcon(entry.device_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{entry.browser || t("settings.unknownBrowser")}</span>
                      {entry.os && <span className="text-xs text-muted-foreground">on {entry.os}</span>}
                      {entry.success ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />{t("settings.success")}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />{t("settings.failed")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      {entry.country || t("settings.unknownLocation")}
                      {entry.ip_address && <span className="ml-2">• {entry.ip_address}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(entry.login_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    {entry.failure_reason && (
                      <p className="text-xs text-destructive mt-1">{t("settings.reason", { reason: entry.failure_reason })}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
