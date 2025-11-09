/**
 * Homepage - Fresh + Deno
 *
 * Main landing page with CMS template or markdown content support
 */

import { Head } from '$fresh/runtime.ts'
import { Handlers, PageProps } from '$fresh/server.ts'
import { FreshState } from '@/middleware.ts'
import { isFeatureEnabled } from '@/lib/featureToggles.ts'
import { renderMarkdownFile } from '@/api/render-markdown.ts'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts'

// Import Islands for client-side interactivity
import Navbar from '@/islands/Navbar.tsx'
import AskAIButton from '@/islands/AskAIButton.tsx'
// import ShowcaseCarousel from '@/islands/home/ShowcaseCarousel.tsx'

// Supported languages
type Language = 'zh' | 'en'

interface MarkdownSection {
  id: string
  title: string
  html: string
  meta: Record<string, unknown>
}

interface HomePageData {
  language: Language
  sections: {
    operations: MarkdownSection
    productSpotlight: MarkdownSection
    news: MarkdownSection
    support: MarkdownSection
    community: MarkdownSection
    resources: MarkdownSection
  }
  cmsEnabled: boolean
  user: { username?: string; email?: string } | null
}

interface ParsedHighlight {
  html: string
}

interface ProductCard {
  title: string
  bodyHtml: string
}

// Define section paths for different languages
const SECTION_PATHS: Record<Language, Record<string, string>> = {
  zh: {
    operations: 'homepage/zh/operations.md',
    productSpotlight: 'homepage/zh/products.md',
    news: 'homepage/zh/news.md',
    support: 'homepage/zh/support.md',
    community: 'homepage/zh/community.md',
    resources: 'homepage/zh/resources.md',
  },
  en: {
    operations: 'homepage/en/operations.md',
    productSpotlight: 'homepage/en/products.md',
    news: 'homepage/en/news.md',
    support: 'homepage/en/support.md',
    community: 'homepage/en/community.md',
    resources: 'homepage/en/resources.md',
  },
}

const DEFAULT_LANGUAGE: Language = 'zh'

const HERO_COPY: Record<
  Language,
  {
    eyebrow: string
    title: string
    description: string
    focusAreas: string[]
    products: { label: string; headline: string; description: string }[]
  }
> = {
  zh: {
    eyebrow: 'Cloud-Neutral',
    title: '构建一体化的 Cloud-Neutral 云原生生态',
    description:
      '通过统一治理、自动化与可观测能力，连接团队、工具与环境，让企业以更简洁的方式管理复杂的多云栈。',
    focusAreas: ['跨云统一治理', '安全与合规自动化', '可观测与智能协同'],
    products: [
      {
        label: 'XCloudFlow',
        headline: '多云自动化与 GitOps 编排',
        description: '以声明式 IaC 推动跨云交付，内置审批、审计与合规校验，帮助团队稳健演进。',
      },
      {
        label: 'XScoveHub',
        headline: '可观测与智能协同',
        description: '统一指标、日志、链路与事件流，AI 助理协同诊断、响应与知识沉淀。',
      },
      {
        label: 'XStream',
        headline: '安全与合规自动化',
        description: '策略即代码守护交付流水线，持续评估风险并生成可追溯的合规证据。',
      },
      {
        label: 'XBoard',
        headline: '平台体验与工作流',
        description: '统一门户连接角色、权限、成本与协作，让平台团队交付一致体验。',
      },
    ],
  },
  en: {
    eyebrow: 'Cloud-Neutral',
    title: 'Build a Cloud-Neutral cloud operations fabric',
    description:
      'Bring governance, automation, and observability together so every team can manage multi-cloud complexity with clarity.',
    focusAreas: ['Unified multi-cloud governance', 'Automated security & compliance', 'Observability with intelligent workflows'],
    products: [
      {
        label: 'XCloudFlow',
        headline: 'Multi-cloud automation & GitOps orchestration',
        description: 'Power declarative delivery with built-in approvals, audit history, and policy checks across environments.',
      },
      {
        label: 'XScoveHub',
        headline: 'Observability & intelligent collaboration',
        description: 'Connect metrics, logs, traces, and events while AI copilots assist incident diagnosis and resolution.',
      },
      {
        label: 'XStream',
        headline: 'Security & compliance automation',
        description: 'Embed policy-as-code guardrails into every release to surface risk early and simplify evidence collection.',
      },
      {
        label: 'XBoard',
        headline: 'Platform experience & workflows',
        description: 'Unify roles, permissions, costs, and collaboration inside a single workspace for platform teams.',
      },
    ],
  },
}

// DOM Node type constants for deno_dom compatibility
const ELEMENT_NODE = 1
const TEXT_NODE = 3

async function loadMarkdownSection(path: string, id: string): Promise<MarkdownSection> {
  try {
    const result = await renderMarkdownFile(path)
    return {
      id,
      title: (result.meta.title as string) || '',
      html: result.html,
      meta: result.meta,
    }
  } catch (error) {
    console.error(`Failed to load section ${id} from ${path}:`, error)
    return {
      id,
      title: 'Content Unavailable',
      html: '<p>Failed to load content.</p>',
      meta: {},
    }
  }
}

function parseHtmlDocument(html: string) {
  if (!html) {
    return null
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    return doc
  } catch (error) {
    console.warn('Failed to parse HTML content for homepage section', error)
    return null
  }
}

function extractHeroContent(section: MarkdownSection): {
  heading: string
  paragraphs: string[]
  highlights: ParsedHighlight[]
} {
  const doc = parseHtmlDocument(section.html)
  const paragraphs = doc
    ? Array.from(doc.querySelectorAll('p'))
        .map((paragraph) => paragraph.innerHTML.trim())
        .filter((content) => content.length > 0)
    : []

  const highlights: ParsedHighlight[] = doc
    ? Array.from(doc.querySelectorAll('li'))
        .map((item) => ({ html: item.innerHTML.trim() }))
        .filter((item) => item.html.length > 0)
    : []

  const fallbackHeading = doc?.querySelector('h1, h2')?.textContent?.trim()

  return {
    heading: section.title || fallbackHeading || '',
    paragraphs,
    highlights,
  }
}

function extractProductCards(section: MarkdownSection): ProductCard[] {
  const doc = parseHtmlDocument(section.html)
  if (!doc) {
    return []
  }

  return Array.from(doc.querySelectorAll('h3'))
    .map((heading) => {
      const fragments: string[] = []
      let sibling: ChildNode | null = heading.nextSibling

      while (sibling) {
        if (sibling.nodeType === ELEMENT_NODE && (sibling as Element).tagName === 'H3') {
          break
        }

        if (sibling.nodeType === ELEMENT_NODE) {
          fragments.push((sibling as Element).outerHTML)
        } else if (sibling.nodeType === TEXT_NODE) {
          const textContent = sibling.textContent?.trim()
          if (textContent) {
            fragments.push(textContent)
          }
        }

        sibling = sibling.nextSibling
      }

      return {
        title: heading.textContent?.trim() ?? '',
        bodyHtml: fragments.join('').trim(),
      }
    })
    .filter((card) => card.title.length > 0 || card.bodyHtml.length > 0)
}

function extractListHighlights(html: string): ParsedHighlight[] {
  const doc = parseHtmlDocument(html)
  if (!doc) {
    return []
  }

  return Array.from(doc.querySelectorAll('li'))
    .map((item) => ({ html: item.innerHTML.trim() }))
    .filter((item) => item.html.length > 0)
}

export const handler: Handlers<HomePageData, FreshState> = {
  async GET(req, ctx) {
    // Check if CMS experience is enabled
    const cmsEnabled = isFeatureEnabled('cmsExperience', '/homepage/dynamic')

    // Get language from query param or use default
    const url = new URL(req.url)
    const langParam = url.searchParams.get('lang')
    const language: Language = (langParam === 'en' || langParam === 'zh') ? langParam : DEFAULT_LANGUAGE

    const sectionPaths = SECTION_PATHS[language]

    // Load all markdown sections in parallel
    const [operations, productSpotlight, news, support, community, resources] = await Promise.all([
      loadMarkdownSection(sectionPaths.operations, 'operations'),
      loadMarkdownSection(sectionPaths.productSpotlight, 'productSpotlight'),
      loadMarkdownSection(sectionPaths.news, 'news'),
      loadMarkdownSection(sectionPaths.support, 'support'),
      loadMarkdownSection(sectionPaths.community, 'community'),
      loadMarkdownSection(sectionPaths.resources, 'resources'),
    ])

    return ctx.render({
      language,
      sections: {
        operations,
        productSpotlight,
        news,
        support,
        community,
        resources,
      },
      cmsEnabled,
      user: ctx.state.user || null,
    })
  },
}

export default function HomePage({ data }: PageProps<HomePageData>) {
  const { sections, language, cmsEnabled, user } = data

  const heroContent = extractHeroContent(sections.operations)
  const productCards = extractProductCards(sections.productSpotlight)
  const newsHighlights = extractListHighlights(sections.news.html)
  const supportHighlights = extractListHighlights(sections.support.html)
  const communityHighlights = extractListHighlights(sections.community.html)
  const resourcesHighlights = extractListHighlights(sections.resources.html)
  const shouldFallbackHero = heroContent.paragraphs.length === 0 && heroContent.highlights.length === 0
  const hero = HERO_COPY[language]

  return (
    <>
      <Head>
        <title>云原生套件 - Cloud-Neutral</title>
        <meta
          name="description"
          content="构建一体化的云原生工具集，融合基础设施即代码（IaC）、GitOps 理念与可观测体系"
        />
      </Head>

      {/* Fixed Navbar with translucent background */}
      <Navbar language={language} user={user} pathname="/" />

      {/* Main Content with offset for fixed navbar */}
      <main
        class="relative flex flex-col bg-gradient-to-br from-sky-50 via-indigo-50/30 to-white text-slate-900"
        style="padding-top: var(--app-shell-nav-offset, 4rem)"
      >
        {/* Hero Section - Improved Design */}
        <header class="relative isolate overflow-hidden py-20 sm:py-24">
          <div class="pointer-events-none absolute inset-0 overflow-hidden">
            <div class="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-200/35 blur-3xl" />
            <div class="absolute top-1/2 right-10 h-80 w-80 -translate-y-1/2 rounded-full bg-indigo-200/25 blur-3xl" />
            <div class="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-sky-100/40 blur-3xl" />
          </div>

          <div class="relative px-4 sm:px-6 lg:px-8">
            <div class="mx-auto w-full max-w-6xl">
              {shouldFallbackHero ? (
                <div
                  class="rounded-3xl border border-sky-200/50 bg-white/80 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.08)] backdrop-blur-lg sm:p-10 lg:p-12 prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: sections.operations.html }}
                />
              ) : (
                <div class="flex flex-col items-center gap-10 rounded-3xl border border-sky-200/40 bg-white/80 p-10 text-center shadow-[0_30px_80px_rgba(0,0,0,0.08)] backdrop-blur-lg sm:p-12">
                  <span class="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-5 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-sky-700 shadow-sm">
                    {hero.eyebrow}
                  </span>
                  <div class="space-y-6">
                    <h1 class="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                      <span class="bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
                        {hero.title}
                      </span>
                    </h1>
                    <p class="text-lg leading-relaxed text-slate-600 sm:text-xl">{hero.description}</p>
                  </div>
                  <div class="flex flex-wrap justify-center gap-3 text-sm font-medium text-sky-700">
                    {hero.focusAreas.map((item) => (
                      <span
                        key={item}
                        class="inline-flex items-center rounded-full border border-sky-200/80 bg-sky-50/70 px-4 py-2 shadow-sm"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                  <div class="grid w-full gap-4 sm:grid-cols-2 lg:gap-6">
                    {hero.products.map((product) => (
                      <article
                        key={product.label}
                        class="rounded-2xl border border-sky-200/70 bg-white/85 p-6 text-left shadow-sm backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                      >
                        <span class="text-xs font-semibold uppercase tracking-[0.32em] text-sky-600">{product.label}</span>
                        <h2 class="mt-3 text-lg font-semibold text-slate-900">{product.headline}</h2>
                        <p class="mt-3 text-sm leading-relaxed text-slate-600">{product.description}</p>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Showcase Carousel - New Interactive Section */}
        {/* <ShowcaseCarousel /> */}

        {/* Main Content Sections */}
        <section class="relative isolate py-20 sm:py-24">
          <div class="absolute inset-x-0 top-0 h-px bg-brand-border/70" aria-hidden />
          <div class="relative px-4 sm:px-6 lg:px-8">
            <div class="mx-auto w-full max-w-6xl">
              <div class="grid gap-12 xl:grid-cols-[minmax(0,2fr)_320px] xl:items-start xl:gap-14">
                <div class="space-y-12">
                  <section class="rounded-3xl border border-brand-border bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
                    {sections.productSpotlight.title && (
                      <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 class="text-2xl font-semibold text-brand-navy">
                          {sections.productSpotlight.title}
                        </h2>
                        <a
                          href="/docs"
                          class="inline-flex items-center text-sm font-semibold text-brand transition hover:text-brand-dark"
                        >
                          {language === 'zh' ? '查看全部文档 →' : 'Browse documentation →'}
                        </a>
                      </header>
                    )}
                    {productCards.length > 0 ? (
                      <div class="mt-8 grid gap-6 md:grid-cols-2">
                        {productCards.map((card) => (
                          <div
                            key={card.title}
                            class="flex h-full flex-col gap-4 rounded-2xl border border-brand-border/70 bg-brand-surface/60 p-6"
                          >
                            <h3 class="text-lg font-semibold text-brand-navy">{card.title}</h3>
                            <div
                              class="prose prose-slate max-w-none text-sm text-brand-heading/80 [&_ul]:mt-4 [&_ul]:space-y-2 [&_li]:flex [&_li]:items-start [&_li]:gap-2 [&_li>strong]:text-brand-navy"
                              dangerouslySetInnerHTML={{ __html: card.bodyHtml }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        class="prose prose-slate mt-6 max-w-none text-brand-heading/80"
                        dangerouslySetInnerHTML={{ __html: sections.productSpotlight.html }}
                      />
                    )}
                  </section>

                  <section class="space-y-12">
                    <article class="rounded-3xl border border-brand-border bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                      {sections.news.title && (
                        <h2 class="text-2xl font-semibold text-brand-navy">
                          {sections.news.title}
                        </h2>
                      )}
                      {newsHighlights.length > 0 ? (
                        <ul class="mt-6 space-y-4">
                          {newsHighlights.map((item, index) => (
                            <li
                              key={index}
                              class="rounded-2xl border border-brand-border/70 bg-brand-surface/70 p-5 text-sm text-brand-heading/85 shadow-sm"
                            >
                              <span
                                class="block leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: item.html }}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div
                          class="prose prose-slate mt-6 max-w-none text-brand-heading/80"
                          dangerouslySetInnerHTML={{ __html: sections.news.html }}
                        />
                      )}
                    </article>

                    <article class="rounded-3xl border border-brand-border bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                      {sections.community.title && (
                        <h2 class="text-2xl font-semibold text-brand-navy">
                          {sections.community.title}
                        </h2>
                      )}
                      {communityHighlights.length > 0 ? (
                        <ul class="mt-6 space-y-4">
                          {communityHighlights.map((item, index) => (
                            <li
                              key={index}
                              class="rounded-2xl border border-brand-border/60 bg-brand-surface/60 p-5 text-sm text-brand-heading/85 shadow-sm"
                            >
                              <span
                                class="block leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: item.html }}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div
                          class="prose prose-slate mt-6 max-w-none text-brand-heading/80"
                          dangerouslySetInnerHTML={{ __html: sections.community.html }}
                        />
                      )}
                    </article>
                  </section>
                </div>

                <aside class="flex w-full flex-col gap-10">
                  <article class="rounded-3xl border border-brand-border bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
                    {sections.support.title && (
                      <h2 class="text-xl font-semibold text-brand-navy">
                        {sections.support.title}
                      </h2>
                    )}
                    {supportHighlights.length > 0 ? (
                      <ul class="mt-5 space-y-3 text-sm text-brand-heading/85">
                        {supportHighlights.map((item, index) => (
                          <li key={index} class="flex items-start gap-3 rounded-2xl border border-brand-border/60 bg-brand-surface/50 p-4 shadow-sm">
                            <span class="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand" aria-hidden />
                            <span
                              class="leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: item.html }}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div
                        class="prose prose-slate mt-5 max-w-none text-brand-heading/80"
                        dangerouslySetInnerHTML={{ __html: sections.support.html }}
                      />
                    )}
                  </article>

                  <article class="rounded-3xl border border-brand-border bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
                    {sections.resources.title && (
                      <h2 class="text-xl font-semibold text-brand-navy">
                        {sections.resources.title}
                      </h2>
                    )}
                    {resourcesHighlights.length > 0 ? (
                      <ul class="mt-5 space-y-3 text-sm text-brand-heading/85">
                        {resourcesHighlights.map((item, index) => (
                          <li key={index} class="flex items-start gap-3 rounded-2xl border border-brand-border/60 bg-brand-surface/50 p-4 shadow-sm">
                            <span class="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand" aria-hidden />
                            <span
                              class="leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: item.html }}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div
                        class="prose prose-slate mt-5 max-w-none text-brand-heading/80"
                        dangerouslySetInnerHTML={{ __html: sections.resources.html }}
                      />
                    )}
                  </article>
                </aside>
              </div>
            </div>
          </div>
        </section>

        {/* Debug Info (only in development) */}
        {cmsEnabled && (
          <aside class="mx-auto w-full max-w-6xl px-8 py-4 text-sm text-gray-500">
            <p>
              🚧 CMS Template system is enabled but requires React-to-Preact component migration.
              Currently showing markdown content mode.
            </p>
          </aside>
        )}
      </main>

      {/* Footer */}
      <footer class="bg-brand-navy text-white">
        <div class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-8 py-14">
          <div class="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-[0.32em] text-brand-light/90">
                Cloud-Neutral
              </p>
              <p class="max-w-lg text-sm text-white/70">
                {language === 'zh'
                  ? '企业级云原生团队的统一可观测性、DevOps 和 AI 工作流平台。'
                  : 'Unified observability, DevOps, and AI workflows for enterprise cloud native teams.'
                }
              </p>
              <div class="flex flex-wrap gap-4 text-sm text-white/80">
                <a href="#privacy" class="transition hover:text-brand-light">
                  {language === 'zh' ? '隐私政策' : 'Privacy Policy'}
                </a>
                <a href="#terms" class="transition hover:text-brand-light">
                  {language === 'zh' ? '服务条款' : 'Terms of Service'}
                </a>
                <a href="#contact" class="transition hover:text-brand-light">
                  {language === 'zh' ? '联系我们' : 'Contact Us'}
                </a>
              </div>
            </div>
            <div class="flex flex-col gap-6 text-sm">
              <div class="space-y-2">
                <p class="text-sm font-semibold text-white">GitHub</p>
                <a
                  href="https://github.com/svc-design"
                  class="inline-flex items-center gap-2 text-white/80 transition hover:text-brand-light"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>github.com/svc-design</span>
                </a>
              </div>
              <div class="space-y-2">
                <p class="text-sm font-semibold text-white">
                  {language === 'zh' ? '公众号' : 'WeChat'}
                </p>
                <span class="text-white/80">Cloud-Neutral 官方资讯</span>
              </div>
              <div class="space-y-2">
                <p class="text-sm font-semibold text-white">
                  {language === 'zh' ? '联系方式' : 'Contact'}
                </p>
                <a href="mailto:manbuzhe2008@gmail.com" class="text-white/80 transition hover:text-brand-light">
                  manbuzhe2008@gmail.com
                </a>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2025 Cloud-Neutral. All rights reserved.</span>
            <span>
              {language === 'zh'
                ? '在云原生时代充满信心地构建。'
                : 'Build with confidence in the cloud native era.'
              }
            </span>
          </div>
        </div>
      </footer>

      {/* Floating AskAI Button Island */}
      <AskAIButton language={language} />
    </>
  )
}
