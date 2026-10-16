import type { CapacitorConfig } from '@capacitor/cli';

// appId is a PLACEHOLDER: replace with your own reverse-DNS id before submitting to the stores.
const config: CapacitorConfig = {
  appId: 'com.example.atoll',
  appName: 'Atoll',
  webDir: 'dist',
  backgroundColor: '#0B1622',
  ios: { contentInset: 'never', backgroundColor: '#0B1622' },
  android: { backgroundColor: '#0B1622' },
};

export default config;
