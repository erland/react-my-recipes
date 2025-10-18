import { describe, it, expect } from "vitest";
import { importRecipeFromPaste } from "@/features/import/pasteParser";

describe("importRecipeFromPaste", () => {
  it("parses Swedish headered text", () => {
    const text = `
Chokladbollar
Ingredienser
- Havregryn – 3 dl
- Socker – 1 dl
Gör så här
1. Blanda ihop.
2. Rulla bollar.
`;
    const r = importRecipeFromPaste(text);
    expect(r.title).toBe("Chokladbollar");
    expect(r.ingredients?.length).toBe(2);
    expect(r.ingredients?.[0].name).toBe("Havregryn");
    expect(r.ingredients?.[0].quantity).toBe("3 dl");
    expect(r.steps?.length).toBe(2);
    expect(r.steps?.[0].text).toMatch(/Blanda/);
  });

  it("parses headerless simple block", () => {
    const text = `
Pannkakor

- Mjölk – 6 dl
- Ägg – 3 st

1. Vispa ihop.
2. Stek tunna pannkakor.
`;
    const r = importRecipeFromPaste(text);
    expect(r.title).toBe("Pannkakor");
    expect(r.ingredients?.length).toBe(2);
    expect(r.ingredients?.[0].name).toBe("Mjölk");
    expect(r.steps?.[1].text).toContain("Stek");
  });

  it("uses fallback title when missing", () => {
    const text = `
Ingredienser
- Smör – 100 g
Gör så här
- Smält smöret
`;
    const r = importRecipeFromPaste(text);
    expect(r.title).toBe("(Namnlöst recept)");
    expect(r.ingredients?.[0].name).toBe("Smör");
  });

  it("handles minimal paste with only steps", () => {
    const text = `
1. Hacka lök.
2. Stek.
`;
    const r = importRecipeFromPaste(text);
    expect(r.title).toBe("(Namnlöst recept)");
    expect(r.steps?.length).toBe(2);
  });
});