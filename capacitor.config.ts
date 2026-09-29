import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.assistance.ai',
  appName: 'Assistance',
  webDir: 'public',
  server: {
    url: 'https://concrete-commissioner-handy-permitted.trycloudflare.com',
    cleartext: true,
    androidScheme: 'https',
  },
};

export default config;
