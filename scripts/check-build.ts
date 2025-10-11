const HOMEPAGE_ROOT = new URL("../ui/homepage/", import.meta.url);

function resolveArtifact(relativePath: string): URL {
  return new URL(`public/_build/${relativePath}`, HOMEPAGE_ROOT);
}

type JsonValue = unknown;

function readJson(relativePath: string): JsonValue {
  const fileUrl = resolveArtifact(relativePath);
  const deno = (globalThis as { Deno?: { readTextFileSync(path: string | URL): string } }).Deno;
  if (!deno?.readTextFileSync) {
    throw new Error("Deno.readTextFileSync is not available in this environment");
  }
  let raw: string;
  try {
    raw = deno.readTextFileSync(fileUrl);
  } catch (error) {
    throw new Error(`Missing build artifact: ${relativePath}`, { cause: error });
  }
  return JSON.parse(raw);
}

function ensureArray(value: JsonValue, name: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
  return value;
}

function main() {
  const docsIndex = ensureArray(readJson("docs_index.json"), "docs_index.json");
  if (docsIndex.length === 0) {
    throw new Error("docs_index.json is empty");
  }
  if (docsIndex.some((doc) => typeof (doc as { slug?: unknown }).slug !== "string" || !(doc as { slug?: string }).slug)) {
    throw new Error("docs_index.json contains entries without slug");
  }

  const cloudIac = readJson("cloud_iac_index.json") as { providers?: JsonValue; services?: JsonValue };
  const providers = ensureArray(cloudIac.providers, "cloud_iac_index.providers");
  const services = ensureArray(cloudIac.services, "cloud_iac_index.services");
  if (providers.length === 0) {
    throw new Error("cloud_iac_index.providers is empty");
  }
  if (services.length === 0) {
    throw new Error("cloud_iac_index.services is empty");
  }

  const docsPaths = ensureArray(readJson("docs_paths.json"), "docs_paths.json");
  if (docsPaths.length === 0) {
    throw new Error("docs_paths.json is empty");
  }

  console.log("[check-build] All build artifacts look good.");
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error("[check-build] validation failed:", error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
