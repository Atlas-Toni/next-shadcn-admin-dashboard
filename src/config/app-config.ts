import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "ATLAS",
  version: packageJson.version,
  copyright: `© ${currentYear}, ATLAS.`,
  meta: {
    title: "ATLAS - Modern Next.js Dashboard Starter Template",
    description:
      "ATLAS — Opportunity Engine voor Puro. Lokale/hybride AI-agents scannen kansen, schrijven voorstellen en tonen alles in deze HUD.",
  },
};
