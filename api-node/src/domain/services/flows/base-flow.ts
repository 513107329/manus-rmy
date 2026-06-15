export enum FlowStatus {
  IDLE = 'idle',
  PLANNING = 'planning',
  EXECUTING = 'executing',
  UPDATING = 'updating',
  SUMMARIZING = 'summarizing',
  COMPLETED = 'completed',
}

export abstract class BaseFlow {
  status: FlowStatus = FlowStatus.IDLE;

  get done(): boolean {
    return this.status === FlowStatus.IDLE;
  }
}
