import { ensureDir } from "@std/fs@^1.0.4/ensure-dir.ts";
import { dirname, join, resolve } from "@std/path@^1.0.6/mod.ts";
import { fromFileUrl } from "@std/path@^1.0.6/from-file-url.ts";

import type { DirEntry, DirListing } from "../types/download";

const __dirname = dirname(fromFileUrl(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const HOMEPAGE_ROOT = join(PROJECT_ROOT, "ui", "homepage");

function resolveBaseUrl(): string {
  const raw = Deno.env.get("DL_BASE") ?? "https://dl.svc.plus/";
  return raw.replace(/\/+$/g, "/");
}

async function crawl(rel: string, base: string): Promise<DirListing[]> {
  const url = base + rel;
  const res = await fetch(url + "index.json");
  if (!res.ok) throw new Error(`failed to fetch ${url}: ${res.status}`);
  const entries = (await res.json()) as DirEntry[];
  const listing: DirListing = { path: rel, entries };
  const all: DirListing[] = [listing];
  for (const entry of entries) {
    if (entry.type === "dir") {
      const childRel = rel + entry.name + "/";
      const child = await crawl(childRel, base);
      all.push(...child);
    }
  }
  return all;
}

async function main() {
  const base = resolveBaseUrl();
  const listings = await crawl("", base);
  const top = listings.find((item) => item.path === "");
  const sections = top
    ? top.entries
        .filter((item) => item.type === "dir")
        .map((item) => ({
          key: item.name,
          title: item.name,
          href: "/" + item.name + "/",
          lastModified: item.lastModified,
          count: undefined,
        }))
    : [];

  const outDir = join(HOMEPAGE_ROOT, "public", "dl-index");
  await ensureDir(outDir);
  await Deno.writeTextFile(join(outDir, "all.json"), JSON.stringify(listings, null, 2));
  await Deno.writeTextFile(join(outDir, "top.json"), JSON.stringify(sections, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.warn("[fetch-dl-index] skipped due to error:", error);
  });
}
