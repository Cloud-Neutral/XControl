import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BellRing,
  Brain,
  Cloud,
  Coins,
  Database,
  GitBranch,
  Puzzle,
  Rocket,
  Shield,
  ShieldCheck,
} from 'lucide-react'

import type { FeatureCopySet, FeatureIconName, ProductConfig } from '@src/products/registry'

type ProductFeaturesProps = {
  config: ProductConfig
  lang: 'zh' | 'en'
}

const ICON_MAP: Record<FeatureIconName, LucideIcon> = {
  activity: Activity,
  bellRing: BellRing,
  brain: Brain,
  cloud: Cloud,
  coins: Coins,
  database: Database,
  gitBranch: GitBranch,
  puzzle: Puzzle,
  rocket: Rocket,
  shield: Shield,
  shieldCheck: ShieldCheck,
}

const FALLBACK_ICON: FeatureIconName = 'rocket'

const DEFAULT_FEATURES: FeatureCopySet = {
  zh: [
    {
      title: '极速连接',
      description: '智能就近接入、跨区域中转，降低首包延迟与抖动。',
      icon: 'rocket',
    },
    {
      title: '安全加密',
      description: '端到端加密与最小暴露面设计，确保数据安全。',
      icon: 'shield',
    },
    {
      title: 'AI 优化',
      description: '基于实时指标进行路径自适应选择，持续调优。',
      icon: 'brain',
    },
    {
      title: '实时监控',
      description: '内置观测、告警与审计，掌握全链路健康。',
      icon: 'activity',
    },
  ],
  en: [
    {
      title: 'Speed',
      description: 'Smart ingress and inter-region hops reduce latency and jitter.',
      icon: 'rocket',
    },
    {
      title: 'Security',
      description: 'End-to-end encryption with minimal exposure surfaces.',
      icon: 'shield',
    },
    {
      title: 'AI Optimization',
      description: 'Adaptive routing powered by live telemetry and policy controls.',
      icon: 'brain',
    },
    {
      title: 'Live Metrics',
      description: 'Embedded observability, alerting, and auditing end to end.',
      icon: 'activity',
    },
  ],
}

export default function ProductFeatures({ config, lang }: ProductFeaturesProps) {
  const featureSet = config.features ?? DEFAULT_FEATURES
  const items = featureSet[lang]?.length ? featureSet[lang] : DEFAULT_FEATURES[lang]
  const intro =
    lang === 'zh'
      ? `${config.name} 的核心能力组合，帮助团队快速落地。`
      : `Key capabilities from ${config.name} to help your team ship faster.`

  return (
    <section id="features" aria-labelledby="features-title" className="py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="max-w-2xl">
          <h2 id="features-title" className="text-3xl font-bold text-slate-900">
            {lang === 'zh' ? '核心功能' : 'Core Features'}
          </h2>
          <p className="mt-2 text-slate-600">{intro}</p>
        </header>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ title, description, icon }) => {
            const Icon = ICON_MAP[icon ?? FALLBACK_ICON] ?? ICON_MAP[FALLBACK_ICON]
            return (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <Icon className="h-6 w-6 text-brand-dark" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{description}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
