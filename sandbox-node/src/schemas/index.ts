import { z } from 'zod';

export const readFileSchema = z.object({
  filepath: z.string(),
  start_line: z.number().optional().nullable(),
  end_line: z.number().optional().nullable(),
  sudo: z.boolean().optional().default(false),
});

export const writeFileSchema = z.object({
  filepath: z.string(),
  content: z.string(),
  append: z.boolean().default(false),
  leading_newline: z.boolean().default(false),
  trailing_newline: z.boolean().default(false),
  sudo: z.boolean().default(false),
});

export const replaceInFileSchema = z.object({
  filepath: z.string(),
  old_content: z.string(),
  new_content: z.string(),
  sudo: z.boolean().default(false),
});

export const searchInFileSchema = z.object({
  filepath: z.string(),
  regex: z.string(),
  sudo: z.boolean().default(false),
});

export const findFilesSchema = z.object({
  dir_path: z.string(),
  glob: z.string(),
});

export const fileExistsSchema = z.object({
  filepath: z.string(),
});

export const deleteFileSchema = z.object({
  filepath: z.string(),
  sudo: z.boolean().default(false),
});

export const execCommandSchema = z.object({
  session_id: z.string().optional().default(''),
  command: z.string(),
  exec_dir: z.string().optional().default(''),
});

export const viewShellSchema = z.object({
  session_id: z.string(),
  console: z.boolean().optional().default(false),
});

export const waitForProcessSchema = z.object({
  session_id: z.string(),
  seconds: z.number().optional().default(60),
});

export const writeToProcessSchema = z.object({
  session_id: z.string(),
  inputText: z.string(),
  enter: z.boolean().default(true),
});

export const killProcessSchema = z.object({
  session_id: z.string(),
});

export const supervisorTimeoutSchema = z.object({
  minutes: z.number().optional(),
});

export type ReadFileRequest = z.infer<typeof readFileSchema>;
export type WriteFileRequest = z.infer<typeof writeFileSchema>;
export type ReplaceInFileRequest = z.infer<typeof replaceInFileSchema>;
export type SearchInFileRequest = z.infer<typeof searchInFileSchema>;
export type FindFilesRequest = z.infer<typeof findFilesSchema>;
export type FileExistsRequest = z.infer<typeof fileExistsSchema>;
export type DeleteFileRequest = z.infer<typeof deleteFileSchema>;
export type ExecCommandRequest = z.infer<typeof execCommandSchema>;
export type ViewShellRequest = z.infer<typeof viewShellSchema>;
export type WaitForProcessRequest = z.infer<typeof waitForProcessSchema>;
export type WriteToProcessRequest = z.infer<typeof writeToProcessSchema>;
export type KillProcessRequest = z.infer<typeof killProcessSchema>;
export type SupervisorTimeoutRequest = z.infer<typeof supervisorTimeoutSchema>;
