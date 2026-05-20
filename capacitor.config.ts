import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
   appId: 'com.godice.app',
  appName: 'GoDice',
  webDir: 'dist'
   ios: {
    useFrameworks: 'static'
  }
};

export default config;
