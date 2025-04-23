import {
  Field,
  FieldType,
  FilterOperators,
  FormulaField,
  FormulaOutputType,
} from "onspring-api-sdk";
import { z } from "zod";

export const ruleSchema = z.object({
  type: z.literal("rule"),
  fieldName: z.string(),
  operator: z.nativeEnum(FilterOperators),
  value: z.string().nullable(),
});

type Rule = z.infer<typeof ruleSchema>;

type AndGroup = {
  type: "and";
  rules: Filter[];
};

type OrGroup = {
  type: "or";
  rules: Filter[];
};

type NotGroup = {
  type: "not";
  rule: Filter;
};

const andGroupSchema: z.ZodType<AndGroup> = z.object({
  type: z.literal("and"),
  rules: z.array(z.lazy(() => filterSchema)),
});

const orGroupSchema: z.ZodType<OrGroup> = z.object({
  type: z.literal("or"),
  rules: z.array(z.lazy(() => filterSchema)),
});

const notGroupSchema: z.ZodType<NotGroup> = z.object({
  type: z.literal("not"),
  rule: z.lazy(() => filterSchema),
});

export const filterSchema = z.union([
  ruleSchema,
  andGroupSchema,
  orGroupSchema,
  notGroupSchema,
]);

type Test = Rule | AndGroup | OrGroup | NotGroup;

export const test: z.ZodType<Test> = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("rule"),
    fieldName: z.string(),
    operator: z.nativeEnum(FilterOperators),
    value: z.string().nullable(),
  }),
  z.object({
    type: z.literal("and"),
    rules: z.array(z.lazy(() => test)),
  }),
  z.object({
    type: z.literal("or"),
    rules: z.array(z.lazy(() => test)),
  }),
  z.object({
    type: z.literal("not"),
    rule: z.lazy(() => test),
  }),
]);

export type Filter = z.infer<typeof filterSchema>;

export function convertFilterToString(
  filter: Filter,
  fields: { [index: number]: Field },
) {
  type StackItem = string | Filter;

  const stack: StackItem[] = [filter];
  const output: string[] = [];

  while (stack.length > 0) {
    const current = stack.pop();

    if (current === undefined) {
      break;
    }

    if (typeof current === "string") {
      output.push(current);
      continue;
    }

    switch (current.type) {
      case "rule":
        output.push(formatRule(current, fields));
        break;
      case "not":
        stack.push(current.rule);
        stack.push(`${current.type} `);
        break;
      case "and":
      case "or":
        stack.push(")");

        const rules = [...current.rules].reverse();

        for (const [index, rule] of rules.entries()) {
          if (index !== 0) {
            stack.push(` ${current.type} `);
          }

          stack.push(rule);
        }

        stack.push("(");
        break;
      default:
        throw new Error("Unknown filter type");
    }
  }

  return output.join("");
}

export function getFieldNamesFromFilter(filter: Filter) {
  const names: Set<string> = new Set();

  const stack: Filter[] = [filter];

  while (stack.length > 0) {
    const current = stack.pop();

    if (current === undefined) {
      break;
    }

    if (current.type === "rule") {
      names.add(current.fieldName);
      continue;
    }

    if (current.type === "not") {
      stack.push(current.rule);
      continue;
    }

    if (current.type === "and" || current.type === "or") {
      stack.push(...current.rules);
      continue;
    }
  }

  return names;
}

function formatRule(rule: Rule, fields: { [index: number]: Field }) {
  let targetField: Field | null = null;

  for (const field of Object.values(fields)) {
    if (field.name.toLowerCase() === rule.fieldName.toLowerCase()) {
      targetField = field;
      break;
    }
  }

  if (targetField === null) {
    throw new Error(`Field with name ${rule.fieldName} not found`);
  }

  if (rule.value === null) {
    return `${targetField.id} ${rule.operator}`;
  }

  switch (targetField.type) {
    case FieldType.Date:
      return formatDateRule(rule, targetField);
    case FieldType.Number:
    case FieldType.AutoNumber:
    case FieldType.Reference:
      return formatNumberRule(rule, targetField);
    case FieldType.Formula:
      return formatFormulaFieldRule(rule, targetField);
    default:
      return formatTextRule(rule, targetField);
  }
}

function formatFormulaFieldRule(rule: Rule, targetField: Field): string {
  const formulaField = targetField as FormulaField;

  switch (formulaField.outputType) {
    case FormulaOutputType.DateAndTime:
      return formatDateRule(rule, targetField);
    case FormulaOutputType.Numeric:
      return formatNumberRule(rule, targetField);
    default:
      return formatTextRule(rule, targetField);
  }
}

function formatDateRule(rule: Rule, targetField: Field): string {
  return `${targetField.id} ${rule.operator} datetime'${rule.value}'`;
}

function formatNumberRule(rule: Rule, targetField: Field): string {
  return `${targetField.id} ${rule.operator} ${rule.value}`;
}

function formatTextRule(rule: Rule, targetField: Field): string {
  return `${targetField.id} ${rule.operator} '${rule.value}'`;
}
