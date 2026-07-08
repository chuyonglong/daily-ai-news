import { describe, expect, it } from "vitest";
import { getInitialHistoryBriefId, parseBriefHistoryQuery, toHistoryBriefCards } from "@/lib/brief/history";

const briefs = [
  {
    id: "brief-1",
    title: "July 1 AI Brief",
    date: new Date("2026-07-01T00:00:00.000Z"),
    status: "DRAFT",
    categoryScope: "cat-ai",
    markdown: "# July 1 AI Brief\n\n## Models\n\n- Source: https://example.com/model",
    sections: [
      {
        id: "section-1",
        name: "Models",
        items: [{ id: "item-1" }, { id: "item-2" }],
      },
    ],
  },
  {
    id: "brief-2",
    title: "June 30 Finance Brief",
    date: new Date("2026-06-30T00:00:00.000Z"),
    status: "READY",
    categoryScope: "all",
    markdown: "# June 30 Finance Brief",
    sections: [
      {
        id: "section-2",
        name: "Finance",
        items: [{ id: "item-3" }],
      },
    ],
  },
];

describe("history brief view models", () => {
  it("builds cards with item counts, copy markdown, category labels, and rich preview html", () => {
    const cards = toHistoryBriefCards(briefs, new Map([["cat-ai", "AI"]]));

    expect(cards[0]).toMatchObject({
      id: "brief-1",
      title: "July 1 AI Brief",
      status: "DRAFT",
      markdown: briefs[0].markdown,
      categoryScope: "cat-ai",
      categoryLabel: "AI",
      itemCount: 2,
      sections: [{ id: "section-1", name: "Models", itemCount: 2 }],
    });
    expect(cards[0].previewHtml).toContain("<h1>July 1 AI Brief</h1>");
    expect(cards[0].previewHtml).toContain('<a href="https://example.com/model">');
    expect(cards[1]).toMatchObject({
      categoryScope: "all",
      categoryLabel: "全部类别",
    });
  });

  it("uses the first card as the default selection", () => {
    expect(getInitialHistoryBriefId(toHistoryBriefCards(briefs))).toBe("brief-1");
    expect(getInitialHistoryBriefId([])).toBeNull();
  });
});

describe("history brief query helpers", () => {
  it("cleans keyword and category filters", () => {
    expect(parseBriefHistoryQuery({ q: "  model  ", category: " cat-ai " })).toMatchObject({
      q: "model",
      category: "cat-ai",
    });
    expect(parseBriefHistoryQuery({ q: " ", category: " " })).toMatchObject({
      q: undefined,
      category: undefined,
    });
  });

  it("ignores invalid dates", () => {
    expect(parseBriefHistoryQuery({ from: "not-a-date", to: "2026-02-31" })).toMatchObject({
      from: undefined,
      to: undefined,
      fromDate: undefined,
      toExclusiveDate: undefined,
    });
  });

  it("turns date inputs into inclusive start and exclusive end boundaries", () => {
    const query = parseBriefHistoryQuery({ from: "2026-07-01", to: "2026-07-31" });

    expect(query.fromDate?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(query.toExclusiveDate?.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("distinguishes all-category briefs from no category filter", () => {
    expect(parseBriefHistoryQuery({ category: "" }).category).toBeUndefined();
    expect(parseBriefHistoryQuery({ category: "all" }).category).toBe("all");
    expect(parseBriefHistoryQuery({ category: "cat-finance" }).category).toBe("cat-finance");
  });
});
