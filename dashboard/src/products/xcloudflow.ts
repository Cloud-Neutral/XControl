import type { ProductConfig } from './registry'

const xcloudflow: ProductConfig = {
  slug: 'xcloudflow',
  name: 'XCloudFlow',
  title: 'XCloudFlow — 多云工作流与自动化平台',
  title_en: 'XCloudFlow — Multi-cloud Workflow Automation',
  tagline_zh: '统一调度跨云资源，内置 AI 协作与合规审计。',
  tagline_en: 'Coordinate multi-cloud workloads with AI assistance and governance built in.',
  ogImage: 'https://www.svc.plus/assets/og/xcloudflow.png',
  repoUrl: 'https://github.com/Cloud-Neutral/XCloudFlow',
  docsQuickstart: 'https://www.svc.plus/xcloudflow/docs/quickstart',
  docsApi: 'https://www.svc.plus/xcloudflow/docs/api',
  docsIssues: 'https://github.com/Cloud-Neutral/XCloudFlow/issues',
  blogUrl: 'https://www.svc.plus/blog/tags/xcloudflow',
  videosUrl: 'https://www.svc.plus/videos/xcloudflow',
  downloadUrl: 'https://www.svc.plus/xcloudflow/downloads',
  editions: {
    selfhost: [
      {
        label: 'Terraform 模块',
        href: 'https://github.com/Cloud-Neutral/XCloudFlow/tree/main/deploy/terraform',
        external: true,
      },
      {
        label: '离线安装包',
        href: 'https://www.svc.plus/xcloudflow/downloads',
        external: true,
      },
    ],
    managed: [
      {
        label: '专业托管',
        href: 'https://www.svc.plus/contact?product=xcloudflow',
        external: true,
      },
    ],
    paygo: [
      {
        label: '按量计费',
        href: 'https://www.svc.plus/pricing/xcloudflow',
        external: true,
      },
    ],
    saas: [
      {
        label: '团队订阅',
        href: 'https://www.svc.plus/xcloudflow/signup',
        external: true,
      },
    ],
  },
  features: {
    zh: [
      {
        title: '多云蓝图编排',
        description: '跨公有云与私有云的资源模型统一建模，一次定义多环境复用。',
        icon: 'cloud',
      },
      {
        title: 'GitOps 流水线',
        description: '将基础设施交付纳入 Git 审批与回滚流程，自动推进部署。',
        icon: 'gitBranch',
      },
      {
        title: '策略与合规',
        description: '内置策略扫描与准入控制，确保资源变更符合监管要求。',
        icon: 'shieldCheck',
      },
      {
        title: '成本可视化',
        description: '实时跟踪多云资源使用与成本分摊，辅助优化预算。',
        icon: 'coins',
      },
    ],
    en: [
      {
        title: 'Multi-cloud blueprints',
        description: 'Model infrastructure once and reuse across public and private clouds.',
        icon: 'cloud',
      },
      {
        title: 'GitOps pipelines',
        description: 'Bring infrastructure delivery into Git reviews with automated rollouts.',
        icon: 'gitBranch',
      },
      {
        title: 'Policy & compliance',
        description: 'Built-in policy checks and admission controls enforce governance at deploy time.',
        icon: 'shieldCheck',
      },
      {
        title: 'Cost visibility',
        description: 'Track multi-cloud spend and allocations in real time to optimize budgets.',
        icon: 'coins',
      },
    ],
  },
}

export default xcloudflow
