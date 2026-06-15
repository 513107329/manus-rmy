import { v4 as uuidv4 } from 'uuid';

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Step {
  id: string;
  description: string;
  status: ExecutionStatus;
  result?: string | null;
  error?: string | null;
  success: boolean;
  attachments?: string[] | null;
}

export function isStepDone(step: Step): boolean {
  return step.status === ExecutionStatus.COMPLETED || step.status === ExecutionStatus.FAILED;
}

export interface Plan {
  id: string;
  title: string;
  goal: string;
  language: string;
  message: string;
  status: ExecutionStatus;
  error?: string | null;
  steps: Step[];
  result?: string | null;
}

export function createStep(description: string, id = uuidv4()): Step {
  return {
    id,
    description,
    status: ExecutionStatus.PENDING,
    success: false,
    attachments: null,
  };
}

export function parsePlan(raw: Record<string, unknown>): Plan {
  const steps = Array.isArray(raw.steps)
    ? raw.steps.map((s: Record<string, unknown>) => ({
        id: String(s.id ?? uuidv4()),
        description: String(s.description ?? ''),
        status: ExecutionStatus.PENDING,
        success: false,
        result: null,
        error: null,
        attachments: null,
      }))
    : [];

  return {
    id: String(raw.id ?? uuidv4()),
    title: String(raw.title ?? ''),
    goal: String(raw.goal ?? ''),
    language: String(raw.language ?? 'Chinese'),
    message: String(raw.message ?? ''),
    status: ExecutionStatus.PENDING,
    steps,
    result: null,
    error: null,
  };
}

export function parseStepResult(raw: Record<string, unknown>): Partial<Step> {
  return {
    success: Boolean(raw.success),
    result: raw.result != null ? String(raw.result) : null,
    attachments: Array.isArray(raw.attachments) ? raw.attachments.map(String) : null,
  };
}

export function getNextStep(plan: Plan): Step | null {
  return plan.steps.find((s) => !isStepDone(s)) ?? null;
}
