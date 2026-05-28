'use server';

import { authActionClient } from '@/lib/safe-action';
import {
  createDatasetReqSchema,
  createDocumentsReqSchema,
  deleteDatasetReqSchema,
  getDatasetListReqSchema,
  getDocumentsByBatchReqSchema,
  updateDatasetReqSchema,
} from '@/schemas/dataset-schema';
import {
  createDataset,
  createDocuments,
  DEFAULT_PROCESS_RULE,
  deleteDataset,
  getDocumentsByBatch,
  listDatasetsByPage,
  updateDataset,
} from '@/services/dataset-service';

export const createDatasetAction = authActionClient
  .inputSchema(createDatasetReqSchema)
  .metadata({
    actionName: 'createDataset',
  })
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const dataset = await createDataset({ userId, ...parsedInput });
    return dataset.id;
  });

export const fetchDatasetsByPageAction = authActionClient
  .inputSchema(getDatasetListReqSchema)
  .metadata({
    actionName: 'fetchDatasetsByPage',
  })
  .action(async ({ parsedInput, ctx: { userId } }) =>
    listDatasetsByPage(userId, parsedInput),
  );

export const deleteDatasetAction = authActionClient
  .inputSchema(deleteDatasetReqSchema)
  .metadata({
    actionName: 'deleteDataset',
  })
  .action(async ({ parsedInput, ctx: { userId } }) => {
    return await deleteDataset(parsedInput.datasetId, userId);
  });

export const updateDatasetAction = authActionClient
  .inputSchema(updateDatasetReqSchema)
  .metadata({
    actionName: 'updateDataset',
  })
  .action(async ({ parsedInput, ctx: { userId } }) => {
    await updateDataset(parsedInput.datasetId, userId, parsedInput);
    return parsedInput.datasetId;
  });

export const createDocumentsAction = authActionClient
  .inputSchema(createDocumentsReqSchema)
  .metadata({
    actionName: 'createDocuments',
  })
  .action(async ({ parsedInput, ctx: { userId } }) => {
    return await createDocuments(userId, {
      datasetId: parsedInput.datasetId,
      uploadFileIds: parsedInput.uploadFileIds,
      processType: parsedInput.processType,
      rule: parsedInput.rule ?? DEFAULT_PROCESS_RULE.rule,
    });
  });

export const getDocumentsByBatchAction = authActionClient
  .inputSchema(getDocumentsByBatchReqSchema)
  .metadata({
    actionName: 'getDocumentsByBatch',
  })
  .action(async ({ parsedInput, ctx: { userId } }) => {
    return await getDocumentsByBatch(
      parsedInput.datasetId,
      parsedInput.batchId,
      userId,
    );
  });
