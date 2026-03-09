import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { Capacitor } from '@capacitor/core';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';

export const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
] as const;

const LANG_KEY = 'i18nextLng';

// Helper to get Preferences plugin lazily (avoids top-level import issues)
async function getNativePreferences() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    return Preferences;
  } catch {
    return null;
  }
}

// Sync native stored language to localStorage before i18n uses it
async function syncNativeLanguage() {
  const prefs = await getNativePreferences();
  if (!prefs) return;
  try {
    const { value } = await prefs.get({ key: LANG_KEY });
    if (value) {
      localStorage.setItem(LANG_KEY, value);
    }
  } catch {
    // ignore
  }
}

// Best-effort sync before init (won't block)
syncNativeLanguage();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      pt: { translation: pt },
      ja: { translation: ja },
      zh: { translation: zh },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LANG_KEY,
      convertDetectedLanguage: (lng: string) => lng.split('-')[0],
    },
  });

// Persist language changes to native storage
i18n.on('languageChanged', async (lng) => {
  const prefs = await getNativePreferences();
  if (prefs) {
    prefs.set({ key: LANG_KEY, value: lng }).catch(() => {});
  }
});

/**
 * Sync language from the database (global across devices).
 * Call after the user is authenticated.
 */
export async function syncLanguageFromDB(userId: string) {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferred_language')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch language preference:', error);
      return;
    }

    if (data?.preferred_language && data.preferred_language !== i18n.language) {
      await i18n.changeLanguage(data.preferred_language);
    }
  } catch (err) {
    console.error('Error syncing language from DB:', err);
  }
}

export default i18n;
