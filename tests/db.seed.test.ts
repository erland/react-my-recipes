import { db } from "../src/db/schema";

beforeEach(async () => {
  await db.clearAll();
});

test("seeds demo data", async () => {
  await db.seedDemoData();
  const recipes = await db.recipes.toArray();
  expect(recipes.length).toBe(2);
  expect(recipes.some(r => r.title === "Pannkakor")).toBe(true);
});