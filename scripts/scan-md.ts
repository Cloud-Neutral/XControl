import { ensureDir } from "@std/fs@^1.0.4/ensure-dir.ts";
import { dirname, join, resolve } from "@std/path@^1.0.6/mod.ts";
import { fromFileUrl } from "@std/path@^1.0.6/from-file-url.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const HOMEPAGE_ROOT = join(PROJECT_ROOT, "ui", "homepage");

const CONTENT_DIR = join(HOMEPAGE_ROOT, "content");
const OUTPUT_PATH = join(HOMEPAGE_ROOT, "public", "_build", "docs_index.json");

type DocEntry = {
  slug: string;
  title: string;
  description: string;
  updatedAt: string;
  pathSegments: string[];
};

function extractTitle(lines: string[], fallback: string): string {
  const heading = lines.find((line) => /^#\s+/.test(line));
  if (!heading) return fallback;
  return heading.replace(/^#\s+/, "").trim() || fallback;
}

function extractDescription(lines: string[], title: string): string {
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^#\s+/.test(trimmed)) {
      continue;
    }
    return trimmed;
  }
  return `${title}.`;
}

async function readMarkdownFile(entry: Deno.DirEntry): Promise<DocEntry | null> {
  if (!entry.isFile || !entry.name.endsWith(".md")) return null;
  const slug = entry.name.replace(/\.md$/, "");
  const filePath = join(CONTENT_DIR, entry.name);

  const [source, stats] = await Promise.all([
    Deno.readTextFile(filePath),
    Deno.stat(filePath),
  ]);
  const lines = source.split(/\r?\n/);
  const title = extractTitle(lines, slug);
  const description = extractDescription(lines, title);

  return {
    slug,
    title,
    description,
    updatedAt: stats.mtime?.toISOString() ?? new Date().toISOString(),
    pathSegments: slug.split("/").filter(Boolean),
  };
}

async function collectDocs(): Promise<DocEntry[]> {
  try {
    const entries: DocEntry[] = [];
    for await (const entry of Deno.readDir(CONTENT_DIR)) {
      const doc = await readMarkdownFile(entry);
      if (doc) {
        entries.push(doc);
      }
    }
    return entries.sort((a, b) => a.slug.localeCompare(b.slug));
  } catch (error) {
    console.warn("[scan-md] Unable to scan markdown directory:", error);
    return [];
  }
}

async function main() {
  await ensureDir(dirname(OUTPUT_PATH));
  const docs = await collectDocs();
  await Deno.writeTextFile(OUTPUT_PATH, JSON.stringify(docs, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("[scan-md] failed:", error);
    Deno.exit(1);
  });
}
