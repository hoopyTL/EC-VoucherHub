/**
 * CreateVoucherPage — partner voucher creation form (task 13.2).
 *
 * Collects every field of a {@link CreateVoucherRequest} (Req 8.1): title,
 * description, category, original/sale price, total quantity, sale & usage
 * periods, optional terms, and the applicable branches (Req 8.5). Branches are
 * loaded from `GET /partner/branches`; at least one active branch must be
 * selected.
 *
 * Client-side validation mirrors the server rules so feedback is immediate
 * (the server re-validates authoritatively):
 *   - sale price strictly less than original price (Req 8.2 / 8.6)
 *   - sale period end after sale period start          (Req 8.3)
 *   - usage period end after usage period start        (Req 8.4)
 *   - at least one branch selected
 *
 * On submit the form posts to `POST /partner/vouchers`, which creates the
 * voucher as DRAFT, then navigates back to the voucher list. `datetime-local`
 * inputs are converted to full ISO-8601 strings (the backend expects
 * `z.string().datetime()`). There is no global ToastProvider, so errors render
 * as inline `role="alert"` regions.
 *
 * _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
 */
import { useEffect, useState, type ChangeEvent, type CSSProperties, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateVoucherRequest } from '@ui-contracts'
import { Button, Input, LoadingSpinner } from '../../components/ui'
import { colors, fonts, radius } from '../../theme/tokens'
import {
  createVoucher,
  getPartnerVoucher,
  getApiErrorMessage,
  listVoucherCategories,
  listPartnerBranches,
  updatePartnerVoucher,
  uploadVoucherImage,
  PARTNER_BRANCHES_QUERY_KEY,
  PARTNER_VOUCHERS_QUERY_KEY,
  VOUCHER_CATEGORIES_QUERY_KEY,
  type PartnerBranch
} from '../../services/partnerVoucher'

/** Mutable form state — all fields are strings (raw input values). */
interface FormState {
  title: string
  description: string
  category: string
  originalPrice: string
  salePrice: string
  totalQuantity: string
  isMultiUse: boolean
  usesPerCode: string
  salePeriodStart: string
  salePeriodEnd: string
  usagePeriodStart: string
  usagePeriodEnd: string
  imageUrl: string
}

/** Field-level validation errors, keyed by form field (plus `branchIds`). */
type FormErrors = Partial<Record<keyof FormState | 'branchIds', string>>

const INITIAL_FORM: FormState = {
  title: '',
  description: '',
  category: '',
  originalPrice: '',
  salePrice: '',
  totalQuantity: '',
  isMultiUse: false,
  usesPerCode: '',
  salePeriodStart: '',
  salePeriodEnd: '',
  usagePeriodStart: '',
  usagePeriodEnd: '',
  imageUrl: ''
}

/**
 * Convert a `datetime-local` value (`YYYY-MM-DDTHH:mm`, local time, no zone)
 * into a full ISO-8601 string with a timezone offset, as the backend's
 * `z.string().datetime()` requires. Returns `null` for unparseable input.
 */
function toIso(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

/**
 * Validate the raw form + selected branches against the same rules the server
 * enforces. Returns a map of field → message; an empty map means the form is
 * valid.
 */
export function validateVoucherForm(form: FormState, selectedBranchIds: string[]): FormErrors {
  const errors: FormErrors = {}

  if (!form.title.trim()) errors.title = 'Vui lòng nhập tiêu đề.'
  if (!form.description.trim()) errors.description = 'Vui lòng nhập mô tả.'
  if (!form.category) errors.category = 'Vui lòng chọn danh mục.'

  const original = Number(form.originalPrice)
  const sale = Number(form.salePrice)
  const quantity = Number(form.totalQuantity)

  if (!form.originalPrice || !Number.isFinite(original) || original <= 0) {
    errors.originalPrice = 'Giá phải lớn hơn 0.'
  }
  if (!form.salePrice || !Number.isFinite(sale) || sale <= 0) {
    errors.salePrice = 'Giá phải lớn hơn 0.'
  } else if (form.originalPrice && Number.isFinite(original) && sale >= original) {
    // Req 8.2 / 8.6 — sale price must be strictly less than original.
    errors.salePrice = 'Giá bán phải thấp hơn giá gốc.'
  }

  if (!form.totalQuantity || !Number.isInteger(quantity) || quantity <= 0) {
    errors.totalQuantity = 'Số lượng phải là số nguyên lớn hơn 0.'
  }
  const usesPerCode = Number(form.usesPerCode)
  if (form.isMultiUse && (!form.usesPerCode || !Number.isInteger(usesPerCode) || usesPerCode <= 0)) {
    errors.usesPerCode = 'Số lượt mỗi mã phải là số nguyên lớn hơn 0.'
  }

  // Sale period (Req 8.3).
  if (!form.salePeriodStart) errors.salePeriodStart = 'Vui lòng chọn thời gian bắt đầu bán.'
  if (!form.salePeriodEnd) {
    errors.salePeriodEnd = 'Vui lòng chọn thời gian kết thúc bán.'
  } else if (form.salePeriodStart && new Date(form.salePeriodEnd) <= new Date(form.salePeriodStart)) {
    errors.salePeriodEnd = 'Thời gian kết thúc phải sau thời gian bắt đầu.'
  }

  // Usage period (Req 8.4).
  if (!form.usagePeriodStart) errors.usagePeriodStart = 'Vui lòng chọn thời gian bắt đầu sử dụng.'
  if (!form.usagePeriodEnd) {
    errors.usagePeriodEnd = 'Vui lòng chọn thời gian kết thúc sử dụng.'
  } else if (form.usagePeriodStart && new Date(form.usagePeriodEnd) <= new Date(form.usagePeriodStart)) {
    errors.usagePeriodEnd = 'Thời gian kết thúc phải sau thời gian bắt đầu.'
  }

  // At least one branch (Req 8.5).
  if (selectedBranchIds.length === 0) {
    errors.branchIds = 'Chọn ít nhất một chi nhánh.'
  }

  if (form.imageUrl.trim() && !form.imageUrl.trim().startsWith('/uploads/vouchers/')) {
    errors.imageUrl = 'Ảnh voucher phải được tải lên từ máy.'
  }

  return errors
}

export function CreateVoucherPage() {
  const navigate = useNavigate()
  const { id: editId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([])
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Image upload (future-development.md §4.3): uploading state + any error.
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const branchesQuery = useQuery<PartnerBranch[]>({
    queryKey: PARTNER_BRANCHES_QUERY_KEY,
    queryFn: listPartnerBranches
  })

  const categoriesQuery = useQuery({
    queryKey: VOUCHER_CATEGORIES_QUERY_KEY,
    queryFn: listVoucherCategories
  })

  const voucherQuery = useQuery({
    queryKey: [...PARTNER_VOUCHERS_QUERY_KEY, editId],
    queryFn: () => getPartnerVoucher(editId!),
    enabled: Boolean(editId)
  })

  useEffect(() => {
    const voucher = voucherQuery.data
    if (!voucher) return
    setForm({
      title: voucher.title,
      description: voucher.description,
      category: voucher.categoryId ? String(voucher.categoryId) : '',
      originalPrice: voucher.originalPrice,
      salePrice: voucher.salePrice,
      totalQuantity: String(voucher.totalQuantity),
      isMultiUse: voucher.isMultiUse,
      usesPerCode: voucher.usesPerCode ? String(voucher.usesPerCode) : '',
      salePeriodStart: voucher.salePeriodStart.slice(0, 16),
      salePeriodEnd: voucher.salePeriodEnd.slice(0, 16),
      usagePeriodStart: voucher.usagePeriodStart.slice(0, 16),
      usagePeriodEnd: voucher.usagePeriodEnd.slice(0, 16),
      imageUrl: voucher.imageUrl ?? ''
    })
    setSelectedBranchIds(voucher.voucherBranches.map((link) => link.branchId))
  }, [voucherQuery.data])

  useEffect(() => {
    if (!editId && !form.category && categoriesQuery.data?.[0]) {
      setField('category', String(categoriesQuery.data[0].id))
    }
  }, [categoriesQuery.data, editId, form.category])

  const activeBranches = branchesQuery.data ?? []

  const createMutation = useMutation({
    mutationFn: (body: CreateVoucherRequest) => (editId ? updatePartnerVoucher(editId, body) : createVoucher(body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTNER_VOUCHERS_QUERY_KEY })
      navigate('/partner/vouchers')
    },
    onError: (err) => {
      setSubmitError(getApiErrorMessage(err, 'Không thể lưu voucher. Vui lòng thử lại.'))
    }
  })

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleBranch(id: string) {
    setSelectedBranchIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]))
  }

  /** Upload the selected file and store the returned public URL in the form. */
  async function handleImageFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Allow re-selecting the same file later by clearing the input value.
    event.target.value = ''
    if (!file) return

    setUploadError(null)
    setIsUploading(true)
    try {
      const url = await uploadVoucherImage(file)
      setField('imageUrl', url)
      setErrors((prev) => ({ ...prev, imageUrl: undefined }))
    } catch (err) {
      setUploadError(getApiErrorMessage(err, 'Không thể tải ảnh lên. Vui lòng thử lại.'))
    } finally {
      setIsUploading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)

    const validationErrors = validateVoucherForm(form, selectedBranchIds)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    const salePeriodStart = toIso(form.salePeriodStart)
    const salePeriodEnd = toIso(form.salePeriodEnd)
    const usagePeriodStart = toIso(form.usagePeriodStart)
    const usagePeriodEnd = toIso(form.usagePeriodEnd)

    // Guard against unparseable dates that slipped past validation.
    if (!salePeriodStart || !salePeriodEnd || !usagePeriodStart || !usagePeriodEnd) {
      setSubmitError('Một hoặc nhiều mốc thời gian không hợp lệ.')
      return
    }

    const body: CreateVoucherRequest = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      originalPrice: Number(form.originalPrice),
      salePrice: Number(form.salePrice),
      totalQuantity: Number(form.totalQuantity),
      salePeriodStart,
      salePeriodEnd,
      usagePeriodStart,
      usagePeriodEnd,
      imageUrl: form.imageUrl.trim() ? form.imageUrl.trim() : undefined,
      branchIds: selectedBranchIds,
      isMultiUse: form.isMultiUse,
      usesPerCode: form.isMultiUse ? Number(form.usesPerCode) : null
    }

    createMutation.mutate(body)
  }

  if (editId && voucherQuery.isLoading) return <LoadingSpinner label='Đang tải voucher' />

  return (
    <section style={sectionStyle}>
      <h1 style={titleStyle}>{editId ? 'Chỉnh sửa voucher' : 'Tạo voucher'}</h1>
      <p style={subtitleStyle}>
        Voucher được lưu ở trạng thái nháp. Gửi duyệt từ danh sách voucher khi nội dung đã sẵn sàng.
      </p>

      <ol className='voucher-form-steps' aria-label='CÃ¡c bÆ°á»›c táº¡o voucher'>
        <li className='is-active'>
          <span>1</span> ThÃ´ng tin
        </li>
        <li>
          <span>2</span> GiÃ¡ &amp; sá»‘ lÆ°á»£ng
        </li>
        <li>
          <span>3</span> Pháº¡m vi Ã¡p dá»¥ng
        </li>
        <li>
          <span>4</span> XÃ¡c nháº­n
        </li>
      </ol>

      {submitError && (
        <div role='alert' style={alertStyle}>
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label='Tiêu đề'
          required
          value={form.title}
          error={errors.title}
          onChange={(e) => setField('title', e.target.value)}
        />

        <div style={fieldStyle}>
          <label htmlFor='voucher-description' style={labelStyle}>
            Mô tả
            <span aria-hidden='true' style={requiredMarkStyle}>
              *
            </span>
          </label>
          <textarea
            id='voucher-description'
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            rows={3}
            aria-invalid={errors.description ? true : undefined}
            style={textareaStyle}
          />
          {errors.description && (
            <p role='alert' style={fieldErrorStyle}>
              {errors.description}
            </p>
          )}
        </div>

        <div style={fieldStyle}>
          <label htmlFor='voucher-category' style={labelStyle}>
            Danh mục
            <span aria-hidden='true' style={requiredMarkStyle}>
              *
            </span>
          </label>
          <select
            id='voucher-category'
            value={form.category}
            onChange={(e) => setField('category', e.target.value)}
            style={selectStyle}
          >
            <option value='' disabled>
              Chọn danh mục
            </option>
            {(categoriesQuery.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.category && (
            <p role='alert' style={fieldErrorStyle}>
              {errors.category}
            </p>
          )}
        </div>

        <div style={twoColStyle}>
          <Input
            label='Giá gốc (₫)'
            required
            type='number'
            min={0}
            step='1000'
            value={form.originalPrice}
            error={errors.originalPrice}
            onChange={(e) => setField('originalPrice', e.target.value)}
          />
          <Input
            label='Giá bán (₫)'
            required
            type='number'
            min={0}
            step='1000'
            value={form.salePrice}
            error={errors.salePrice}
            onChange={(e) => setField('salePrice', e.target.value)}
          />
        </div>

        <Input
          label='Tổng số lượng'
          required
          type='number'
          min={1}
          step='1'
          value={form.totalQuantity}
          error={errors.totalQuantity}
          onChange={(e) => setField('totalQuantity', e.target.value)}
        />

        <div style={fieldStyle}>
          <label style={branchOptionStyle}>
            <input
              type='checkbox'
              checked={form.isMultiUse}
              onChange={(event) => setField('isMultiUse', event.target.checked)}
            />
            <span>Cho phép một mã sử dụng nhiều lượt</span>
          </label>
          {form.isMultiUse && (
            <Input
              label='Số lượt mỗi mã'
              required
              type='number'
              min={1}
              step='1'
              value={form.usesPerCode}
              error={errors.usesPerCode}
              onChange={(event) => setField('usesPerCode', event.target.value)}
            />
          )}
        </div>

        <div style={twoColStyle}>
          <Input
            label='Bắt đầu mở bán'
            required
            type='datetime-local'
            value={form.salePeriodStart}
            error={errors.salePeriodStart}
            onChange={(e) => setField('salePeriodStart', e.target.value)}
          />
          <Input
            label='Kết thúc mở bán'
            required
            type='datetime-local'
            value={form.salePeriodEnd}
            error={errors.salePeriodEnd}
            onChange={(e) => setField('salePeriodEnd', e.target.value)}
          />
        </div>

        <div style={twoColStyle}>
          <Input
            label='Bắt đầu sử dụng'
            required
            type='datetime-local'
            value={form.usagePeriodStart}
            error={errors.usagePeriodStart}
            onChange={(e) => setField('usagePeriodStart', e.target.value)}
          />
          <Input
            label='Kết thúc sử dụng'
            required
            type='datetime-local'
            value={form.usagePeriodEnd}
            error={errors.usagePeriodEnd}
            onChange={(e) => setField('usagePeriodEnd', e.target.value)}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Ảnh voucher (không bắt buộc)</label>
          <div style={uploadRowStyle}>
            <label style={uploadButtonStyle}>
              {isUploading ? 'Đang tải lên…' : 'Tải ảnh lên'}
              <input
                type='file'
                accept='image/jpeg,image/png,image/webp'
                onChange={handleImageFile}
                disabled={isUploading || createMutation.isPending}
                style={{ display: 'none' }}
              />
            </label>
            {form.imageUrl && <img src={form.imageUrl} alt='Xem trước voucher' style={previewStyle} />}
          </div>
          {uploadError && (
            <p role='alert' style={fieldErrorStyle}>
              {uploadError}
            </p>
          )}
          <p style={{ margin: '6px 0 0', fontSize: 12, color: colors.slate }}>
            JPEG, PNG hoặc WEBP tối đa 2&nbsp;MB. Ảnh được lưu nội bộ trên hệ thống.
          </p>
          {errors.imageUrl && (
            <p role='alert' style={fieldErrorStyle}>
              {errors.imageUrl}
            </p>
          )}
        </div>

        {/* Branch selection (Req 8.5) */}
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Chi nhánh áp dụng</legend>

          {branchesQuery.isLoading && <LoadingSpinner size='sm' inline label='Đang tải chi nhánh' />}

          {branchesQuery.isError && (
            <p role='alert' style={fieldErrorStyle}>
              Không thể tải danh sách chi nhánh. Vui lòng thử lại.
            </p>
          )}

          {!branchesQuery.isLoading && !branchesQuery.isError && activeBranches.length === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: colors.slate }}>
              Chưa có chi nhánh đang hoạt động. Hãy thêm chi nhánh trước khi tạo voucher.
            </p>
          )}

          {activeBranches.map((branch) => (
            <label key={branch.id} style={branchOptionStyle}>
              <input
                type='checkbox'
                checked={selectedBranchIds.includes(branch.id)}
                onChange={() => toggleBranch(branch.id)}
              />
              <span>
                {branch.name} <span style={{ color: colors.slate }}>· {branch.region}</span>
              </span>
            </label>
          ))}

          {errors.branchIds && (
            <p role='alert' style={fieldErrorStyle}>
              {errors.branchIds}
            </p>
          )}
        </fieldset>

        <div style={buttonRowStyle}>
          <Button type='submit' isLoading={createMutation.isPending} disabled={createMutation.isPending}>
            {editId ? 'Lưu thay đổi' : 'Lưu bản nháp'}
          </Button>
          <Button
            type='button'
            variant='secondary'
            disabled={createMutation.isPending}
            onClick={() => navigate('/partner/vouchers')}
          >
            Hủy
          </Button>
        </div>
      </form>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const sectionStyle: CSSProperties = { maxWidth: 640, margin: '0 auto' }

const titleStyle: CSSProperties = {
  marginTop: 0,
  fontFamily: fonts.display,
  fontSize: 'clamp(32px, 5vw, 40px)',
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: colors.ink
}

const subtitleStyle: CSSProperties = {
  marginTop: 0,
  color: colors.slate,
  fontSize: 14
}

const fieldStyle: CSSProperties = { marginTop: 14 }

const uploadRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  marginBottom: 6
}

const uploadButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 18px',
  borderRadius: radius.full,
  border: `1px solid ${colors.ink}`,
  background: colors.surface,
  color: colors.ink,
  fontFamily: fonts.display,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer'
}

const previewStyle: CSSProperties = {
  width: 72,
  height: 72,
  objectFit: 'cover',
  borderRadius: radius.md,
  border: `1px solid ${colors.hairline}`
}

const twoColStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 14,
  marginTop: 14
}

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: 13,
  fontWeight: 500,
  color: colors.slate
}

const requiredMarkStyle: CSSProperties = { color: colors.danger, marginLeft: 2 }

const textareaStyle: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 14,
  fontFamily: fonts.body,
  color: colors.ink,
  border: `1px solid ${colors.hairlineStrong}`,
  borderRadius: radius.md,
  boxSizing: 'border-box',
  resize: 'vertical'
}

const selectStyle: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 14,
  fontFamily: fonts.body,
  color: colors.ink,
  background: colors.surface,
  border: `1px solid ${colors.hairlineStrong}`,
  borderRadius: radius.md,
  boxSizing: 'border-box'
}

const fieldsetStyle: CSSProperties = {
  marginTop: 18,
  padding: 14,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.lg
}

const legendStyle: CSSProperties = {
  padding: '0 6px',
  fontSize: 13,
  fontWeight: 600,
  color: colors.slate
}

const branchOptionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 0',
  fontSize: 14
}

const fieldErrorStyle: CSSProperties = {
  margin: '4px 0 0',
  fontSize: 12,
  color: colors.danger
}

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  marginTop: 22
}

const alertStyle: CSSProperties = {
  marginBottom: 16,
  padding: '10px 12px',
  borderRadius: radius.md,
  background: colors.dangerSurface,
  border: `1px solid ${colors.dangerSurface}`,
  color: colors.onDangerSurface,
  fontSize: 14
}

export default CreateVoucherPage
