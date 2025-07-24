'use client'
import { useLanguage } from '../i18n/LanguageProvider'
import { translations } from '../i18n/translations'

const features = [
  {
    icon: '🛠️',
    title: {
      en: 'XCloudFlow - Multi-Cloud IaC',
      zh: 'XCloudFlow - 多云 IaC',
    },
    desc: {
      en: 'Provision cloud resources across AWS, GCP, Azure, and Kubernetes using Golang with Pulumi SDK, fully integrated into CI/CD pipelines.',
      zh: '使用 Golang 和 Pulumi SDK 跨 AWS、GCP、Azure 与 Kubernetes 统一部署云资源，完美集成 CI/CD 流水线。',
    },
  },
  {
    icon: '🔐',
    title: {
      en: 'KubeGuard - Kubernetes Backup',
      zh: 'KubeGuard - Kubernetes 备份',
    },
    desc: {
      en: 'Velero + Rsync combined solution for full-stack Kubernetes application & node data backup, fast restore, and cluster migration.',
      zh: '结合 Velero 与 Rsync 实现 Kubernetes 应用与节点数据完整备份、快速恢复与集群迁移。',
    },
  },
  {
    icon: '📦',
    title: {
      en: 'XConfig - Configuration Orchestration',
      zh: 'XConfig - 配置编排',
    },
    desc: {
      en: 'YAML Playbook driven configuration delivery and task orchestration, optimized for bare metal, edge nodes and hybrid clusters.',
      zh: '基于 YAML Playbook 驱动的配置交付与任务编排，适配裸金属、边缘节点与混合集群。',
    },
  },
  {
    icon: '🤖',
    title: {
      en: 'XCodeAgent - AI Code Assistant',
      zh: 'XCodeAgent - AI 代码助手',
    },
    desc: {
      en: 'Automatically generate PRs from GitHub Issues via AI-powered patch generation, code review and testing automation.',
      zh: '通过 AI 驱动的补丁生成、代码审查与测试自动化，从 GitHub Issue 自动生成 PR。',
    },
  },
  {
    icon: '📊',
    title: {
      en: 'XOpsAgent - AIOps Assistant',
      zh: 'XOpsAgent - AIOps 助手',
    },
    desc: {
      en: 'Monitor system metrics, detect anomalies, perform root cause analysis, and generate intelligent operational insights.',
      zh: '监控系统指标，检测异常，执行根因分析，生成智能运维洞察。',
    },
  },
  {
    icon: '🚀',
    title: {
      en: 'XStream - Network Accelerator',
      zh: 'XStream - 网络加速器',
    },
    desc: {
      en: 'Cross-border developer proxy built with VLESS+gRPC to ensure fast, stable access to GitHub, DockerHub, AI models and global resources.',
      zh: '基于 VLESS+gRPC 的跨境开发者代理，确保稳定快速访问 GitHub、DockerHub、AI 模型与全球资源。',
    },
  },
]

export default function Features() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <section id="features" className="py-20 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">{t.featuresTitle}</h2>
          <p className="text-gray-400">{t.featuresSubtitle}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{f.title[language]}</h3>
              <p className="text-gray-400">{f.desc[language]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
