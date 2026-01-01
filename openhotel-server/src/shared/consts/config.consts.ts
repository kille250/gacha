import { ConfigTypes } from "shared/types/config.types.ts";

// Use PORT env variable for Render.com compatibility, fallback to 1994
const serverPort = parseInt(Deno.env.get("PORT") || "1994", 10);

export const CONFIG_DEFAULT: ConfigTypes = {
  version: "latest",
  name: "Open Hotel",
  description: "Welcome to the Hotel!",
  port: serverPort,
  limits: {
    players: 100,
  },
  languages: ["en", "es"],
  auth: {
    enabled: false,
    licenseToken: "",
    api: "https://auth.openhotel.club",
  },
  onet: {
    enabled: false,
    api: "https://onet.openhotel.club",
  },
  phantom: {
    enabled: true,
    browser: {
      name: "chrome",
      buildId: "135.0.7049.114",
    },
    sleep: 60,
  },
  autoupdate: {
    enabled: true,
    cron: "0 4 * * *",
  },
};
