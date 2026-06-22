import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv";
import { parseCsv, parseCsvWithHeader } from "@/lib/csv-parse";

describe("toCsv", () => {
  it("emits header + rows", () => {
    const csv = toCsv(
      [{ name: "Sara", age: 30 }, { name: "Lina", age: 22 }],
      [{ key: "name", label: "Name" }, { key: "age", label: "Age" }],
    );
    expect(csv).toBe("Name,Age\nSara,30\nLina,22");
  });
  it("escapes commas, quotes and newlines", () => {
    const csv = toCsv(
      [{ x: 'a,b' }, { x: 'he said "hi"' }, { x: "line1\nline2" }],
      [{ key: "x", label: "X" }],
    );
    expect(csv).toBe('X\n"a,b"\n"he said ""hi"""\n"line1\nline2"');
  });
  it("renders null/undefined as empty", () => {
    const csv = toCsv(
      [{ a: null as unknown, b: undefined as unknown }],
      [{ key: "a", label: "A" }, { key: "b", label: "B" }],
    );
    expect(csv).toBe("A,B\n,");
  });
});

describe("parseCsv", () => {
  it("parses simple rows", () => {
    expect(parseCsv("a,b\n1,2\n3,4")).toEqual([["a","b"],["1","2"],["3","4"]]);
  });
  it("handles quoted fields with commas + escaped quotes", () => {
    expect(parseCsv('name,note\n"Smith, J","says ""hi"""')).toEqual([
      ["name", "note"],
      ["Smith, J", 'says "hi"'],
    ]);
  });
  it("strips CR and empty rows", () => {
    expect(parseCsv("a,b\r\n1,2\r\n\r\n")).toEqual([["a","b"],["1","2"]]);
  });
});

describe("parseCsvWithHeader", () => {
  it("returns objects keyed by lower-cased headers", () => {
    const out = parseCsvWithHeader("Name,Phone\nSara,555\nLina,666");
    expect(out).toEqual([{ name: "Sara", phone: "555" }, { name: "Lina", phone: "666" }]);
  });
  it("returns [] when only a header is present", () => {
    expect(parseCsvWithHeader("name,phone")).toEqual([]);
  });
});