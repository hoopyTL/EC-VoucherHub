/**
 * BranchesPage — partner branch management with full CRUD (task 13.1).
 *
 * Lists the partner's branches (GET /partner/branches) and supports:
 *   - Add    → POST   /partner/branches      (Req 7.1)
 *   - Edit   → PATCH  /partner/branches/:id   (Req 7.2)
 *   - Remove → DELETE /partner/branches/:id   (Req 7.3)
 *
 * Create/edit happen in a {@link Modal} form; removal asks for confirmation in a
 * small modal. All mutations run through TanStack Query and invalidate the
 * branches list on success so the table reflects the authoritative server state.
 *
 * The app shell does not mount a global toast provider, so success/error
 * feedback is rendered as inline `role="alert"`/`role="status"` regions rather
 * than via `useToast` (which would throw without its provider).
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4_
 */
import { useState, type CSSProperties, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createBranch, deleteBranch, getPartnerApiError, listBranches, updateBranch } from '../../services/partner'
import type { Branch, BranchFormValues } from '../../types/partner'
import { VOUCHER_REGIONS } from '../../constants/voucher'
import { Badge, Button, Input, LoadingSpinner, Modal } from '../../components/ui'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

/** Query key for the partner branches list. */
const BRANCHES_QUERY_KEY = ['partner', 'branches'] as const

/** A blank branch form (used when adding a new branch). */
const EMPTY_FORM: BranchFormValues = {
  name: '',
  address: '',
  region: ''
}

/** Per-field validation errors for the branch form. */
type FormErrors = Partial<Record<keyof BranchFormValues, string>>

/** Validate the branch form client-side (all fields required, Req 7.1). */
export function validateBranchForm(values: BranchFormValues): FormErrors {
  const errors: FormErrors = {}
  if (!values.name.trim()) errors.name = 'Name is required'
  if (!values.address.trim()) errors.address = 'Address is required'
  if (!values.region.trim()) errors.region = 'Region is required'
  return errors
}

export function BranchesPage() {
  const queryClient = useQueryClient()

  // The branch currently being edited (null when the modal is closed); a
  // separate flag distinguishes "add" mode from "edit" mode.
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form, setForm] = useState<BranchFormValues>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  // Branch pending deletion confirmation (null when no prompt is shown).
  const [removing, setRemoving] = useState<Branch | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  // Transient success banner for completed actions.
  const [notice, setNotice] = useState<string | null>(null)

  const {
    data: branches,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: BRANCHES_QUERY_KEY,
    queryFn: listBranches
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: BRANCHES_QUERY_KEY })

  const saveMutation = useMutation({
    mutationFn: (values: BranchFormValues) => (editing ? updateBranch(editing.id, values) : createBranch(values)),
    onSuccess: async () => {
      await invalidate()
      setNotice(editing ? 'Branch updated.' : 'Branch added.')
      closeForm()
    },
    onError: (err) => {
      setFormError(getPartnerApiError(err, 'Could not save the branch. Please try again.'))
    }
  })

  const removeMutation = useMutation({
    mutationFn: (branch: Branch) => deleteBranch(branch.id),
    onSuccess: async () => {
      await invalidate()
      setNotice('Branch deleted.')
      setRemoving(null)
    },
    onError: (err) => {
      setRemoveError(getPartnerApiError(err, 'Could not delete the branch. Please try again.'))
    }
  })

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setFormError(null)
    setNotice(null)
    setFormOpen(true)
  }

  function openEdit(branch: Branch) {
    setEditing(branch)
    setForm({
      name: branch.name,
      address: branch.address,
      region: branch.region
    })
    setFormErrors({})
    setFormError(null)
    setNotice(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setFormError(null)
  }

  function handleField(field: keyof BranchFormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const errors = validateBranchForm(form)
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return
    setFormError(null)
    // Trim whitespace before sending so the server stores clean values.
    saveMutation.mutate({
      name: form.name.trim(),
      address: form.address.trim(),
      region: form.region.trim()
    })
  }

  return (
    <section style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={headerRowStyle}>
        <h1 style={titleStyle}>Branches</h1>
        <Button onClick={openAdd}>Add branch</Button>
      </div>

      {notice && (
        <div role='status' style={noticeStyle}>
          {notice}
        </div>
      )}

      {isLoading && (
        <div style={{ padding: 32 }}>
          <LoadingSpinner label='Loading branches' />
        </div>
      )}

      {!isLoading && isError && (
        <div role='alert' style={alertStyle}>
          We couldn&apos;t load your branches.{' '}
          <button type='button' style={linkButtonStyle} onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && branches && branches.length === 0 && (
        <div style={emptyStyle}>
          <p style={{ margin: 0 }}>You haven&apos;t added any branches yet.</p>
          <Button onClick={openAdd}>Add your first branch</Button>
        </div>
      )}

      {!isLoading && !isError && branches && branches.length > 0 && (
        <ul style={listStyle}>
          {branches.map((branch) => (
            <li key={branch.id} style={rowStyle} data-testid={`branch-${branch.id}`}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{branch.name}</span>
                  <Badge variant='success'>Active</Badge>
                </div>
                <p style={metaStyle}>{branch.address}</p>
                <p style={metaStyle}>{branch.region}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  size='sm'
                  variant='secondary'
                  onClick={() => openEdit(branch)}
                  aria-label={`Edit ${branch.name}`}
                >
                  Edit
                </Button>
                <Button
                  size='sm'
                  variant='danger'
                  onClick={() => {
                    setRemoveError(null)
                    setNotice(null)
                    setRemoving(branch)
                  }}
                  aria-label={`Delete ${branch.name}`}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add / edit form modal */}
      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editing ? 'Edit branch' : 'Add branch'}
        footer={
          <>
            <Button variant='secondary' onClick={closeForm} type='button'>
              Cancel
            </Button>
            <Button type='submit' form='branch-form' isLoading={saveMutation.isPending}>
              {editing ? 'Save changes' : 'Add branch'}
            </Button>
          </>
        }
      >
        <form id='branch-form' onSubmit={handleSubmit} noValidate>
          {formError && (
            <div role='alert' style={alertStyle}>
              {formError}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              label='Branch name'
              required
              value={form.name}
              error={formErrors.name}
              onChange={(e) => handleField('name', e.target.value)}
            />
            <Input
              label='Address'
              required
              value={form.address}
              error={formErrors.address}
              onChange={(e) => handleField('address', e.target.value)}
            />
            <div>
              <label htmlFor='branch-region' style={selectLabelStyle}>
                Region
                <span aria-hidden='true' style={{ color: colors.danger, marginLeft: 2 }}>
                  *
                </span>
              </label>
              <select
                id='branch-region'
                value={form.region}
                onChange={(e) => handleField('region', e.target.value)}
                aria-invalid={formErrors.region ? true : undefined}
                style={selectStyle(Boolean(formErrors.region))}
              >
                <option value=''>Select a region…</option>
                {VOUCHER_REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              {formErrors.region && (
                <p role='alert' style={fieldErrorStyle}>
                  {formErrors.region}
                </p>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={removing !== null}
        onClose={() => setRemoving(null)}
        title='Delete branch'
        size='sm'
        footer={
          <>
            <Button variant='secondary' onClick={() => setRemoving(null)} type='button'>
              Cancel
            </Button>
            <Button
              variant='danger'
              isLoading={removeMutation.isPending}
              onClick={() => removing && removeMutation.mutate(removing)}
            >
              Delete
            </Button>
          </>
        }
      >
        {removeError && (
          <div role='alert' style={alertStyle}>
            {removeError}
          </div>
        )}
        <p style={{ margin: 0 }}>
          Delete <strong>{removing?.name}</strong>? This action is permanent. Branches referenced by vouchers or usage
          history cannot be deleted.
        </p>
      </Modal>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 16
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: fonts.display,
  fontSize: 'clamp(32px, 5vw, 40px)',
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: colors.ink
}

const listStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  padding: '14px 16px',
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  boxShadow: shadows.card
}

const metaStyle: CSSProperties = {
  margin: '4px 0 0',
  fontSize: 13,
  color: colors.slate
}

const alertStyle: CSSProperties = {
  marginBottom: 12,
  padding: '10px 12px',
  borderRadius: radius.md,
  background: colors.dangerSurface,
  border: `1px solid ${colors.dangerSurface}`,
  color: colors.onDangerSurface,
  fontSize: 14
}

const noticeStyle: CSSProperties = {
  marginBottom: 12,
  padding: '10px 12px',
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
  gap: 12,
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

const selectLabelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: 13,
  fontWeight: 500,
  color: colors.slate
}

function selectStyle(hasError: boolean): CSSProperties {
  return {
    width: '100%',
    padding: '8px 12px',
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.ink,
    background: colors.surface,
    border: `1px solid ${hasError ? colors.danger : colors.hairlineStrong}`,
    borderRadius: radius.md,
    outline: 'none',
    boxSizing: 'border-box'
  }
}

const fieldErrorStyle: CSSProperties = {
  margin: '4px 0 0',
  fontSize: 12,
  color: colors.danger
}

export default BranchesPage
