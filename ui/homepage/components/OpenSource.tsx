'use client'
import { useLanguage } from '../i18n/LanguageProvider'
import { translations } from '../i18n/translations'

const projects = [
  {
    name: 'XCloudFlow',
    desc: {
      en: 'Multi-cloud IaC engine built with Pulumi SDK and Go.',
      zh: '基于 Pulumi SDK 和 Go 构建的多云 IaC 引擎。',
    },
    link: 'https://github.com/svc-design/XCloudFlow',
  },
  {
    name: 'KubeGuard',
    desc: {
      en: 'Kubernetes cluster application and node-level backup system.',
      zh: 'Kubernetes 集群应用与节点级备份系统。',
    },
    link: 'https://github.com/svc-design/KubeGuard',
  },
  {
    name: 'XConfig',
    desc: {
      en: 'Lightweight task execution & configuration orchestration engine.',
      zh: '轻量级任务执行与配置编排引擎。',
    },
    link: 'https://github.com/svc-design/XConfig',
  },
  {
    name: 'XCodeAgent',
    desc: {
      en: 'AI-driven GitHub Issue to Pull Request generator and code patching tool.',
      zh: 'AI 驱动的 GitHub Issue 自动转 PR 与代码补丁工具。',
    },
    link: 'https://github.com/svc-design/XCodeAgent',
  },
  {
    name: 'XOpsAgent',
    desc: {
      en: 'AIOps-powered intelligent monitoring, anomaly detection and RCA.',
      zh: 'AIOps 智能监控、异常检测与根因分析。',
    },
    link: 'https://github.com/svc-design/XOpsAgent',
  },
  {
    name: 'XStream',
    desc: {
      en: 'Cross-border developer proxy accelerator for global accessibility.',
      zh: '跨境开发者代理加速器，全球访问更高效。',
    },
    link: 'https://github.com/svc-design/Xstream',
  },
]

export default function OpenSource() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <section id="open-sources" className="py-20 bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">{t.openSourceTitle}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <div key={p.name} className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-2">{p.name}</h3>
              <p className="text-gray-400 mb-4">{p.desc[language]}</p>
              <a
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 underline hover:text-blue-300"
              >
                GitHub →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
