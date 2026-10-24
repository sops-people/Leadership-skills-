// Converted from Sops's tests/test_learning.py (RankingTests).
import { describe, expect, it } from "vitest";
import { MAX_PER_SOURCE, rank } from "./ranking";
import type { ContentFormat, ContentItem } from "./types";

const SKILL = { name: "Negotiation" };

function item(title: string, url: string, source = "Crossref", format: ContentFormat = "article", year = 2022, snippet = ""): ContentItem {
  return { itemId: url.slice(-6), title, url, source, format, year, lengthMinutes: 20, snippet };
}

describe("rank", () => {
  it("drops off-topic and irrelevant items", () => {
    const items = [
      item("Negotiation skills for business leaders", "https://a.org/1"),
      item("Negotiation training for nursing students", "https://a.org/2"),
      item("A history of bridges", "https://a.org/3"),
    ];
    expect(rank(items, SKILL).map((i) => i.title)).toEqual(["Negotiation skills for business leaders"]);
  });

  it("removes duplicates by url and title", () => {
    const items = [
      item("Negotiation for Leaders", "https://a.org/1"),
      item("Negotiation for leaders!", "https://a.org/2"),
      item("Other negotiation leadership", "https://a.org/1"),
    ];
    expect(rank(items, SKILL)).toHaveLength(1);
  });

  it("caps items per source", () => {
    const items = [0, 1, 2, 3, 4].map((n) => item(`Negotiation leadership ${n}`, `https://a.org/${n}`));
    items.push(item("Negotiation", "https://w.org/x", "Wikipedia", "primer"));
    const ranked = rank(items, SKILL);
    expect(ranked.filter((i) => i.source === "Crossref")).toHaveLength(MAX_PER_SOURCE);
    expect(ranked.map((i) => i.source)).toContain("Wikipedia");
  });

  it("useful votes raise rank", () => {
    const a = item("Negotiation leadership A", "https://a.org/aaaaaa");
    const b = item("Negotiation leadership B", "https://b.org/bbbbbb", "Wikipedia");
    const votes = { [b.itemId]: { useful: 3, notUseful: 0 }, [a.itemId]: { useful: 0, notUseful: 2 } };
    expect(rank([a, b], SKILL, votes)[0].title).toBe(b.title);
  });
});
