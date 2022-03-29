export interface CloudLogger<T> {
  initialize(intervalCallback: (count: number) => boolean): Promise<any>;

  startIntervals(): boolean;

  stopIntervals(): Promise<number>;

  flushLogEvents(): Promise<number>;

  writeLog(message: string): Promise<boolean>;

  cloudLogs: T;
}
