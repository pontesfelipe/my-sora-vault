/**
 * Native app utilities for Capacitor integration.
 * Safe to call on web — all calls are no-ops when not running natively.
 */

import { Capacitor } from '@capacitor/core';

const isNative = () => Capacitor.isNativePlatform();

// --- Status Bar ---

export async function configureStatusBar() {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: true });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#080B14' });
    }
  } catch {
    // Plugin not available
  }
}

// --- Splash Screen ---

export async function hideSplashScreen() {
  if (!isNative()) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {
    // Plugin not available
  }
}

// --- Keyboard ---

export async function configureKeyboard() {
  if (!isNative()) return;
  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    // Scroll active element into view when keyboard opens
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });
  } catch {
    // Plugin not available
  }
}

// --- Network ---

export async function addNetworkListener(onChange: (connected: boolean) => void) {
  if (!isNative()) return;
  try {
    const { Network } = await import('@capacitor/network');
    Network.addListener('networkStatusChange', (status) => {
      onChange(status.connected);
    });
  } catch {
    // Plugin not available
  }
}

// --- App lifecycle (back button on Android) ---

export async function configureBackButton(handler: () => void) {
  if (!isNative()) return;
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        handler();
      }
    });
  } catch {
    // Plugin not available
  }
}

// --- Init all native capabilities ---

export async function initNativeApp() {
  if (!isNative()) return;
  await Promise.all([
    configureStatusBar(),
    configureKeyboard(),
  ]);
  // Hide native splash after our web app is ready
  await hideSplashScreen();
}
