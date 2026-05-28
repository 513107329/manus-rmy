'use server';

import { authActionClient } from '@/lib/safe-action';
import {
  createApiToolReqSchema,
  deleteApiToolProviderReqSchema,
  updateApiToolActionReqSchema,
  validateOpenapiSchemaReqSchema,
} from '@/schemas/api-tool-schema';
import {
  createApiTool,
  deleteApiTool,
  getApiToolListReqSchema,
  listApiToolsByPage,
  updateApiTool,
  validateOpenapiSchema,
} from '@/services/api-tool-service';

export const validateOpenapiSchemaAction = authActionClient
  .inputSchema(validateOpenapiSchemaReqSchema)
  .metadata({
    actionName: 'validateOpenapiSchema',
  })
  .action(async ({ parsedInput: { openapiSchema } }) => {
    validateOpenapiSchema(openapiSchema);
    return true;
  });

export const saveApiToolProviderAction = authActionClient
  .inputSchema(createApiToolReqSchema)
  .metadata({
    actionName: 'saveApiToolProvider',
  })
  .action(async ({ parsedInput, ctx: { userId } }) =>
    createApiTool(userId, parsedInput),
  );

export const fetchApiToolsByPageAction = authActionClient
  .inputSchema(getApiToolListReqSchema)
  .metadata({
    actionName: 'fetchApiToolsByPage',
  })
  .action(async ({ parsedInput, ctx: { userId } }) =>
    listApiToolsByPage(userId, parsedInput),
  );

export const updateApiToolProviderAction = authActionClient
  .inputSchema(updateApiToolActionReqSchema)
  .metadata({
    actionName: 'updateApiToolProvider',
  })
  .action(async ({ parsedInput, ctx: { userId } }) =>
    updateApiTool(userId, parsedInput.providerId, parsedInput.data),
  );

export const deleteApiToolProviderAction = authActionClient
  .inputSchema(deleteApiToolProviderReqSchema)
  .metadata({
    actionName: 'deleteApiToolProvider',
  })
  .action(async ({ parsedInput, ctx: { userId } }) =>
    deleteApiTool(userId, parsedInput.providerId),
  );
