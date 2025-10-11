import { ensureDir } from "jsr:@std/fs@^1.0.4/ensure-dir";
import { dirname, join, resolve } from "jsr:@std/path@^1.0.6";
import { fromFileUrl } from "jsr:@std/path@^1.0.6/from-file-url";

import { CATALOG, PROVIDERS } from "../ui/homepage/lib/iac/catalog";
import type { ProviderKey } from "../ui/homepage/lib/iac/types";
import type { DirListing } from "../ui/homepage/types/download";

const __dirname = dirname(fromFileUrl(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const HOMEPAGE_ROOT = join(PROJECT_ROOT, "ui", "homepage");
const OUTPUT_DIR = join(HOMEPAGE_ROOT, "public", "_build");

function unique<T>(items: Iterable<T>): T[] {
  return Array.from(new Set(items));
}

function buildCloudIacIndex() {
  const providers = PROVIDERS.map((provider) => ({ key: provider.key, label: provider.label }));

  const services: { provider: ProviderKey; service: string; category: string }[] = [];
  for (const category of CATALOG) {
    if (!category.iac) continue;
    for (const [provider, integration] of Object.entries(category.iac)) {
      if (!integration || typeof integration.detailSlug !== "string") continue;
      services.push({
        provider: provider as ProviderKey,
        service: integration.detailSlug,
        category: category.key,
      });
    }
  }

  services.sort((a, b) => {
    if (a.provider === b.provider) return a.service.localeCompare(b.service);
    return a.provider.localeCompare(b.provider);
  });

  return { providers, services };
}

async function loadDownloadManifest(): Promise<DirListing[]> {
  const manifestPath = join(HOMEPAGE_ROOT, "public", "dl-index", "all.json");
  try {
    const raw = await Deno.readTextFile(manifestPath);
    const parsed = JSON.parse(raw) as DirListing[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.warn("[export-slugs] Unable to read download manifest:", error);
    return [];
  }
}

function extractDownloadPaths(listings: DirListing[]): string[] {
  const paths: string[] = [];
  for (const listing of listings) {
    if (!listing || typeof listing.path !== "string") continue;
    const trimmed = listing.path.replace(/\/+$/g, "");
    if (trimmed.length > 0) {
      paths.push(trimmed);
    }
  }
  return unique(paths).sort();
}

async function main() {
  await ensureDir(OUTPUT_DIR);

  const cloudIacIndex = buildCloudIacIndex();
  const downloadListings = await loadDownloadManifest();
  const downloadPaths = extractDownloadPaths(downloadListings);

  await Deno.writeTextFile(
    join(OUTPUT_DIR, "cloud_iac_index.json"),
    JSON.stringify(cloudIacIndex, null, 2),
  );

  await Deno.writeTextFile(
    join(OUTPUT_DIR, "docs_paths.json"),
    JSON.stringify(downloadPaths, null, 2),
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("[export-slugs] failed:", error);
    Deno.exit(1);
  });
}
