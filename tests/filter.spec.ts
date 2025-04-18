import { describe, expect, test } from "vitest";
import { convertFilterToString, Filter } from "../src/filter";
import { FilterOperators } from "onspring-api-sdk";

describe("convertFilterToString", () => {
  test("it should convert a filter that consists of a single rule to a string", () => {
    const filter: Filter = {
      type: "rule",
      fieldName: "status",
      operator: FilterOperators.Equal,
      value: "active",
    };

    const result = convertFilterToString(filter);

    expect(result).toBe("status eq 'active'");
  });

  test("it should convert a filter that is a single not group", () => {
    const filter: Filter = {
      type: "not",
      rule: {
        type: 'rule',
        fieldName: "status",
        operator: FilterOperators.Equal,
        value: "active",
      },
    };

    const result = convertFilterToString(filter);

    expect(result).toBe("NOT status eq 'active'");
  });
});
