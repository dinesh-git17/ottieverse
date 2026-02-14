import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "dev.dineshd.ottieverse",
  appName: "OttieVerse",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  ios: {
    contentInset: "never",
  },
};

export default config;
