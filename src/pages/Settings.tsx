import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2, KeyRound, Eye, EyeOff, Moon, Sun } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProfileSettingsCard } from "@/components/ProfileSettingsCard";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { TwoFactorAuthCard } from "@/components/TwoFactorAuthCard";
import { SessionManagementCard } from "@/components/SessionManagementCard";
import { LoginHistoryCard } from "@/components/LoginHistoryCard";
import { AccountLinkingCard } from "@/components/AccountLinkingCard";
import { DefaultCollectionCard } from "@/components/DefaultCollectionCard";
import { LanguageSelector } from "@/components/LanguageSelector";
import { NotificationSettingsSection } from "@/components/home/NotificationSettingsSection";
import { useTheme } from "@/contexts/ThemeContext";

const Settings = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isGoogleUser = user?.app_metadata?.provider === "google" || 
                       user?.app_metadata?.providers?.includes("google") ||
                       user?.identities?.some((identity: any) => identity.provider === "google");

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.id, selfDelete: true }
      });
      if (error) throw error;
      toast.success(t("settings.accountDeleted"));
      await signOut();
      navigate("/auth");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error.message || t("settings.failedDeleteAccount"));
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("settings.passwordsDoNotMatch"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("settings.passwordTooShort"));
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t("settings.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || t("settings.failedChangePassword"));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">{t("settings.title")}</h1>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.accountInfo")}</CardTitle>
              <CardDescription>{t("settings.accountEmail")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t("settings.emailLabel")}</label>
                <p className="text-foreground">{user?.email}</p>
              </div>
            </CardContent>
          </Card>

          {!isGoogleUser && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  {t("settings.changePassword")}
                </CardTitle>
                <CardDescription>{t("settings.updatePassword")}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t("settings.newPassword")}</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t("settings.enterNewPassword")}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                    <PasswordStrengthIndicator password={newPassword} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t("settings.confirmNewPassword")}</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t("settings.confirmNewPasswordPlaceholder")}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" disabled={changingPassword}>
                    {changingPassword ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("settings.changingPassword")}</>
                    ) : (
                      t("settings.changePassword")
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <ProfileSettingsCard />
          <DefaultCollectionCard />
          <LanguageSelector />

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.appearance")}</CardTitle>
              <CardDescription>{t("settings.switchTheme")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-medium">{t("settings.theme")}</div>
                  <div className="text-sm text-muted-foreground capitalize">{theme === "light" ? t("settings.lightMode") : t("settings.darkMode")} {t("common.mode")}</div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className="h-10 w-10"
                >
                  {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <NotificationSettingsSection />
          <AccountLinkingCard />
          {!isGoogleUser && <TwoFactorAuthCard />}
          <SessionManagementCard />
          <LoginHistoryCard />

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                {t("settings.dangerZone")}
              </CardTitle>
              <CardDescription>{t("settings.dangerZoneDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">{t("settings.deleteAccount")}</h4>
                  <p className="text-sm text-muted-foreground mb-4">{t("settings.deleteAccountDesc")}</p>
                  <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("settings.deleteMyAccount")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("settings.deleteConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("settings.deleteConfirmDesc")}
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>{t("settings.deleteWatches")}</li>
                  <li>{t("settings.deleteWearEntries")}</li>
                  <li>{t("settings.deleteTrips")}</li>
                  <li>{t("settings.deleteCollections")}</li>
                  <li>{t("settings.deleteWishlist")}</li>
                </ul>
                <p className="mt-2 font-medium">{t("settings.deleteCannotUndo")}</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{t("settings.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("settings.deleting")}</>
                ) : (
                  t("settings.yesDeleteAccount")
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default Settings;
