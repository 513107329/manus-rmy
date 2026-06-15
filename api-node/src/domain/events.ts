import { Plan, Step } from './plan';
import { ToolResult } from './tool-result';
import { FileRecord } from './models';

export enum PlanEventStatus {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  COMPLETED = 'completed',
}

export enum StepEventStatus {
  STARTED = 'started',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ToolEventStatus {
  CALLING = 'calling',
  CALLED = 'called',
}

export interface BaseEvent {
  id: string;
  type: string;
  created_at: number;
  [key: string]: unknown;
}

export interface PlanEvent extends BaseEvent {
  type: 'plan';
  plan: Plan;
  status: PlanEventStatus;
}

export interface TitleEvent extends BaseEvent {
  type: 'title';
  title: string;
}

export interface StepEvent extends BaseEvent {
  type: 'step';
  step: Step;
  status: StepEventStatus;
}

export interface MessageEvent extends BaseEvent {
  type: 'message';
  role: 'user' | 'assistant';
  message: string;
  attachments?: FileRecord[] | string[];
}

export interface BrowserToolContent {
  screenshot?: string;
  url?: string;
}

export interface SearchToolContent {
  results: { title: string; url: string; snippet: string }[];
}

export interface ShellToolContent {
  console?: unknown;
  content?: string;
}

export interface FileToolContent {
  content: string;
}

export interface MCPToolContent {
  result: unknown;
}

export interface A2AToolContent {
  a2a_result: unknown;
}

export type ToolContent =
  | BrowserToolContent
  | SearchToolContent
  | ShellToolContent
  | FileToolContent
  | MCPToolContent
  | A2AToolContent;

export interface ToolEvent extends BaseEvent {
  type: 'tool';
  tool_call_id: string;
  tool_name: string;
  tool_content?: ToolContent;
  function_name: string;
  function_args: Record<string, unknown>;
  function_result?: ToolResult;
  status: ToolEventStatus;
}

export interface WaitEvent extends BaseEvent {
  type: 'wait';
}

export interface ErrorEvent extends BaseEvent {
  type: 'error';
  error: string;
}

export interface DoneEvent extends BaseEvent {
  type: 'done';
  status?: string;
}

export type AgentEvent =
  | PlanEvent
  | TitleEvent
  | StepEvent
  | MessageEvent
  | ToolEvent
  | WaitEvent
  | ErrorEvent
  | DoneEvent
  | BaseEvent;

export function getLatestPlanFromEvents(events: BaseEvent[]): Plan | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === 'plan' && (e as PlanEvent).plan) {
      return (e as PlanEvent).plan;
    }
  }
  return null;
}
