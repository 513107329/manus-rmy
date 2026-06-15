import { v4 as uuidv4 } from 'uuid';
import { AgentConfig } from '../../models';
import { AgentMessage, parseAgentMessage } from '../../message';
import {
  AgentEvent,
  MessageEvent,
  StepEvent,
  StepEventStatus,
  ToolEvent,
  ToolEventStatus,
  WaitEvent,
} from '../../events';
import { ExecutionStatus, Plan, Step, parseStepResult } from '../../plan';
import { RepairJsonParser } from '../../../infrastructure/json-parser/repair-json-parser';
import { OpenAILLM } from '../../../infrastructure/llm/openai-llm';
import { BaseTool } from '../tools/base-tool';
import { BaseAgent } from './base-agent';
import { EXECUTION_PROMPT, SUMMARY_PROMPT, SYSTEM_PROMPT, SYSTEM_REACT_PROMPT } from '../prompts';

export class ReActAgent extends BaseAgent {
  protected get name() {
    return 'reacter';
  }
  protected get systemPrompt() {
    return SYSTEM_PROMPT + SYSTEM_REACT_PROMPT;
  }

  constructor(
    sessionId: string,
    agentConfig: AgentConfig,
    llm: OpenAILLM,
    jsonParser: RepairJsonParser,
    tools: BaseTool[],
  ) {
    super(sessionId, agentConfig, llm, jsonParser, tools);
  }

  async *executeStep(plan: Plan, step: Step, message: AgentMessage): AsyncGenerator<AgentEvent> {
    const query = EXECUTION_PROMPT.replace('{step}', step.description)
      .replace('{message}', message.message)
      .replace('{attachments}', message.attachments.join('\n'))
      .replace('{language}', plan.language);

    step.status = ExecutionStatus.RUNNING;
    yield {
      id: uuidv4(),
      type: 'step',
      created_at: Date.now(),
      step: { ...step },
      status: StepEventStatus.STARTED,
    } as StepEvent;

    for await (const event of this.invoke(query)) {
      if (event.type === 'tool') {
        const te = event as ToolEvent;
        if (te.function_name === 'message_ask_user') {
          if (te.status === ToolEventStatus.CALLING) {
            yield {
              id: uuidv4(),
              type: 'message',
              role: 'assistant',
              message: String(te.function_args.text ?? ''),
              created_at: Date.now(),
            } as MessageEvent;
          } else if (te.status === ToolEventStatus.CALLED) {
            yield { id: uuidv4(), type: 'wait', created_at: Date.now() } as WaitEvent;
            return;
          }
          continue;
        }
        yield event;
      } else if (event.type === 'message') {
        step.status = ExecutionStatus.COMPLETED;
        const parsed = await this.jsonParser.invoke((event as MessageEvent).message);
        const partial = parseStepResult(parsed);
        step.success = partial.success ?? false;
        step.result = partial.result ?? null;
        step.attachments = partial.attachments ?? null;

        yield {
          id: uuidv4(),
          type: 'step',
          created_at: Date.now(),
          step: { ...step },
          status: StepEventStatus.COMPLETED,
        } as StepEvent;

        if (step.result) {
          yield {
            id: uuidv4(),
            type: 'message',
            role: 'assistant',
            message: step.result,
            created_at: Date.now(),
          } as MessageEvent;
        }
      } else {
        if (event.type === 'error') {
          step.status = ExecutionStatus.FAILED;
          step.error = (event as { error: string }).error;
          yield {
            id: uuidv4(),
            type: 'step',
            created_at: Date.now(),
            step: { ...step },
            status: StepEventStatus.FAILED,
          } as StepEvent;
        }
        yield event;
      }
    }
    step.status = ExecutionStatus.COMPLETED;
  }

  async *summarize(): AsyncGenerator<AgentEvent> {
    for await (const event of this.invoke(SUMMARY_PROMPT)) {
      if (event.type === 'message') {
        const parsed = await this.jsonParser.invoke((event as MessageEvent).message);
        const msg = parseAgentMessage(parsed);
        yield {
          id: event.id,
          type: 'message',
          role: 'assistant',
          message: msg.message,
          attachments: msg.attachments,
          created_at: event.created_at,
        } as MessageEvent;
      } else {
        yield event;
      }
    }
  }
}
