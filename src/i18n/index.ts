import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  "sv-SE": {
    translation: {
      "app.title": "Receptlådan",
      "nav.recipes": "Recept",
      "nav.settings": "Inställningar",
      "recipes.title": "Recept",
      "recipes.searchEverything": "Sök i allt…",
      "recipes.maxTotalTime": "Maximal total tid: {{minutes}} min",
      "recipes.placeholderList": "Här kommer listan. (Steg 2–3 bygger sökningen och listan.)",
      "settings.title": "Inställningar",
      "settings.autoSync": "Automatisk synk (kommer senare)",
      "settings.installPwa": "Installera som PWA (systemdialog)",
      "settings.note": "Fler inställningar kommer i senare steg (synk, export/import, språk med mera).",
      "recipeDetail.title": "Receptdetalj – ID: {{id}}",
      "recipeDetail.placeholder": "Detaljvy och borttagning implementeras i steg 3."
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "sv-SE",
    fallbackLng: "sv-SE",
    interpolation: { escapeValue: false }
  });

export default i18n;
