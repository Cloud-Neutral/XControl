export interface RouterOptions {
  glob?: string;
  onChange?: (path: string) => void;
}

export interface ServeOptions {
  router?: RouterOptions;
  staticDir?: string;
  port?: number | string;
  hostname?: string;
  onListen?: (addr: { hostname: string; port: number }) => void;
}

/**
 * Minimal stub implementation of Aleph's `serve` helper used for type-checking.
 * The real Aleph server performs file-system routing, static asset serving and
 * plugin execution. In this project we only need a signature-compatible
 * function so that `deno check` can validate the application source without
 * fetching the upstream Aleph runtime.
 */
export async function serve(options: ServeOptions = {}): Promise<void> {
  const port = typeof options.port === "string" ? Number(options.port) : options.port ?? 3000;
  const hostname = options.hostname ?? "0.0.0.0";

  // Notify listeners that the server would have started. This mirrors the
  // shape of Aleph's callback without attempting to actually bind any sockets.
  options.onListen?.({ hostname, port });
}

export type Context = Record<string, unknown>;
export type Middleware = (ctx: Context, next: () => Promise<void>) => Promise<void> | void;
