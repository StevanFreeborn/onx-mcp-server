import { describe, expect, test } from 'vitest';

import {
  convertFilterToString,
  Filter,
  getFieldNamesFromFilter,
  Rule,
  formatFormulaFieldRule,
} from '../src/filter';

import {
  Field,
  FieldStatus,
  FieldType,
  FilterOperators,
  FormulaField,
  FormulaOutputType,
} from 'onspring-api-sdk';

describe('formatRule', () => {
  test('it should throw an error if rule field is not found', () => {
    const rule: Rule = {
      type: 'rule',
      fieldName: 'status',
      operator: FilterOperators.Equal,
      value: 'active',
    };

    const fields = {};

    expect(() => convertFilterToString(rule, fields)).toThrow('Field with name status not found');
  });

  test('it should return a string without a value when value is null', () => {
    const rule: Rule = {
      type: 'rule',
      fieldName: 'status',
      operator: FilterOperators.Equal,
      value: null,
    };

    const fields = {
      1: new Field(1, 1, 'Status', FieldType.List, FieldStatus.Enabled, false, false),
    };

    const result = convertFilterToString(rule, fields);

    expect(result).toBe('1 eq');
  });

  test('it should format date rules correctly', () => {
    const testDate = new Date().toISOString();

    const rule: Rule = {
      type: 'rule',
      fieldName: 'status',
      operator: FilterOperators.Equal,
      value: testDate,
    };

    const fields = {
      1: new Field(1, 1, 'Status', FieldType.Date, FieldStatus.Enabled, false, false),
    };

    const result = convertFilterToString(rule, fields);

    expect(result).toBe(`${fields[1].id} eq datetime'${testDate}'`);
  });

  test('it should format a formula field rule correctly', () => {
    const rule: Rule = {
      type: 'rule',
      fieldName: 'status',
      operator: FilterOperators.Equal,
      value: 'active',
    };

    const fields = {
      1: new Field(1, 1, 'Status', FieldType.Formula, FieldStatus.Enabled, false, false),
    };

    const result = convertFilterToString(rule, fields);

    expect(result).toBe("1 eq 'active'");
  });
});

describe('formatFormulaFieldRule', () => {
  test('it should format a formula field rule with a numeric output correctly', () => {
    const rule: Rule = {
      type: 'rule',
      fieldName: 'number',
      operator: FilterOperators.Equal,
      value: '123',
    };

    const field = new FormulaField(
      1,
      1,
      'Number',
      FieldType.Formula,
      FieldStatus.Enabled,
      false,
      false,
      FormulaOutputType.Numeric,
      [],
    );

    const result = formatFormulaFieldRule(rule, field);

    expect(result).toBe('1 eq 123');
  });

  test('it should format a formula field rule with a date output correctly', () => {
    const rule: Rule = {
      type: 'rule',
      fieldName: 'date',
      operator: FilterOperators.Equal,
      value: new Date().toISOString(),
    };

    const field = new FormulaField(
      1,
      1,
      'Date',
      FieldType.Formula,
      FieldStatus.Enabled,
      false,
      false,
      FormulaOutputType.DateAndTime,
      [],
    );

    const result = formatFormulaFieldRule(rule, field);

    expect(result).toBe(`1 eq datetime'${rule.value}'`);
  });
});

describe('getFieldNamesFromFilter', () => {
  test('it should return an array of all field names in filter', () => {
    const filter: Filter = {
      type: 'and',
      rules: [
        {
          type: 'rule',
          fieldName: 'status',
          operator: FilterOperators.Equal,
          value: 'active',
        },
        {
          type: 'not',
          rule: {
            type: 'rule',
            fieldName: 'status',
            operator: FilterOperators.Equal,
            value: 'active',
          },
        },
        {
          type: 'rule',
          fieldName: 'created by',
          operator: FilterOperators.Equal,
          value: 'stevan',
        },
      ],
    };

    const result = getFieldNamesFromFilter(filter);

    expect(result).toEqual(new Set(['status', 'created by']));
  });
});

describe('convertFilterToString', () => {
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
      1: new Field(1, 1, 'Status', FieldType.List, FieldStatus.Enabled, false, false),
      2: new Field(2, 1, 'Age', FieldType.Number, FieldStatus.Enabled, false, false),
      3: new Field(3, 1, 'Created By', FieldType.Reference, FieldStatus.Enabled, false, false),
      4: new Field(4, 1, 'Role', FieldType.List, FieldStatus.Enabled, false, false),
    };

    return [
      {
        name: 'single rule',
        fields: fields,
        testFilter: {
          type: 'rule',
          fieldName: 'status',
          operator: FilterOperators.Equal,
          value: 'active',
        },
        expectedString: "1 eq 'active'",
      },
      {
        name: 'not group',
        fields: fields,
        testFilter: {
          type: 'not',
          rule: {
            type: 'rule',
            fieldName: 'status',
            operator: FilterOperators.Equal,
            value: 'active',
          },
        },
        expectedString: "not 1 eq 'active'",
      },
      {
        name: 'and group with one rule',
        fields: fields,
        testFilter: {
          type: 'and',
          rules: [
            {
              type: 'rule',
              fieldName: 'status',
              operator: FilterOperators.Equal,
              value: 'active',
            },
          ],
        },
        expectedString: "(1 eq 'active')",
      },
      {
        name: 'and group with two rules',
        fields: fields,
        testFilter: {
          type: 'and',
          rules: [
            {
              type: 'rule',
              fieldName: 'status',
              operator: FilterOperators.Equal,
              value: 'active',
            },
            {
              type: 'not',
              rule: {
                type: 'rule',
                fieldName: 'status',
                operator: FilterOperators.Equal,
                value: 'active',
              },
            },
          ],
        },
        expectedString: "(1 eq 'active' and not 1 eq 'active')",
      },
      {
        name: 'and group with three rules',
        fields: fields,
        testFilter: {
          type: 'and',
          rules: [
            {
              type: 'rule',
              fieldName: 'status',
              operator: FilterOperators.Equal,
              value: 'active',
            },
            {
              type: 'not',
              rule: {
                type: 'rule',
                fieldName: 'status',
                operator: FilterOperators.Equal,
                value: 'active',
              },
            },
            {
              type: 'rule',
              fieldName: 'created by',
              operator: FilterOperators.Equal,
              value: 'stevan',
            },
          ],
        },
        expectedString: "(1 eq 'active' and not 1 eq 'active' and 3 eq stevan)",
      },
      {
        name: 'or group with two rules',
        fields: fields,
        testFilter: {
          type: 'or',
          rules: [
            {
              type: 'rule',
              fieldName: 'age',
              operator: FilterOperators.GreaterThan,
              value: '18',
            },
            {
              type: 'not',
              rule: {
                type: 'rule',
                fieldName: 'role',
                operator: FilterOperators.Equal,
                value: 'admin',
              },
            },
          ],
        },
        expectedString: "(2 gt 18 or not 4 eq 'admin')",
      },
    ];
  }
});
