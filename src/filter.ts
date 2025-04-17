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
}

type OrGroup = {
  type: "or";
  rules: Filter[];
}

type NotGroup = {
  type: "not";
  rules: Filter[];
}

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
  rules: z.array(z.lazy(() => filterSchema)),
});

export const filterSchema = z.union([ruleSchema, andGroupSchema, orGroupSchema, notGroupSchema]);

export type Filter = z.infer<typeof filterSchema>;

// (status equals "active" AND (age greater_than 18 OR NOT (role equals "admin")))
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
          rules: [
            {
              type: "rule",
              fieldName: "role",
              operator: FilterOperators.Equal,
              value: "admin",
            },
          ],
        },
      ],
    },
  ],
};

export function convertFilterToString(filter: Filter) {
  return 'filter';
}
