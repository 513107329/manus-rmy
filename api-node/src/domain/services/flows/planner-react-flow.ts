import { v4 as uuidv4 } from 'uuid';
import { AgentConfig, SessionStatus } from '../../models';
import { AgentMessage } from '../../message';
import {
  AgentEvent,
  DoneEvent,
  getLatestPlanFromEvents,
  MessageEvent,
  PlanEvent,
  PlanEventStatus,
  TitleEvent,
} from '../../events';
import { ExecutionStatus, getNextStep, Plan, Step } from '../../plan';
import { sessionRepository } from '../../../repositories/session.repository';
import { RepairJsonParser } from '../../../infrastructure/json-parser/repair-json-parser';
import { OpenAILLM } from '../../../infrastructure/llm/openai-llm';
import { DockerSandbox } from '../../../infrastructure/sandbox/docker-sandbox';
import { PlaywrightBrowser } from '../../../infrastructure/browser/playwright-browser';
import { BingSearchEngine } from '../../../infrastructure/search/bing-search';
import { BaseTool } from '../tools/base-tool';
import { FileTool } from '../tools/file-tool';
import { ShellTool } from '../tools/shell-tool';
import { BrowserTool } from '../tools/browser-tool';
import { SearchTool } from '../tools/search-tool';
import { MessageTool } from '../tools/message-tool';
import { McpTool } from '../tools/mcp-tool';
import { A2ATool } from '../tools/a2a-tool';
import { PlannerAgent } from '../agents/planner-agent';
import { ReActAgent } from '../agents/react-agent';
import { BaseFlow, FlowStatus } from './base-flow';
import { logger } from '../../../utils/logger';

export class PlannerReactFlow extends BaseFlow {
  private plan: Plan | null = null;
  private readonly planner: PlannerAgent;
  private readonly react: ReActAgent;

  constructor(
    private readonly sessionId: string,
    llm: OpenAILLM,
    agentConfig: AgentConfig,
    jsonParser: RepairJsonParser,
    sandbox: DockerSandbox,
    browser: PlaywrightBrowser,
    searchEngine: BingSearchEngine,
    mcpTool: McpTool,
    a2aTool: A2ATool,
  ) {
    super();
    const tools: BaseTool[] = [
      new FileTool(sandbox),
      new ShellTool(sandbox),
      new BrowserTool(browser),
      new SearchTool(searchEngine),
      new MessageTool(),
      mcpTool,
      a2aTool,
    ];

    this.planner = new PlannerAgent(sessionId, agentConfig, llm, jsonParser, tools);
    this.react = new ReActAgent(sessionId, agentConfig, llm, jsonParser, tools);
  }

  async *invoke(message: AgentMessage): AsyncGenerator<AgentEvent> {
    const session = await sessionRepository.getById(this.sessionId);
    if (!session) throw new Error('Session not found');

    if (session.status !== SessionStatus.PENDING) {
      await this.planner.rollBack(message);
      await this.react.rollBack(message);
    }

    if (session.status === SessionStatus.RUNNING) {
      this.status = FlowStatus.PLANNING;
    }
    if (session.status === SessionStatus.WAITING) {
      this.status = FlowStatus.EXECUTING;
    }

    await sessionRepository.updateStatus(this.sessionId, SessionStatus.RUNNING);
    this.plan = getLatestPlanFromEvents(session.events) ?? this.plan;

    let currentStep: Step | null = null;

    while (true) {
      if (this.status === FlowStatus.IDLE) {
        this.status = FlowStatus.PLANNING;
      } else if (this.status === FlowStatus.PLANNING) {
        for await (const event of this.planner.createPlan(message)) {
          if (event.type === 'plan' && (event as PlanEvent).status === PlanEventStatus.CREATED) {
            this.plan = (event as PlanEvent).plan;
            yield { id: uuidv4(), type: 'title', title: this.plan.title, created_at: Date.now() } as TitleEvent;
            yield {
              id: uuidv4(),
              type: 'message',
              role: 'assistant',
              message: this.plan.message,
              created_at: Date.now(),
            } as MessageEvent;
          }
          yield event;
        }
        this.status = FlowStatus.EXECUTING;
        if (!this.plan || this.plan.steps.length === 0) {
          this.status = FlowStatus.COMPLETED;
        }
      } else if (this.status === FlowStatus.EXECUTING) {
        if (!this.plan) break;
        this.plan.status = ExecutionStatus.RUNNING;
        currentStep = getNextStep(this.plan);
        if (!currentStep) {
          this.status = FlowStatus.SUMMARIZING;
          continue;
        }
        logger.info(`Executing step ${currentStep.id}: ${currentStep.description.slice(0, 50)}`);
        for await (const event of this.react.executeStep(this.plan, currentStep, message)) {
          yield event;
        }
        await this.react.compactMemory();
        this.status = FlowStatus.UPDATING;
      } else if (this.status === FlowStatus.UPDATING) {
        if (!this.plan || !currentStep) break;
        for await (const event of this.planner.updatePlan(this.plan, currentStep)) {
          yield event;
        }
        this.status = FlowStatus.EXECUTING;
      } else if (this.status === FlowStatus.SUMMARIZING) {
        for await (const event of this.react.summarize()) {
          yield event;
        }
        this.status = FlowStatus.COMPLETED;
      } else if (this.status === FlowStatus.COMPLETED) {
        if (this.plan) this.plan.status = ExecutionStatus.COMPLETED;
        this.status = FlowStatus.IDLE;
        if (this.plan) {
          yield {
            id: uuidv4(),
            type: 'plan',
            plan: this.plan,
            status: PlanEventStatus.COMPLETED,
            created_at: Date.now(),
          } as PlanEvent;
        }
        break;
      }
    }

    yield { id: uuidv4(), type: 'done', status: FlowStatus.IDLE, created_at: Date.now() } as DoneEvent;
  }
}
