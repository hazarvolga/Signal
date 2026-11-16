/**
 * Unit tests for FilterRegistry
 */

import { describe, it, expect, beforeEach } from "vitest";
import { FilterRegistry } from "../../../src/services/template/FilterRegistry";
import { FilterFunction, FilterScope } from "../../../src/services/template/types";

describe("FilterRegistry", () => {
  let registry: FilterRegistry;

  beforeEach(() => {
    registry = new FilterRegistry();
  });

  describe("Built-in String Filters", () => {
    it("should convert string to uppercase with upcase filter", () => {
      const filter = registry.get("upcase");
      expect(filter).toBeDefined();
      expect(filter!("hello")).toBe("HELLO");
      expect(filter!("Hello World")).toBe("HELLO WORLD");
    });

    it("should convert string to lowercase with downcase filter", () => {
      const filter = registry.get("downcase");
      expect(filter).toBeDefined();
      expect(filter!("HELLO")).toBe("hello");
      expect(filter!("Hello World")).toBe("hello world");
    });

    it("should capitalize first letter with capitalize filter", () => {
      const filter = registry.get("capitalize");
      expect(filter).toBeDefined();
      expect(filter!("hello")).toBe("Hello");
      expect(filter!("hello world")).toBe("Hello world");
    });

    it("should truncate string with truncate filter", () => {
      const filter = registry.get("truncate");
      expect(filter).toBeDefined();
      expect(filter!("Hello World", 5)).toBe("Hello...");
      expect(filter!("Hi", 5)).toBe("Hi");
      expect(filter!("Hello", 5)).toBe("Hello");
    });

    it("should remove HTML tags with strip_html filter", () => {
      const filter = registry.get("strip_html");
      expect(filter).toBeDefined();
      expect(filter!("<p>Hello</p>")).toBe("Hello");
      expect(filter!("<div><span>Test</span></div>")).toBe("Test");
      expect(filter!("No tags")).toBe("No tags");
    });

    it("should URL encode string with url_encode filter", () => {
      const filter = registry.get("url_encode");
      expect(filter).toBeDefined();
      expect(filter!("hello world")).toBe("hello%20world");
      expect(filter!("test@example.com")).toBe("test%40example.com");
    });
  });

  describe("Built-in Number Filters", () => {
    it("should format number as currency with money filter", () => {
      const filter = registry.get("money");
      expect(filter).toBeDefined();
      expect(filter!(42.5)).toBe("$42.50");
      expect(filter!(100)).toBe("$100.00");
    });

    it("should format number with different currency", () => {
      const filter = registry.get("money");
      expect(filter).toBeDefined();
      expect(filter!(42.5, "EUR")).toBe("€42.50");
      expect(filter!(42.5, "GBP")).toBe("£42.50");
    });

    it("should add numbers with plus filter", () => {
      const filter = registry.get("plus");
      expect(filter).toBeDefined();
      expect(filter!(5, 3)).toBe(8);
      expect(filter!(10, -5)).toBe(5);
    });

    it("should subtract numbers with minus filter", () => {
      const filter = registry.get("minus");
      expect(filter).toBeDefined();
      expect(filter!(5, 3)).toBe(2);
      expect(filter!(10, 15)).toBe(-5);
    });

    it("should multiply numbers with times filter", () => {
      const filter = registry.get("times");
      expect(filter).toBeDefined();
      expect(filter!(5, 3)).toBe(15);
      expect(filter!(10, 0)).toBe(0);
    });

    it("should divide numbers with divided_by filter", () => {
      const filter = registry.get("divided_by");
      expect(filter).toBeDefined();
      expect(filter!(15, 3)).toBe(5);
      expect(filter!(10, 2)).toBe(5);
    });

    it("should handle division by zero", () => {
      const filter = registry.get("divided_by");
      expect(filter).toBeDefined();
      expect(filter!(10, 0)).toBe(0);
    });

    it("should get remainder with modulo filter", () => {
      const filter = registry.get("modulo");
      expect(filter).toBeDefined();
      expect(filter!(7, 3)).toBe(1);
      expect(filter!(10, 5)).toBe(0);
    });
  });

  describe("Built-in Date Filter", () => {
    it("should format date with date filter", () => {
      const filter = registry.get("date");
      expect(filter).toBeDefined();

      const testDate = new Date("2024-01-15T12:00:00Z");
      expect(filter!(testDate, "yyyy-MM-dd")).toBe("2024-01-15");
      expect(filter!(testDate, "MMMM dd, yyyy")).toBe("January 15, 2024");
    });

    it("should handle date strings", () => {
      const filter = registry.get("date");
      expect(filter).toBeDefined();
      expect(filter!("2024-01-15", "yyyy-MM-dd")).toBe("2024-01-15");
    });

    it("should return empty string for invalid dates", () => {
      const filter = registry.get("date");
      expect(filter).toBeDefined();
      expect(filter!("invalid", "yyyy-MM-dd")).toBe("");
    });
  });

  describe("Built-in Utility Filters", () => {
    it("should provide fallback value with default filter", () => {
      const filter = registry.get("default");
      expect(filter).toBeDefined();
      expect(filter!(undefined, "N/A")).toBe("N/A");
      expect(filter!(null, "N/A")).toBe("N/A");
      expect(filter!("value", "N/A")).toBe("value");
      expect(filter!(0, "N/A")).toBe(0);
      expect(filter!("", "N/A")).toBe("");
    });
  });

  describe("Custom Filter Registration", () => {
    it("should register and retrieve custom global filter", () => {
      const customFilter: FilterFunction = (value: any) => `custom-${value}`;
      const scope: FilterScope = { type: "global" };

      registry.register("custom", customFilter, scope);

      const retrieved = registry.get("custom");
      expect(retrieved).toBeDefined();
      expect(retrieved!("test")).toBe("custom-test");
    });

    it("should register and retrieve organization-scoped filter", () => {
      const orgFilter: FilterFunction = (value: any) => `org-${value}`;
      const scope: FilterScope = { type: "organization", organizationId: "org-123" };

      registry.register("org_filter", orgFilter, scope);

      const retrieved = registry.get("org_filter", "org-123");
      expect(retrieved).toBeDefined();
      expect(retrieved!("test")).toBe("org-test");
    });

    it("should not retrieve organization filter without organizationId", () => {
      const orgFilter: FilterFunction = (value: any) => `org-${value}`;
      const scope: FilterScope = { type: "organization", organizationId: "org-123" };

      registry.register("org_filter", orgFilter, scope);

      const retrieved = registry.get("org_filter");
      expect(retrieved).toBeUndefined();
    });

    it("should prioritize organization filter over global filter", () => {
      const globalFilter: FilterFunction = (value: any) => `global-${value}`;
      const orgFilter: FilterFunction = (value: any) => `org-${value}`;

      registry.register("test_filter", globalFilter, { type: "global" });
      registry.register("test_filter", orgFilter, {
        type: "organization",
        organizationId: "org-123",
      });

      const globalRetrieved = registry.get("test_filter");
      expect(globalRetrieved!("test")).toBe("global-test");

      const orgRetrieved = registry.get("test_filter", "org-123");
      expect(orgRetrieved!("test")).toBe("org-test");
    });

    it("should register a custom filter from a declarative definition", () => {
      const definition = JSON.stringify({ operation: "uppercase" });
      const scope: FilterScope = { type: "global" };

      registry.registerCustomFilter("my_upper", definition, scope);

      const retrieved = registry.get("my_upper");
      expect(retrieved).toBeDefined();
      expect(retrieved!("hello")).toBe("HELLO");
    });

    it("should register custom filter with description and examples", () => {
      const definition = JSON.stringify({ operation: "times" });
      const scope: FilterScope = { type: "global" };
      const description = "Multiply a number by a multiplier";
      const examples = ["{{ 5 | multiply: 3 }} => 15"];

      registry.registerCustomFilter("multiply", definition, scope, description, examples);

      const filters = registry.list();
      const multiplyFilter = filters.find((f) => f.name === "multiply");

      expect(multiplyFilter).toBeDefined();
      expect(multiplyFilter!.description).toBe(description);
      expect(multiplyFilter!.examples).toEqual(examples);
    });

    it("should throw error for invalid custom filter code", () => {
      const code = "not a function";
      const scope: FilterScope = { type: "global" };

      expect(() => {
        registry.registerCustomFilter("invalid", code, scope);
      }).toThrow();
    });

    it("should throw error for custom filter with security violations", () => {
      const code = '(value) => require("fs").readFileSync(value)';
      const scope: FilterScope = { type: "global" };

      expect(() => {
        registry.registerCustomFilter("malicious", code, scope);
      }).toThrow(/valid JSON|executable JavaScript/);
    });

    it("should register organization-scoped custom filter", () => {
      const definition = JSON.stringify({ operation: "prefix", args: ["org-"] });
      const scope: FilterScope = { type: "organization", organizationId: "org-456" };

      registry.registerCustomFilter("org_custom", definition, scope);

      const retrieved = registry.get("org_custom", "org-456");
      expect(retrieved).toBeDefined();
      expect(retrieved!("test")).toBe("org-test");
    });
  });

  describe("Filter Listing", () => {
    it("should list all global filters", () => {
      const filters = registry.list();
      expect(filters.length).toBeGreaterThan(0);

      const filterNames = filters.map((f) => f.name);
      expect(filterNames).toContain("upcase");
      expect(filterNames).toContain("downcase");
      expect(filterNames).toContain("money");
      expect(filterNames).toContain("date");
    });

    it("should include organization filters when organizationId provided", () => {
      const orgFilter: FilterFunction = (value: any) => `org-${value}`;
      registry.register("org_custom", orgFilter, {
        type: "organization",
        organizationId: "org-123",
      });

      const filters = registry.list("org-123");
      const filterNames = filters.map((f) => f.name);

      expect(filterNames).toContain("org_custom");
      expect(filterNames).toContain("upcase"); // Global filters still included
    });

    it("should not include other organization filters", () => {
      const org1Filter: FilterFunction = (value: any) => `org1-${value}`;
      const org2Filter: FilterFunction = (value: any) => `org2-${value}`;

      registry.register("org1_filter", org1Filter, {
        type: "organization",
        organizationId: "org-1",
      });
      registry.register("org2_filter", org2Filter, {
        type: "organization",
        organizationId: "org-2",
      });

      const org1Filters = registry.list("org-1");
      const org1Names = org1Filters.map((f) => f.name);

      expect(org1Names).toContain("org1_filter");
      expect(org1Names).not.toContain("org2_filter");
    });

    it("should include filter metadata", () => {
      const filters = registry.list();
      const upcaseFilter = filters.find((f) => f.name === "upcase");

      expect(upcaseFilter).toBeDefined();
      expect(upcaseFilter!.description).toBeDefined();
      expect(upcaseFilter!.signature).toBeDefined();
      expect(upcaseFilter!.examples).toBeDefined();
      expect(upcaseFilter!.examples.length).toBeGreaterThan(0);
    });
  });
});
