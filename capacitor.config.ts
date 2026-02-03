import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.qless.game',
  appName: 'Q-Less',
  webDir: 'out',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'Q-Less',
  },
  server: {
    iosScheme: 'capacitor',
  },
};

export default config;
