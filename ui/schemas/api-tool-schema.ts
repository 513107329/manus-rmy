import { updateApiToolReqSchema } from '@repo/api-tool';
import { z } from 'zod';

export { createApiToolReqSchema } from '@repo/api-tool';

export const validateOpenapiSchemaReqSchema = z.object({
  openapiSchema: z.string().trim().nonempty(),
});

export const updateApiToolActionReqSchema = z.object({
  providerId: z.string(),
  data: updateApiToolReqSchema,
});

export const deleteApiToolProviderReqSchema = z.object({
  providerId: z.string(),
});
