import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  "sv-SE": {
    translation: {
      "app.title": "Receptlådan",
      "nav.recipes": "Recept",
      "nav.settings": "Inställningar",

      // Recipes list
      "recipes.title": "Recept",
      "recipes.search": "Sök i allt…",
      "recipes.maxTime": "Maximal total tid: {{minutes}} min",
      "recipes.favorite": "Favoritmarkera",
      "recipes.unfavorite": "Ta bort favorit",
      "recipes.loading": "Laddar recept…",
      "recipes.noResults": "Inga recept hittades.",
      "recipes.noLimit": "Ingen tid angiven",
      "recipes.addNew": "Lägg till nytt recept",
      "recipes.edit": "Redigera recept",

      // Add / Import menu
      "recipes.createManual": "Skapa manuellt",
      "recipes.importFromUrl": "Importera från länk…",
      "recipes.importFromPaste": "Klistra in…",
      "recipes.importUrlLabel": "Klistra in receptlänk",
      "recipes.pasteLabel": "Klistra in recepttext",
      "recipes.import": "Importera",
      "recipes.importError": "Importen misslyckades.",
      "recipes.pasteExampleTitle": "Titel",
      "recipes.pasteExampleIng": "Ingredienser:",
      "recipes.pasteExampleSteps": "Gör så här:",

      // Recipe detail
      "recipeDetail.notFound": "Receptet kunde inte hittas.",
      "recipeDetail.noDescription": "Ingen beskrivning tillgänglig.",
      "recipeDetail.ingredients": "Ingredienser",
      "recipeDetail.steps": "Gör så här",
      "recipeDetail.minutes": "min",
      "recipeDetail.edit": "Redigera",
      "recipeDetail.delete": "Ta bort",
      "recipeDetail.back": "Tillbaka",
      "recipeDetail.confirmDelete": "Ta bort receptet? Detta går inte att ångra.",
      "recipeDetail.totalTime": "Total tid: {{minutes}} min",

      // Dialog (create/edit)
      "recipeDialog.title": "Titel",
      "recipeDialog.description": "Beskrivning",
      "recipeDialog.totalTime": "Total tid (minuter)",
      "recipeDialog.ingredients": "Ingredienser",
      "recipeDialog.addIngredient": "Lägg till ingrediens",
      "recipeDialog.name": "Namn",
      "recipeDialog.quantity": "Mängd",
      "recipeDialog.steps": "Steg",
      "recipeDialog.stepText": "Stegtext",
      "recipeDialog.addStep": "Lägg till steg",
      "recipeDialog.addTitle": "Lägg till recept",
      "recipeDialog.editTitle": "Redigera recept",
      "recipeDialog.image": "Bild",
      "recipeDialog.noImage": "Ingen bild vald",
      "recipeDialog.addImage": "Lägg till bild",
      "recipeDialog.changeImage": "Ändra bild",
      "recipeDialog.removeImage": "Ta bort bild",
      
      // Common
      "common.cancel": "Avbryt",
      "common.save": "Spara",

      // Settings
      "settings.title": "Inställningar",
      "settings.exportImport.title": "Exportera/Importera",
      "settings.exportImport.desc":
        "Exportera alla recept till en JSON-fil eller importera från en tidigare export. Bilder hanteras senare.",
      "settings.export.json": "Exportera JSON",
      "settings.import.json": "Importera JSON",
      "settings.export.success": "Export klar – filen laddades ned.",
      "settings.export.error": "Export misslyckades.",
      "settings.import.success": "Import klar – totalt: {{total}}, tillagda: {{added}}, uppdaterade: {{updated}}.",
      "settings.import.error": "Import misslyckades. Kontrollera filformatet.",
      "settings.exportZip": "Exportera (ZIP)",
      "settings.exporting": "Exporterar…",
      "settings.importZip": "Importera (ZIP)",
      "settings.importing": "Importerar…",
      "settings.importDone": "Import klar.",
      "settings.importError": "Import misslyckades.",
      "settings.storageLine": "{{used}} av {{quota}} använt • {{recipes}} recept • {{images}} bilder (≈ {{imageBytes}})",
      "settings.language": "Språk",
      "settings.theme": "Tema",
      "settings.theme.light": "Ljust",
      "settings.theme.dark": "Mörkt",
      "settings.theme.system": "Följ systeminställning",
      
      // Sync (Google Drive)
      "settings.sync.title": "Molnsynk (Google Drive)",
      "settings.sync.desc":
        "Koppla till Google Drive för att säkerhetskopiera och dela recept i din egen mapp.",
      "settings.sync.status": "Status",
      "settings.sync.connected": "Ansluten",
      "settings.sync.disconnected": "Inte ansluten",
      "settings.sync.connect": "Koppla konto",
      "settings.sync.disconnect": "Koppla från",
      "settings.sync.syncNow": "Synka nu",
      "settings.sync.auto": "Automatisk synk",
      "settings.sync.connectedSnack": "Drive anslutet.",
      "settings.sync.syncedSnack": "Synk klar – {{merged}} recept sammanlagda.",
      "settings.sync.error": "Synk misslyckades"
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "sv-SE",
  fallbackLng: "sv-SE",
  interpolation: { escapeValue: false },
});

export default i18n;