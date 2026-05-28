import { searchPageReqSchema } from '@repo/common';
import {
  DEFAULT_PROCESS_RULE,
  PreProcessRuleId,
  ProcessType,
} from '@repo/dataset/client';
import { z } from 'zod';

export const createDatasetReqSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Name is required' })
    .max(100, { message: 'Name should be less than 100 characters' }),
  description: z
    .string()
    .max(2000, { message: 'Description should be less than 2000 characters' }),
  icon: z.url({ message: 'Icon should be a url' }),
});

export const getDatasetListReqSchema = searchPageReqSchema;

export const deleteDatasetReqSchema = z.object({
  datasetId: z.string(),
});

export const updateDatasetReqSchema = z.object({
  datasetId: z.string(),
  name: z
    .string()
    .min(1, { message: 'Name is required' })
    .max(100, { message: 'Name should be less than 100 characters' }),
  description: z
    .string()
    .max(2000, { message: 'Description should be less than 2000 characters' }),
  icon: z.url({ message: 'Icon should be a url' }),
});

export const createDocumentsReqSchema = z
  .object({
    datasetId: z.string(),
    uploadFileIds: z
      .array(z.string())
      .min(1, { message: 'At least one file is required' })
      .max(10, { message: 'At most 10 files can be selected' })
      .transform((ids) => [...new Set(ids)]),
    processType: z.enum(ProcessType, {
      message: 'processType must be automatic or custom',
    }),
    rule: z
      .object({
        preProcessRules: z
          .array(
            z.object({
              id: z.enum(PreProcessRuleId, {
                message:
                  'id must be remove_extra_space or remove_url_and_email',
              }),
              enabled: z.boolean(),
            }),
          )
          .refine(
            (rules) => {
              const ruleIds = new Set(rules.map((r) => r.id));
              return (
                ruleIds.size === 2 &&
                ruleIds.has(PreProcessRuleId.RemoveExtraSpace) &&
                ruleIds.has(PreProcessRuleId.RemoveUrlAndEmail)
              );
            },
            {
              message:
                'preProcessRules must contain remove_extra_space and remove_url_and_email two rules',
            },
          ),
        segment: z
          .object({
            separators: z
              .array(z.string())
              .nonempty({ message: 'separators cannot be empty' }),
            chunkSize: z
              .number()
              .int({ message: 'chunkSize must be an integer' })
              .min(100, { message: 'chunkSize cannot be less than 100' })
              .max(1000, { message: 'chunkSize cannot be greater than 1000' }),

            chunkOverlap: z
              .number()
              .int({ message: 'chunkOverlap must be an integer' })
              .min(0, { message: 'chunkOverlap cannot be less than 0' }),
          })
          .refine(
            (data) => data.chunkOverlap <= Math.floor(data.chunkSize * 0.5),
            {
              message:
                'chunkOverlap cannot be greater than the half of the chunkSize',
              path: ['chunkOverlap'],
            },
          ),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.processType === ProcessType.Custom && !data.rule) {
      ctx.addIssue({
        code: 'custom',
        message: 'Rule is required when processType is custom',
        path: ['rule'],
      });
    }
  })
  .transform((data) => {
    if (data.processType === ProcessType.Automatic) {
      return {
        ...data,
        rule: DEFAULT_PROCESS_RULE.rule,
      };
    }
    return data;
  });

export const getDocumentsByBatchReqSchema = z.object({
  datasetId: z.string(),
  batchId: z.string(),
});
