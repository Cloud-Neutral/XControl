# Build homepage using Deno runtime
FROM denoland/deno:alpine
WORKDIR /app

COPY deno.jsonc ./deno.jsonc
COPY scripts ./scripts
COPY types ./types
COPY ui/homepage ./ui/homepage

WORKDIR /app/ui/homepage
RUN deno task prebuild

EXPOSE 3000
CMD ["deno", "run", "--allow-read", "--allow-net", "--allow-env", "main.ts"]
