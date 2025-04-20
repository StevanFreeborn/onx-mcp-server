import { describe, expect, test } from "vitest";
import { convertFilterToString, Filter } from "../src/filter";
import { FilterOperators } from "onspring-api-sdk";

describe("convertFilterToString", () => {
  for (const testCase of testCases()) {
    test(`it should convert given filter to expected filter string: ${testCase.name}`, () => {
      const result = convertFilterToString(testCase.testFilter);

      expect(result).toBe(testCase.expectedString);
    });
  }

  type TestCase = {
    name: string;
    testFilter: Filter;
    expectedString: string;
  };

  function testCases(): TestCase[] {
    return [
      {
        name: "single rule",
        testFilter: {
          type: "rule",
          fieldName: "status",
          operator: FilterOperators.Equal,
          value: "active",
        },
        expectedString: "status eq 'active'",
      },
      {
        name: "not group",
        testFilter: {
          type: "not",
          rule: {
            type: "rule",
            fieldName: "status",
            operator: FilterOperators.Equal,
            value: "active",
          },
        },
        expectedString: "not status eq 'active'",
      },
      {
        name: "and group with one rule",
        testFilter: {
          type: "and",
          rules: [
            {
              type: "rule",
              fieldName: "status",
              operator: FilterOperators.Equal,
              value: "active",
            },
          ],
        },
        expectedString: "(status eq 'active')",
      },
      {
        name: "and group with two rules",
        testFilter: {
          type: "and",
          rules: [
            {
              type: "rule",
              fieldName: "status",
              operator: FilterOperators.Equal,
              value: "active",
            },
            {
              type: "not",
              rule: {
                type: "rule",
                fieldName: "status",
                operator: FilterOperators.Equal,
                value: "active",
              },
            },
          ],
        },
        expectedString: "(status eq 'active' and not status eq 'active')",
      },
      {
        name: "and group with three rules",
        testFilter: {
          type: "and",
          rules: [
            {
              type: "rule",
              fieldName: "status",
              operator: FilterOperators.Equal,
              value: "active",
            },
            {
              type: "not",
              rule: {
                type: "rule",
                fieldName: "status",
                operator: FilterOperators.Equal,
                value: "active",
              },
            },
            {
              type: "rule",
              fieldName: "created by",
              operator: FilterOperators.Equal,
              value: "stevan",
            },
          ],
        },
        expectedString:
          "(status eq 'active' and not status eq 'active' and created by eq 'stevan')",
      },
      {
        name: "or group with two rules",
        testFilter: {
          type: "or",
          rules: [
            {
              type: "rule",
              fieldName: "age",
              operator: FilterOperators.GreaterThan,
              value: "18",
            },
            {
              type: "not",
              rule: {
                type: "rule",
                fieldName: "role",
                operator: FilterOperators.Equal,
                value: "admin",
              },
            },
          ],
        },
        expectedString: "(age gt '18' or not role eq 'admin')",
      },
    ];
  }
});
