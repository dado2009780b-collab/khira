declare module "cloudflare:node" {
  export function httpServerHandler(server: unknown): unknown;
  export function httpServerHandler(options: { port: number }): unknown;
}
