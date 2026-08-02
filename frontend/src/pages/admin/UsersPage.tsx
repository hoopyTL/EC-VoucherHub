/**
 * UsersPage — admin user management (task 14.1).
 *
 * Lists all Customer/Admin and Partner accounts (GET /admin/users), with:
 *   - A search box filtering by name, email, or phone (Req 5.1, 5.2). The query
 *     is submitted to the backend, which matches case-insensitively.
 *   - Lock / unlock action buttons that call PATCH /admin/users/:id/{lock,unlock}
 *     (Req 5.3, 5.4) and refresh the list on success.
 *
 * Users and Partners live in separate backend tables and are returned as two
 * lists under a shared page/limit; this page merges them into one table, tagging
 * each row with its account type. Lock/unlock runs through TanStack Query and
 * invalidates the list so the table reflects authoritative server state.
 *
 * The app shell does not mount a global toast provider, so success/error
 * feedback is rendered as inline `role="alert"`/`role="status"` regions.
 *
 * _Requirements: 5.1, 5.2, 5.3, 5.4_
 */
import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AccountStatus } from '@ui-contracts'
import { getAdminApiError, listUsers, lockUser, unlockUser } from '../../services/admin'
import type { AdminAccount, ListUsersResult } from '../../types/admin'
import { Badge, Button, Input, LoadingSpinner, Modal, Pagination, variantForStatus } from '../../components/ui'
import { formatStatus } from '../../utils/format'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

/** Page size for the users listing. */
const PAGE_LIMIT = 20

/** Base query key for the admin users list. */
const USERS_QUERY_KEY = 'admin-users'

/**
 * Merge the separately-returned user and partner lists into a single ordered
 * collection for the table. Users are listed first, then partners; each row
 * keeps its `accountType` discriminator so the UI can label it.
 */
export function combineAccounts(result: ListUsersResult): AdminAccount[] {
  return [...result.users, ...result.partners]
}

/**
 * Whether an account is currently locked. A LOCKED status (either table) means
 * the holder cannot log in, so the action offered is "unlock"; otherwise "lock".
 */
export function isLocked(account: AdminAccount): boolean {
  return account.status === AccountStatus.LOCKED
}

/** Compute the number of pages, given the larger of the two subtotal counts. */
export function totalPagesFor(result: ListUsersResult, limit: number): number {
  const maxSubtotal = Math.max(result.pagination.userTotal, result.pagination.partnerTotal)
  return Math.max(1, Math.ceil(maxSubtotal / limit))
}

/** A human label for the account type column. */
function accountTypeLabel(account: AdminAccount): string {
  if (account.accountType === 'PARTNER') return 'Đối tác'
  return formatStatus(account.role)
}

export function UsersPage() {
  const queryClient = useQueryClient()

  // The search term applied to the query (committed on submit), and the live
  // value bound to the input before submission.
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)

  // Account pending a lock/unlock confirmation (null when no prompt is shown).
  const [pending, setPending] = useState<AdminAccount | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [USERS_QUERY_KEY, { search: searchTerm, page }],
    queryFn: () => listUsers({ search: searchTerm, page, limit: PAGE_LIMIT })
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] })

  const lockMutation = useMutation({
    mutationFn: (account: AdminAccount) => (isLocked(account) ? unlockUser(account.id) : lockUser(account.id)),
    onSuccess: async (_result, account) => {
      await invalidate()
      setNotice(isLocked(account) ? `Đã mở khóa ${account.name}.` : `Đã khóa ${account.name}.`)
      setPending(null)
    },
    onError: (err) => {
      setActionError(getAdminApiError(err, 'Không thể cập nhật tài khoản. Vui lòng thử lại.'))
    }
  })

  const accounts = useMemo(() => (data ? combineAccounts(data) : []), [data])
  const totalPages = data ? totalPagesFor(data, PAGE_LIMIT) : 1

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    setNotice(null)
    setPage(1)
    setSearchTerm(searchInput.trim())
  }

  function openConfirm(account: AdminAccount) {
    setActionError(null)
    setNotice(null)
    setPending(account)
  }

  return (
    <section style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={pageTitleStyle}>Quản lý người dùng</h1>
      <p style={{ color: colors.slate, marginTop: 0, fontSize: 16 }}>
        Xem, tìm kiếm, khóa hoặc mở khóa tài khoản khách hàng và đối tác.
      </p>

      <form onSubmit={handleSearch} style={searchRowStyle} role='search'>
        <Input
          label='Tìm kiếm tài khoản'
          placeholder='Tìm theo tên, email hoặc số điện thoại…'
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          fullWidth={false}
          containerStyle={{ flex: 1, minWidth: 240 }}
        />
        <Button type='submit'>Tìm kiếm</Button>
        {searchTerm && (
          <Button
            type='button'
            variant='secondary'
            onClick={() => {
              setSearchInput('')
              setSearchTerm('')
              setPage(1)
              setNotice(null)
            }}
          >
            Xóa lọc
          </Button>
        )}
      </form>

      {notice && (
        <div role='status' style={noticeStyle}>
          {notice}
        </div>
      )}

      {isLoading && (
        <div style={{ padding: 32 }}>
          <LoadingSpinner label='Đang tải người dùng' />
        </div>
      )}

      {!isLoading && isError && (
        <div role='alert' style={alertStyle}>
          Không thể tải danh sách người dùng.{' '}
          <button type='button' style={linkButtonStyle} onClick={() => refetch()}>
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !isError && data && accounts.length === 0 && (
        <div style={emptyStyle}>
          <p style={{ margin: 0 }}>
            {searchTerm ? `Không có tài khoản khớp “${searchTerm}”.` : 'Không tìm thấy tài khoản.'}
          </p>
        </div>
      )}

      {!isLoading && !isError && data && accounts.length > 0 && (
        <>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Tên</th>
                  <th style={thStyle}>Loại</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Điện thoại</th>
                  <th style={thStyle}>Trạng thái</th>
                  <th style={thActionStyle}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const locked = isLocked(account)
                  return (
                    <tr key={`${account.accountType}-${account.id}`} data-testid={`account-${account.id}`}>
                      <td style={tdStyle}>{account.name}</td>
                      <td style={tdStyle}>{accountTypeLabel(account)}</td>
                      <td style={tdStyle}>{account.email ?? '—'}</td>
                      <td style={tdStyle}>{account.phone ?? '—'}</td>
                      <td style={tdStyle}>
                        <Badge variant={variantForStatus(account.status)}>{formatStatus(account.status)}</Badge>
                      </td>
                      <td style={tdActionStyle}>
                        <Button
                          size='sm'
                          variant={locked ? 'secondary' : 'danger'}
                          onClick={() => openConfirm(account)}
                          aria-label={`${locked ? 'Mở khóa' : 'Khóa'} ${account.name}`}
                        >
                          {locked ? 'Mở khóa' : 'Khóa'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(next) => {
                  setNotice(null)
                  setPage(next)
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Lock / unlock confirmation modal */}
      <Modal
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        title={pending && isLocked(pending) ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
        size='sm'
        footer={
          <>
            <Button variant='secondary' onClick={() => setPending(null)} type='button'>
              Hủy
            </Button>
            <Button
              variant={pending && isLocked(pending) ? 'primary' : 'danger'}
              isLoading={lockMutation.isPending}
              onClick={() => pending && lockMutation.mutate(pending)}
            >
              {pending && isLocked(pending) ? 'Mở khóa' : 'Khóa'}
            </Button>
          </>
        }
      >
        {actionError && (
          <div role='alert' style={alertStyle}>
            {actionError}
          </div>
        )}
        {pending && (
          <p style={{ margin: 0 }}>
            {isLocked(pending) ? (
              <>
                Mở khóa <strong>{pending.name}</strong>? Tài khoản này sẽ có thể đăng nhập lại.
              </>
            ) : (
              <>
                Khóa <strong>{pending.name}</strong>? Tài khoản này sẽ không thể đăng nhập cho tới khi được mở khóa.
              </>
            )}
          </p>
        )}
      </Modal>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const searchRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 12,
  margin: '16px 0',
  flexWrap: 'wrap'
}

const pageTitleStyle: CSSProperties = {
  marginTop: 0,
  fontFamily: fonts.display,
  fontSize: 40,
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: colors.ink
}

const tableWrapperStyle: CSSProperties = {
  overflowX: 'auto',
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  background: colors.surface,
  boxShadow: shadows.card
}

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14
}

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '14px 18px',
  borderBottom: `1px solid ${colors.hairline}`,
  fontFamily: fonts.display,
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: colors.slate,
  whiteSpace: 'nowrap'
}

const thActionStyle: CSSProperties = {
  ...thStyle,
  textAlign: 'right'
}

const tdStyle: CSSProperties = {
  padding: '14px 18px',
  borderBottom: `1px solid ${colors.hairline}`,
  color: colors.inkSoft
}

const tdActionStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  whiteSpace: 'nowrap'
}

const alertStyle: CSSProperties = {
  marginBottom: 12,
  padding: '12px 16px',
  borderRadius: radius.md,
  background: colors.dangerSurface,
  border: `1px solid ${colors.dangerSurface}`,
  color: colors.onDangerSurface,
  fontSize: 14
}

const noticeStyle: CSSProperties = {
  marginBottom: 12,
  padding: '12px 16px',
  borderRadius: radius.md,
  background: colors.successSurface,
  border: `1px solid ${colors.hairline}`,
  color: colors.onSuccessSurface,
  fontSize: 14
}

const emptyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 8,
  padding: 32,
  background: colors.surfaceMuted,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  color: colors.slate
}

const linkButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: colors.ink,
  cursor: 'pointer',
  padding: 0,
  font: 'inherit',
  textDecoration: 'underline'
}

export default UsersPage
