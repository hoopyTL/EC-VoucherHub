const API_BASE = process.env.API_BASE ?? 'http://localhost:4000/api'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@voucherhub.com'

async function request(path, init) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Email': ADMIN_EMAIL
    },
    ...init
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.success) {
    throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${response.status} ${JSON.stringify(payload)}`)
  }
  return payload.data
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  const dashboard = await request('/admin/dashboard')
  assert(typeof dashboard.totals.orders === 'number', 'dashboard must expose order totals')
  assert(typeof dashboard.totals.contentItems === 'number', 'dashboard must expose content totals')
  assert(typeof dashboard.totals.auditLogs === 'number', 'dashboard must expose audit totals')

  const orders = await request('/admin/orders?limit=100')
  assert(Array.isArray(orders.items), 'orders endpoint must return a list')

  const content = await request('/admin/content?limit=100')
  assert(Array.isArray(content.items), 'content endpoint must return a list')

  const created = await request('/admin/content', {
    method: 'POST',
    body: JSON.stringify({
      type: 'announcement',
      title: `TV4 verify ${new Date().toISOString()}`,
      body: 'Created by scripts/verify-tv4.mjs to prove FR-21 and FR-23.',
      status: 'draft'
    })
  })
  assert(created.id, 'content create must return an id')

  const published = await request(`/admin/content/${created.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'published' })
  })
  assert(published.status === 'published', 'content publish must update status')

  const archived = await request(`/admin/content/${created.id}`, { method: 'DELETE' })
  assert(archived.status === 'archived', 'content delete must archive')

  const audit = await request('/admin/audit-logs?limit=100')
  assert(
    audit.items.some((item) => item.entityId === created.id && item.action === 'content.archive'),
    'audit log must include the content archive action'
  )

  console.log('TV4 verification passed.')
  console.log(
    `Dashboard: ${dashboard.totals.orders} orders, ${dashboard.totals.contentItems} content items, ${dashboard.totals.auditLogs} audit logs.`
  )
  console.log(`Created and archived content item: ${created.id}`)
}

main().catch((error) => {
  console.error('TV4 verification failed.')
  console.error(error)
  process.exit(1)
})
