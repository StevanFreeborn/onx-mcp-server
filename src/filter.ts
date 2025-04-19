import { FilterOperators } from "onspring-api-sdk";
import { z } from "zod";

// status equals "active"
const ruleSchema = z.object({
  type: z.literal("rule"),
  fieldName: z.string(),
  operator: z.nativeEnum(FilterOperators),
  value: z.string().nullable(),
});

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

// age greater_than 18 AND role equals "admin"
const andGroupSchema: z.ZodType<AndGroup> = z.object({
  type: z.literal("and"),
  rules: z.array(z.lazy(() => filterSchema)),
});

// age greater_than 18 OR role equals "admin"
const orGroupSchema: z.ZodType<OrGroup> = z.object({
  type: z.literal("or"),
  rules: z.array(z.lazy(() => filterSchema)),
});

// NOT (role equals "admin")
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

export type Filter = z.infer<typeof filterSchema>;

export function convertFilterToString(filter: Filter) {
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
    
    // TODO: Need to format the rules
    // based on the field type that
    // is being queried against
    // TODO: We need to replace the field
    // name with field id
    // TODO: We need to replace any list
    // value names with their guid
    // equivalents
    switch (current.type) {
      case "rule":
        output.push(
          `${current.fieldName} ${current.operator} '${current.value}'`,
        );
        break;
      case "not":
        stack.push(current.rule);
        stack.push(`${current.type} `);
        break;
      case "and":
      case "or":
        const rules = [...current.rules].reverse();
        for (const [index, rule] of rules.entries()) {
          if (index !== 0) {
            stack.push(` ${current.type} `);
          }

          stack.push(rule);
        }
        break;
      default:
        throw new Error("Unknown filter type");
    }
  }

  return output.join("");
}
