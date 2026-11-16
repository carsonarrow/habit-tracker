import { describe, expect, it } from "vitest";
import { formatDay } from "./day";

describe("formatDay", () => {
  it("shows weekday, day and short month for a Day in the current year", () => {
    expect(formatDay("2026-11-16", "2026-11-16")).toBe("Mon, 16 Nov");
    expect(formatDay("2026-01-01", "2026-11-16")).toBe("Thu, 1 Jan");
  });

  it("adds the year when the Day is not in today's year", () => {
    expect(formatDay("2025-12-14", "2026-11-16")).toBe("Sun, 14 Dec 2025");
  });
});
