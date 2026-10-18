import { Readable, Writable } from "node:stream";
import type { Express } from "express";

type HeaderValue = string | number | readonly string[];

interface ExpressWorkerSurface {
  request: object;
  response: object;
  handle(req: object, res: object): void;
}

class WorkerRequest extends Readable {
  readonly headers: Record<string, string>;
  readonly method: string;
  readonly url: string;
  readonly socket: {
    encrypted: boolean;
    remoteAddress: string;
    remotePort: number;
    readable: boolean;
    address(): { address: string; family: string; port: number };
  };
  readonly connection: WorkerRequest["socket"];
  // Express skips body parsing when it thinks this stream is already finished.
  complete = false;
  readonly httpVersion = "1.1";
  readonly httpVersionMajor = 1;
  readonly httpVersionMinor = 1;
  readonly ip: string;
  readonly body: Buffer;
  private bodySent = false;

  constructor(request: Request, body: Buffer) {
    super();
    const url = new URL(request.url);
    const remoteAddress = request.headers.get("cf-connecting-ip") ?? "";
    this.headers = Object.fromEntries(request.headers.entries());
    this.headers["content-length"] = String(body.byteLength);
    this.method = request.method;
    this.url = `${url.pathname}${url.search}`;
    this.body = body;
    this.ip = remoteAddress;
    this.socket = {
      encrypted: url.protocol === "https:",
      remoteAddress,
      remotePort: 443,
      readable: true,
      address: () => ({ address: remoteAddress, family: "IPv4", port: 443 }),
    };
    this.connection = this.socket;
  }

  override _read(): void {
    if (this.bodySent) return;
    this.bodySent = true;
    this.push(this.body);
    this.push(null);
    this.complete = true;
    this.socket.readable = false;
  }
}

class WorkerResponse extends Writable {
  statusCode = 200;
  statusMessage = "";
  useChunkedEncodingByDefault = false;
  chunkedEncoding = false;
  _header = "";
  _headerSent = false;
  private readonly headers = new Map<string, HeaderValue>();
  private readonly chunks: Buffer[] = [];

  get headersSent(): boolean {
    return this._headerSent || this.writableEnded;
  }

  override _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this._headerSent = true;
    this.chunks.push(
      Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding),
    );
    callback();
  }

  override _final(callback: (error?: Error | null) => void): void {
    callback();
  }

  setHeader(name: string, value: HeaderValue): this {
    if (this.headersSent) {
      throw new Error("Cannot set headers after they are sent");
    }
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  getHeader(name: string): HeaderValue | undefined {
    return this.headers.get(name.toLowerCase());
  }

  getHeaders(): Record<string, HeaderValue> {
    return Object.fromEntries(this.headers);
  }

  getHeaderNames(): string[] {
    return [...this.headers.keys()];
  }

  hasHeader(name: string): boolean {
    return this.headers.has(name.toLowerCase());
  }

  removeHeader(name: string): void {
    if (this.headersSent) {
      throw new Error("Cannot remove headers after they are sent");
    }
    this.headers.delete(name.toLowerCase());
  }

  writeHead(
    statusCode: number,
    statusMessageOrHeaders?: string | Record<string, HeaderValue>,
    headers?: Record<string, HeaderValue>,
  ): this {
    this.statusCode = statusCode;
    const responseHeaders =
      typeof statusMessageOrHeaders === "object"
        ? statusMessageOrHeaders
        : headers;
    if (typeof statusMessageOrHeaders === "string") {
      this.statusMessage = statusMessageOrHeaders;
    }
    for (const [name, value] of Object.entries(responseHeaders ?? {})) {
      this.setHeader(name, value);
    }
    this._headerSent = true;
    return this;
  }

  flushHeaders(): void {
    this._headerSent = true;
  }

  toResponse(method: string): Response {
    const headers = new Headers();
    for (const [name, value] of this.headers) {
      if (Array.isArray(value)) {
        for (const entry of value) headers.append(name, entry);
      } else {
        headers.set(name, String(value));
      }
    }

    const status = this.statusCode;
    const body =
      method === "HEAD" || status === 204 || status === 205 || status === 304
        ? null
        : Buffer.concat(this.chunks);
    return new Response(body, { status, headers });
  }
}

export function createCloudflareExpressHandler(
  app: Express,
): (request: Request) => Promise<Response> {
  const workerApp = app as Express & ExpressWorkerSurface;
  const expressRequestPrototype = Object.getPrototypeOf(workerApp.request);
  const expressResponsePrototype = Object.getPrototypeOf(workerApp.response);
  // Express replaces request/response prototypes during dispatch, so the stream
  // shims must sit below Express's own prototypes.
  Object.setPrototypeOf(expressRequestPrototype, WorkerRequest.prototype);
  Object.setPrototypeOf(expressResponsePrototype, WorkerResponse.prototype);

  return async (request: Request): Promise<Response> => {
    const body = Buffer.from(await request.arrayBuffer());
    const expressRequest = new WorkerRequest(request, body);
    const expressResponse = new WorkerResponse();
    const handle = workerApp.handle.bind(workerApp);

    const finished = new Promise<Response>((resolve, reject) => {
      expressResponse.once("finish", () => {
        resolve(expressResponse.toResponse(request.method));
      });
      expressResponse.once("error", reject);
      try {
        handle(expressRequest, expressResponse);
      } catch (error) {
        reject(error);
      }
    });

    return finished;
  };
}
