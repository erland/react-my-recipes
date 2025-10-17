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
      "recipeDetail.placeholder": "Detaljvy och borttagning implementeras i steg 3.",
      "recipes.loading": "Laddar recept…",
      "recipes.noResults": "Inga recept hittades.",
      "recipes.noTime": "Ingen tid angiven",
      "recipes.addNew": "Lägg till nytt recept",
      "recipes.edit": "Redigera recept",
      "recipeDetail.notFound": "Receptet kunde inte hittas.",
      "recipeDetail.noDescription": "Ingen beskrivning tillgänglig.",
      "recipeDetail.ingredients": "Ingredienser",
      "recipeDetail.steps": "Tillagning",
      "recipeDetail.minutes": "min",
      "recipeDetail.totalTime": "Total tid: {{minutes}} min",
      "recipeDetail.back": "Tillbaka till listan",
      "recipeDetail.delete": "Radera recept",
      "recipeDetail.confirmDelete": "Är du säker på att du vill radera receptet?",
      "recipeDetail.edit": "Redigera recept",
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
