/**
 * Minimal Bun type declarations for tsc compatibility.
 * When running under Bun, the full bun-types package provides complete types.
 * This file is a fallback for environments where bun-types is not installed.
 */

declare module 'bun:sqlite' {
  export class Database {
    constructor(filename: string);
    query(sql: string): any;
    run(sql: string, ...params: any[]): any;
    prepare(sql: string): any;
    exec(sql: string): void;
    close(): void;
  }
}

declare const Bun: {
  serve<T = unknown>(options: {
    port?: number;
    hostname?: string;
    fetch: (req: Request, server: any) => Response | Promise<Response> | undefined;
    websocket?: {
      open?: (ws: any) => void;
      message?: (ws: any, message: string | Buffer) => void;
      close?: (ws: any) => void;
    };
  }): {
    port: number;
    stop(): void;
    publish(topic: string, data: string | ArrayBuffer | Uint8Array): void;
  };
  spawnSync(cmd: string[], options?: any): {
    exitCode: number;
    stdout: { toString(): string };
    stderr: { toString(): string };
  };
  spawn(cmd: string[], options?: any): any;
  file(path: string): any;
  env: Record<string, string | undefined>;
};
