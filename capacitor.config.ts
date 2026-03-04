import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.72544633c6de4f7cb6849aa3669864ca',
  appName: 'Luxury Vault',
  webDir: 'dist',
  server: {
    url: 'https://72544633-c6de-4f7c-b684-9aa3669864ca.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#080B14',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080B14',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#080B14',
    scheme: 'luxuryvault',
  },
  android: {
    backgroundColor: '#080B14',
    allowMixedContent: false,
  },
};

export default config;
