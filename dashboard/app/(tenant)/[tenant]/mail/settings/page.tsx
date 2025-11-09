export const dynamic = 'error'

import MailSettings from '../../../../components/mail/MailSettings'

type PageProps = {
  params: Promise<{
    tenant: string
  }>
}

export default async function MailSettingsPage({ params }: PageProps) {
  const { tenant } = await params
  return <MailSettings tenantId={tenant} />
}
