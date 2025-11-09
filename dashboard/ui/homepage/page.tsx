'use client'

import clsx from 'clsx'

import Features from '@components/Features'
import OpenSource from '@components/OpenSource'
import DownloadSection from '@components/DownloadSection'
import CommunityFeed from '@components/home/CommunityFeed'
import { designTokens } from '@theme/designTokens'

import { useLanguage } from '../../i18n/LanguageProvider'

const heroContent = {
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
        description: '以声明式 IaC 驱动跨云交付流程，内建审批、审计与合规校验，保障变更可控。',
      },
      {
        label: 'XScoveHub',
        headline: '可观测与智能协同',
        description: '统一指标、日志、链路与事件流，AI 助理联动诊断与响应，缩短故障恢复时间。',
      },
      {
        label: 'XStream',
        headline: '安全与合规自动化',
        description: '策略即代码将安全基线嵌入流水线，持续评估风险并生成可追溯的合规报告。',
      },
      {
        label: 'XBoard',
        headline: '平台体验与工作流',
        description: '统一门户连接角色、权限、成本与协作，帮助平台团队构建一致的交付体验。',
      },
    ],
  },
  en: {
    eyebrow: 'Cloud-Neutral',
    title: 'Build a Cloud-Neutral cloud operations fabric',
    description:
      'Unify governance, automation, and observability so teams can manage complex multi-cloud estates with clarity.',
    focusAreas: ['Unified multi-cloud governance', 'Automated security & compliance', 'Observability with intelligent workflows'],
    products: [
      {
        label: 'XCloudFlow',
        headline: 'Multi-cloud automation & GitOps orchestration',
        description: 'Drive declarative IaC workflows with approvals, audit trails, and guardrails built in from day one.',
      },
      {
        label: 'XScoveHub',
        headline: 'Observability & intelligent collaboration',
        description: 'Correlate metrics, logs, traces, and events while AI copilots coordinate diagnosis and remediation.',
      },
      {
        label: 'XStream',
        headline: 'Security & compliance automation',
        description: 'Embed policy-as-code controls into every release to surface risks early and keep evidence auditable.',
      },
      {
        label: 'XBoard',
        headline: 'Platform experience & workflows',
        description: 'Connect roles, permissions, costs, and collaboration in a unified workspace for platform teams.',
      },
    ],
  },
}

export default function Homepage() {
  const { language } = useLanguage()
  const content = heroContent[language]

  return (
    <main className="relative flex min-h-screen flex-col bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
      <section className="relative isolate overflow-hidden py-20 sm:py-24">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-36 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="absolute top-1/2 right-10 h-80 w-80 -translate-y-1/2 rounded-full bg-indigo-200/30 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-sky-100/40 blur-3xl" />
        </div>
        <div className={clsx('relative', designTokens.layout.container)}>
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-5 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-sky-700 shadow-sm">
              {content.eyebrow}
            </span>
            <div className="space-y-6">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                <span className="bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
                  {content.title}
                </span>
              </h1>
              <p className="text-lg leading-relaxed text-slate-600 sm:text-xl">{content.description}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 text-sm font-medium text-sky-700">
              {content.focusAreas.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center rounded-full border border-sky-200/80 bg-sky-50/70 px-4 py-2 shadow-sm"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="grid w-full gap-4 sm:grid-cols-2 lg:gap-6">
              {content.products.map((product) => (
                <article
                  key={product.label}
                  className="rounded-2xl border border-brand-border/60 bg-white/80 p-6 text-left shadow-sm backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-600">{product.label}</span>
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">{product.headline}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{product.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
      <Features variant="homepage" />
      <CommunityFeed />
      <OpenSource variant="homepage" />
      <DownloadSection variant="homepage" />
    </main>
  )
}
