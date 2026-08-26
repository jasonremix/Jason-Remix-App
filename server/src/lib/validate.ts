import type { ZodType } from 'zod';

import { badRequest } from './errors.ts';

/**
 * Parses a request payload against a schema, turning failures into a 400 with
 * field-level detail. Nothing reaches a service without passing through here.
 */
export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const details: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!details[key]) details[key] = issue.message;
  }

  const first = Object.values(details)[0] ?? 'Please check the details you entered.';
  throw badRequest(first, details);
}
