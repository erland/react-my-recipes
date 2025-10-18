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
      "recipes.favorite": "Favorit",
      "recipes.unfavorite": "Ta bort favorit",
      "recipes.placeholderList": "Här kommer listan. (Steg 2–3 bygger sökningen och listan.)",
      "settings.title": "Inställningar",
      "settings.exportImport.title": "Exportera/Importera",
      "settings.exportImport.desc": "Exportera alla recept till en JSON-fil eller importera från en tidigare export. Bilder hanteras senare.",
      "settings.export.json": "Exportera JSON",
      "settings.import.json": "Importera JSON",
      "settings.export.success": "Export klar – filen laddades ned.",
      "settings.export.error": "Export misslyckades.",
      "settings.import.success": "Import klar – totalt: {{total}}, tillagda: {{added}}, uppdaterade: {{updated}}.",
      "settings.import.error": "Import misslyckades. Kontrollera filformatet.",
      "settings.autoSync": "Automatisk synk (kommer senare)",
      "settings.installPwa": "Installera som PWA (systemdialog)",
      "settings.note": "Fler inställningar kommer i senare steg (synk, export/import, språk med mera).",
      "settings.sync.title": "Molnsynk (Google Drive)",
      "settings.sync.desc": "Koppla till Google Drive för att säkerhetskopiera och dela recept i din egen mapp.",
      "settings.sync.status": "Status",
      "settings.sync.connected": "Ansluten",
      "settings.sync.disconnected": "Inte ansluten",
      "settings.sync.connect": "Koppla konto",
      "settings.sync.disconnect": "Koppla från",
      "settings.sync.syncNow": "Synka nu",
      "settings.sync.auto": "Automatisk synk",
      "settings.sync.connectedSnack": "Drive anslutet.",
      "settings.sync.syncedSnack": "Synk klar – {{merged}} recept sammanlagda.",
      "settings.sync.error": "Synk misslyckades",
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
      "recipeDialog.addTitle": "Nytt recept",
      "recipeDialog.editTitle": "Redigera recept",
      "recipeDialog.title": "Titel",
      "recipeDialog.description": "Beskrivning",
      "recipeDialog.totalTime": "Total tid (minuter)",
      "recipeDialog.ingredients": "Ingredienser",
      "recipeDialog.ingredientName": "Ingrediens",
      "recipeDialog.quantity": "Mängd",
      "recipeDialog.addIngredient": "Lägg till ingrediens",
      "recipeDialog.steps": "Steg",
      "recipeDialog.stepText": "Beskrivning av steg",
      "recipeDialog.addStep": "Lägg till steg",
      "common.cancel": "Avbryt",
      "common.save": "Spara",
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
