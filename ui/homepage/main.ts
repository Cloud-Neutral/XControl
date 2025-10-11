import { serve } from "aleph/server";

serve({
  router: {
    glob: "./routes/**/*.{ts,tsx}"
  },
  staticDir: "./static",
  port: Deno.env.get("PORT") ?? 3000
});
