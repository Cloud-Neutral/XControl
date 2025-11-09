export const dynamic = 'error'

import ComposeForm from '../../../../components/mail/ComposeForm'

type PageProps = {
  params: Promise<{
    tenant: string
  }>
}

export default async function ComposePage({ params }: PageProps) {
  const { tenant } = await params
  return <ComposeForm tenantId={tenant} />
}
