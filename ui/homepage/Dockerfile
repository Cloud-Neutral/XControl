# Build homepage using Deno runtime
FROM denoland/deno:alpine AS build
WORKDIR /app

COPY deno.jsonc ./deno.jsonc
COPY scripts ./scripts
COPY types ./types
COPY ui/homepage ./ui/homepage

RUN deno task homepage:export
RUN deno task homepage:check-build

FROM nginx:alpine
COPY --from=build /app/ui/homepage/out /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
