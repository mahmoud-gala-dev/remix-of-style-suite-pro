import { describe, it, expect } from "vitest";
import { parseCsv, parseCsvWithHeader } from "@/lib/csv-parse";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("supports quoted fields with commas", () => {
    expect(parseCsv('name,note\n"Doe, John","hi"\n')).toEqual([
      ["name", "note"],
      ["Doe, John", "hi"],
    ]);
  });

  it("supports escaped double quotes inside quoted fields", () => {
    expect(parseCsv('a\n"she said ""hi"""\n')).toEqual([
      ["a"],
      ['she said "hi"'],
    ]);
  });

  it("supports newlines inside quoted fields", () => {
    expect(parseCsv('a,b\n"li\nne",2\n')).toEqual([
      ["a", "b"],
      ["li\nne", "2"],
    ]);
  });

  it("captures trailing row without newline", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("filters out fully-blank rows", () => {
    expect(parseCsv("a,b\n\n1,2\n   ,   \n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("returns empty for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("parseCsvWithHeader", () => {
  it("maps rows by lowercased trimmed headers", () => {
    expect(parseCsvWithHeader(" Name , Email \nAlice,a@x.com\n")).toEqual([
      { name: "Alice", email: "a@x.com" },
    ]);
  });

  it("trims field values and fills missing cells with empty string", () => {
    expect(parseCsvWithHeader("a,b,c\n 1 , 2 \n")).toEqual([
      { a: "1", b: "2", c: "" },
    ]);
  });

  it("returns [] when only a header row is present", () => {
    expect(parseCsvWithHeader("a,b\n")).toEqual([]);
  });

  it("returns [] for empty input", () => {
    expect(parseCsvWithHeader("")).toEqual([]);
  });
});