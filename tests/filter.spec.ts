import { describe, expect, test } from "vitest";
import { convertFilterToString, Filter, getFieldNamesFromFilter } from "../src/filter";
import { Field, FieldStatus, FieldType, FilterOperators } from "onspring-api-sdk";


describe("getFieldNamesFromFilter", () => {
  test("it should return an array of all field names in filter", () => {
    const filter: Filter = {
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
    };

    const result = getFieldNamesFromFilter(filter);

    expect(result).toEqual(new Set(["status", "created by"]));
  });
});


describe("convertFilterToString", () => {
  for (const testCase of testCases()) {
    test(`it should convert given filter to expected filter string: ${testCase.name}`, () => {
      const result = convertFilterToString(testCase.testFilter, testCase.fields);
    
      expect(result).toBe(testCase.expectedString);
    });
  }

  type TestCase = {
    name: string;
    fields: { [index: number]: Field };
    testFilter: Filter;
    expectedString: string;
  };

  function testCases(): TestCase[] {
    const fields: { [index: number]: Field } = {
      1: new Field(
        1,
        1,
        "Status",
        FieldType.List,
        FieldStatus.Enabled,
        false,
        false,
      ),
      2: new Field(
        2,
        1,
        "Age",
        FieldType.Number,
        FieldStatus.Enabled,
        false,
        false,
      ),
      3: new Field(
        3,
        1,
        "Created By",
        FieldType.Reference,
        FieldStatus.Enabled,
        false,
        false,
      ),
      4: new Field(
        4,
        1,
        "Role",
        FieldType.List,
        FieldStatus.Enabled,
        false,
        false,
      ),
    };

    return [
      {
        name: "single rule",
        fields: fields,
        testFilter: {
          type: "rule",
          fieldName: "status",
          operator: FilterOperators.Equal,
          value: "active",
        },
        expectedString: "1 eq 'active'",
      },
      {
        name: "not group",
        fields: fields,
        testFilter: {
          type: "not",
          rule: {
            type: "rule",
            fieldName: "status",
            operator: FilterOperators.Equal,
            value: "active",
          },
        },
        expectedString: "not 1 eq 'active'",
      },
      {
        name: "and group with one rule",
        fields: fields,
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
        expectedString: "(1 eq 'active')",
      },
      {
        name: "and group with two rules",
        fields: fields,
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
        expectedString: "(1 eq 'active' and not 1 eq 'active')",
      },
      {
        name: "and group with three rules",
        fields: fields,
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
          "(1 eq 'active' and not 1 eq 'active' and 3 eq 'stevan')",
      },
      {
        name: "or group with two rules",
        fields: fields,
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
        expectedString: "(2 gt '18' or not 4 eq 'admin')",
      },
    ];
  }
});
