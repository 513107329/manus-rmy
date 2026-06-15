import { AgentConfig } from '../../models';
import { AgentMessage } from '../../message';
import { AgentEvent, MessageEvent, PlanEvent, PlanEventStatus } from '../../events';
import { isStepDone, parsePlan, Plan, Step } from '../../plan';
import { RepairJsonParser } from '../../../infrastructure/json-parser/repair-json-parser';
import { OpenAILLM } from '../../../infrastructure/llm/openai-llm';
import { BaseTool } from '../tools/base-tool';
import { BaseAgent } from './base-agent';
import {
  CREATE_PLAN_PROMPT,
  SYSTEM_PLAN_PROMPT,
  SYSTEM_PROMPT,
  UPDATE_PLAN_PROMPT,
} from '../prompts';

export class PlannerAgent extends BaseAgent {
  protected get name() {
    return 'planner';
  }
  protected get systemPrompt() {
    return SYSTEM_PROMPT + SYSTEM_PLAN_PROMPT;
  }
  protected override get format() {
    return 'json_object';
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

  async *createPlan(message: AgentMessage): AsyncGenerator<AgentEvent> {
    const query = CREATE_PLAN_PROMPT.replace('{message}', message.message).replace(
      '{attachments}',
      message.attachments.join('\n'),
    );

    for await (const event of this.invoke(query)) {
      if (event.type === 'message') {
        const parsed = await this.jsonParser.invoke((event as MessageEvent).message);
        const plan = parsePlan(parsed);
        yield {
          id: event.id,
          type: 'plan',
          created_at: event.created_at,
          plan,
          status: PlanEventStatus.CREATED,
        } as PlanEvent;
      } else {
        yield event;
      }
    }
  }

  async *updatePlan(plan: Plan, step: Step): AsyncGenerator<AgentEvent> {
    const query = UPDATE_PLAN_PROMPT.replace('{plan}', JSON.stringify(plan)).replace(
      '{step}',
      JSON.stringify(step),
    );

    for await (const event of this.invoke(query)) {
      if (event.type === 'message') {
        const parsed = await this.jsonParser.invoke((event as MessageEvent).message);
        const updatedPlan = parsePlan(parsed);
        const newSteps = updatedPlan.steps;

        const firstPendingIndex = plan.steps.findIndex((s) => !isStepDone(s));
        if (firstPendingIndex >= 0) {
          plan.steps = [...plan.steps.slice(0, firstPendingIndex), ...newSteps];
        }

        yield {
          id: event.id,
          type: 'plan',
          created_at: event.created_at,
          plan,
          status: PlanEventStatus.UPDATED,
        } as PlanEvent;
      } else {
        yield event;
      }
    }
  }
}
