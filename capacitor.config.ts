import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.warmstitch.boutique',
  appName: 'WarmStitch',
  webDir: 'capacitor-www',
  server: {
    url: 'https://warmstitch-boutique.vercel.app',
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
