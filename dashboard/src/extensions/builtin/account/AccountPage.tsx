import UserOverview from '../dashboard/UserOverview'
import MfaSetupPanel from './MfaSetupPanel'

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <UserOverview />
      <MfaSetupPanel />
    </div>
  )
}
