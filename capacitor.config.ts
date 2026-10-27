import type { CapacitorConfig } from '@capacitor/cli';

// appId is a PLACEHOLDER: replace with your own reverse-DNS id before submitting to the stores.
const config: CapacitorConfig = {
  appId: 'com.example.atoll',
  appName: 'Lagooner Beach',
  // the release build; `make android-emu` points one sync at its debug bundle (dist-debug/) instead,
  // so dist/ never holds debug hooks a later archive could ship
  webDir: process.env.CAP_WEB_DIR || 'dist',
  backgroundColor: '#0B1622',
  ios: { contentInset: 'never', backgroundColor: '#0B1622' },
  android: { backgroundColor: '#0B1622' },
};

export default config;
