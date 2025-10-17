import { db } from "../src/db/schema";

test("creates and reads a recipe", async () => {
  const r = { id: "r1", title: "Pannkakor", createdAt: 0, updatedAt: 0 };
  await db.recipes.add(r);
  const fetched = await db.recipes.get("r1");
  expect(fetched?.title).toBe("Pannkakor");
});