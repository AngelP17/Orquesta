import { z } from 'zod';

export const CursorSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  after_id: z.string().uuid().optional()
});

export const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional()
  })
});

export const PaginatedEnvelope = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable()
  });

export const requireIdempotencyKey = (value: unknown): string => {
  const schema = z.string().uuid();
  return schema.parse(value);
};
