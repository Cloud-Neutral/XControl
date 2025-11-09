export const dynamic = 'error'

import MailDashboard from '../../../components/mail/MailDashboard'

type PageProps = {
  params: Promise<{
    tenant: string
  }>
}

export default async function TenantMailPage({ params }: PageProps) {
  const { tenant } = await params
  return <MailDashboard tenantId={tenant} tenantName={tenant} />
}
