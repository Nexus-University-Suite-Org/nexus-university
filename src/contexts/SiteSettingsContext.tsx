import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface SiteSettings {
  siteName: string;
  shortName: string;
  tagline: string;
  logoUrl: string;
  supportEmail: string;
  primaryColor: string;
  secondaryColor: string;
}

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: "Nexus University",
  shortName: "UniPortal",
  tagline: "Unified academic management platform",
  logoUrl: "",
  supportEmail: "support@nexus.edu",
  primaryColor: "#7c3aed",
  secondaryColor: "#f97316",
};

interface SiteSettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  canEdit: boolean;
  saveSettings: (nextSettings: SiteSettings) => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(
  undefined,
);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(false);
  const faviconOriginalHrefRef = useRef<string | null>(null);

  useEffect(() => {
    document.title = settings.siteName;

    const descriptionMeta = document.querySelector(
      'meta[name="description"]',
    ) as HTMLMetaElement | null;
    if (descriptionMeta) {
      descriptionMeta.content = settings.tagline;
    }

    const ogTitleMeta = document.querySelector(
      'meta[property="og:title"]',
    ) as HTMLMetaElement | null;
    if (ogTitleMeta) {
      ogTitleMeta.content = settings.siteName;
    }

    const ogDescriptionMeta = document.querySelector(
      'meta[property="og:description"]',
    ) as HTMLMetaElement | null;
    if (ogDescriptionMeta) {
      ogDescriptionMeta.content = settings.tagline;
    }

    const root = document.documentElement;
    root.style.setProperty("--brand-primary", settings.primaryColor);
    root.style.setProperty("--brand-secondary", settings.secondaryColor);

    const faviconElement = document.querySelector(
      'link[rel="icon"]',
    ) as HTMLLinkElement | null;

    if (faviconElement && faviconOriginalHrefRef.current === null) {
      faviconOriginalHrefRef.current = faviconElement.href;
    }

    if (!faviconElement) {
      return;
    }

    if (settings.logoUrl) {
      faviconElement.href = settings.logoUrl;
    } else if (faviconOriginalHrefRef.current) {
      faviconElement.href = faviconOriginalHrefRef.current;
    }
  }, [settings]);

  const saveSettings = useCallback(async (_nextSettings: SiteSettings) => {
    // TODO: implement via platform API when backend endpoint is available
  }, []);

  const canEdit = false;

  const value = useMemo(
    () => ({
      settings,
      loading,
      canEdit,
      saveSettings,
    }),
    [settings, loading, canEdit, saveSettings],
  );

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);

  if (!context) {
    throw new Error("useSiteSettings must be used inside SiteSettingsProvider");
  }

  return context;
}

export { DEFAULT_SITE_SETTINGS };
