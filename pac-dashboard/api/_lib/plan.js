// PAC-151: fonte unica per lo stato del piano utente (sostituisce config.is_pro)

export async function getUserPlan(adminClient, userId) {
  const { data, error } = await adminClient
    .from('subscription_plan')
    .select('plan, status')
    .eq('user_id', userId)
    .maybeSingle()

  const plan = data?.plan ?? 'FREE'
  const status = data?.status ?? 'active'
  const isPro = plan === 'PRO' && status === 'active'

  return { plan, status, isPro, error }
}
