import { useEffect, useState } from "react";
import { Palette, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
  useSiteSettings,
} from "@/contexts/SiteSettingsContext";
import { useToast } from "@/hooks/use-toast";

type SiteBrandingTabProps = {
  canEdit: boolean;
};

export function SiteBrandingTab({ canEdit }: SiteBrandingTabProps) {
  const { settings, saveSettings, loading } = useSiteSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SiteSettings>(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const setField = (field: keyof SiteSettings, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetDefaults = () => {
    setForm(DEFAULT_SITE_SETTINGS);
  };

  const onSave = async () => {
    if (!canEdit) return;

    setSaving(true);
    try {
      await saveSettings(form);
      toast({
        title: "Branding updated",
        description: "Site branding was saved.",
      });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.message || "Could not save site settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Site Branding
        </CardTitle>
        <CardDescription>
          Customize your portal identity. Branding settings sync with the platform API.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!canEdit && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Only admin or registrar roles can edit global branding.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="siteName">Site name</Label>
            <Input
              id="siteName"
              value={form.siteName}
              onChange={(e) => setField("siteName", e.target.value)}
              disabled={!canEdit || loading}
              placeholder="Nexus University"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shortName">Short name</Label>
            <Input
              id="shortName"
              value={form.shortName}
              onChange={(e) => setField("shortName", e.target.value)}
              disabled={!canEdit || loading}
              placeholder="UniPortal"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={form.tagline}
              onChange={(e) => setField("tagline", e.target.value)}
              disabled={!canEdit || loading}
              placeholder="Unified academic management platform"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              value={form.logoUrl}
              onChange={(e) => setField("logoUrl", e.target.value)}
              disabled={!canEdit || loading}
              placeholder="https://your-site.com/logo.png"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support email</Label>
            <Input
              id="supportEmail"
              value={form.supportEmail}
              onChange={(e) => setField("supportEmail", e.target.value)}
              disabled={!canEdit || loading}
              placeholder="support@nexus.edu"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary color</Label>
            <Input
              id="primaryColor"
              value={form.primaryColor}
              onChange={(e) => setField("primaryColor", e.target.value)}
              disabled={!canEdit || loading}
              placeholder="#7c3aed"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryColor">Secondary color</Label>
            <Input
              id="secondaryColor"
              value={form.secondaryColor}
              onChange={(e) => setField("secondaryColor", e.target.value)}
              disabled={!canEdit || loading}
              placeholder="#f97316"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onSave} disabled={!canEdit || saving || loading}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Branding"}
          </Button>
          <Button
            variant="outline"
            onClick={resetDefaults}
            disabled={!canEdit || saving || loading}
          >
            Restore Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
