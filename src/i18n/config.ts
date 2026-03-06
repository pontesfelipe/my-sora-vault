import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

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

// On native platforms, sync Capacitor Preferences → localStorage before i18n init
async function syncNativeLanguage() {
  if (Capacitor.isNativePlatform()) {
    try {
      const { value } = await Preferences.get({ key: LANG_KEY });
      if (value) {
        localStorage.setItem(LANG_KEY, value);
      }
    } catch {
      // ignore — fall through to normal detection
    }
  }
}

// Eagerly sync (best-effort before i18n init)
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

// Persist language changes to Capacitor Preferences on native
i18n.on('languageChanged', (lng) => {
  if (Capacitor.isNativePlatform()) {
    Preferences.set({ key: LANG_KEY, value: lng }).catch(() => {});
  }
});

export default i18n;
