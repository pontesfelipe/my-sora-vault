import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, MapPin, Loader2, Upload, X, Palette } from "lucide-react";
import { UserAvatar, AVATAR_COLORS } from "@/components/UserAvatar";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";
import { cn } from "@/lib/utils";

interface ProfileData {
  full_name: string;
  username: string;
  country: string;
  state: string;
  city: string;
  avatar_url: string | null;
  avatar_color: string | null;
}

interface PreferencesData {
  trade_match_scope: string;
}

export function ProfileSettingsCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    username: "",
    country: "",
    state: "",
    city: "",
    avatar_url: null,
    avatar_color: null,
  });
  const [preferences, setPreferences] = useState<PreferencesData>({
    trade_match_scope: "global",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, username, country, state, city, avatar_url, avatar_color")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile({
            full_name: profileData.full_name || "",
            username: profileData.username || "",
            country: profileData.country || "",
            state: profileData.state || "",
            city: profileData.city || "",
            avatar_url: profileData.avatar_url,
            avatar_color: profileData.avatar_color,
          });
        }

        const { data: prefsData } = await supabase
          .from("user_preferences")
          .select("trade_match_scope")
          .eq("user_id", user.id)
          .single();

        if (prefsData) {
          setPreferences({
            trade_match_scope: prefsData.trade_match_scope || "global",
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("settings.uploadImageFile"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("settings.imageTooLarge"));
      return;
    }
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
    setCropDialogOpen(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCroppedAvatar = async (croppedBlob: Blob) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedBlob, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrlWithTimestamp })
        .eq("id", user.id);
      if (updateError) throw updateError;
      setProfile({ ...profile, avatar_url: avatarUrlWithTimestamp });
      toast.success(t("settings.avatarUploaded"));
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error(t("settings.failedUploadAvatar"));
    } finally {
      setUploadingAvatar(false);
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop);
        setImageToCrop(null);
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      if (error) throw error;
      setProfile({ ...profile, avatar_url: null });
      toast.success(t("settings.avatarRemoved"));
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast.error(t("settings.failedRemoveAvatar"));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name || null,
          username: profile.username || null,
          country: profile.country || null,
          state: profile.state || null,
          city: profile.city || null,
          avatar_color: profile.avatar_color,
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

      const { error: prefsError } = await supabase
        .from("user_preferences")
        .upsert({ user_id: user.id, trade_match_scope: preferences.trade_match_scope }, { onConflict: "user_id" });
      if (prefsError) throw prefsError;

      toast.success(t("settings.profileUpdated"));
    } catch (error: any) {
      console.error("Error saving profile:", error);
      if (error.code === "23505") {
        toast.error(t("settings.usernameTaken"));
      } else {
        toast.error(t("settings.failedSaveProfile"));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t("settings.avatar")}
          </CardTitle>
          <CardDescription>{t("settings.avatarDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <UserAvatar username={profile.username} fullName={profile.full_name} avatarUrl={profile.avatar_url} avatarColor={profile.avatar_color} size="lg" className="h-16 w-16 text-xl" />
            <div className="space-y-2">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  {t("settings.uploadPhoto")}
                </Button>
                {profile.avatar_url && (
                  <Button variant="ghost" size="sm" onClick={handleRemoveAvatar}>
                    <X className="h-4 w-4 mr-2" />
                    {t("settings.remove")}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t("settings.avatarFileHint")}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("settings.avatarColor")}</Label>
            <p className="text-xs text-muted-foreground mb-2">{t("settings.avatarColorDesc")}</p>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((color) => (
                <button key={color.value} type="button" onClick={() => setProfile({ ...profile, avatar_color: color.value })} className={cn("w-8 h-8 rounded-full transition-all", color.value, profile.avatar_color === color.value ? "ring-2 ring-offset-2 ring-primary" : "hover:scale-110")} title={color.name} />
              ))}
              <button type="button" onClick={() => setProfile({ ...profile, avatar_color: null })} className={cn("w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center text-xs text-muted-foreground transition-all", profile.avatar_color === null ? "ring-2 ring-offset-2 ring-primary" : "hover:scale-110")} title={t("settings.autoColor")}>A</button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("settings.profileInfo")}
          </CardTitle>
          <CardDescription>{t("settings.profileInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="username">{t("settings.usernamePublic")}</Label>
              <Input id="username" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} placeholder={t("settings.usernamePlaceholder")} />
              <p className="text-xs text-muted-foreground">{t("settings.usernameHint")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">{t("settings.fullNamePrivate")}</Label>
              <Input id="full_name" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder={t("settings.fullNamePlaceholder")} />
              <p className="text-xs text-muted-foreground">{t("settings.fullNameHint")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t("settings.location")}
          </CardTitle>
          <CardDescription>{t("settings.locationDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="country">{t("settings.country")}</Label>
              <Input id="country" value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} placeholder={t("settings.countryPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">{t("settings.stateRegion")}</Label>
              <Input id="state" value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })} placeholder={t("settings.statePlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{t("settings.city")}</Label>
              <Input id="city" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder={t("settings.cityPlaceholder")} />
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="trade_scope">{t("settings.tradeMatchPref")}</Label>
            <Select value={preferences.trade_match_scope} onValueChange={(value) => setPreferences({ ...preferences, trade_match_scope: value })}>
              <SelectTrigger id="trade_scope" className="w-full sm:w-[280px]">
                <SelectValue placeholder={t("settings.selectMatchScope")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">{t("settings.scopeGlobal")}</SelectItem>
                <SelectItem value="same_country">{t("settings.scopeCountry")}</SelectItem>
                <SelectItem value="same_state">{t("settings.scopeState")}</SelectItem>
                <SelectItem value="same_city">{t("settings.scopeCity")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("settings.tradeMatchHint")}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("settings.saving")}</>) : t("settings.saveChanges")}
        </Button>
      </div>

      {imageToCrop && (
        <AvatarCropDialog open={cropDialogOpen} onOpenChange={(open) => { setCropDialogOpen(open); if (!open && imageToCrop) { URL.revokeObjectURL(imageToCrop); setImageToCrop(null); } }} imageSrc={imageToCrop} onCropComplete={handleCroppedAvatar} />
      )}
    </div>
  );
}
