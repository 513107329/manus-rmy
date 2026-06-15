declare module 'dockerode' {
  interface NetworkSettings {
    IPAddress?: string;
    Networks?: Record<string, { IPAddress?: string }>;
  }

  interface ContainerInspectInfo {
    NetworkSettings?: NetworkSettings;
    State?: { Running?: boolean };
  }

  interface Container {
    start(): Promise<void>;
    start(callback: (err: Error | null) => void): void;
    inspect(): Promise<ContainerInspectInfo>;
    inspect(callback: (err: Error | null, info: ContainerInspectInfo) => void): void;
    stop(options: { t: number }): Promise<void>;
    stop(options: { t: number }, callback: (err: Error | null) => void): void;
    remove(options: { force: boolean }): Promise<void>;
    remove(options: { force: boolean }, callback: (err: Error | null) => void): void;
  }

  interface ContainerCreateOptions {
    Image?: string;
    name?: string;
    HostConfig?: Record<string, unknown>;
    Env?: string[];
    NetworkingConfig?: Record<string, unknown>;
  }

  class Dockerode {
    constructor(options?: Record<string, unknown>);
    createContainer(options: ContainerCreateOptions): Promise<Container>;
    createContainer(
      options: ContainerCreateOptions,
      callback: (err: Error | null, container?: Container) => void,
    ): void;
    getContainer(id: string): Container;
  }

  export = Dockerode;
}
