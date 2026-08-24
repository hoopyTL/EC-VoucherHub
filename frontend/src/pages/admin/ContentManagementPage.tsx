import { useState, type CSSProperties } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Edit3, FileText, Plus, Send } from 'lucide-react'
import { Badge, Button, ConfirmDialog, ContentSkeleton, Input, Modal, useToast } from '../../components/ui'
import { DataTable } from '../../components/admin/DataTable'
import {
  archiveAdminContent,
  createAdminContent,
  getAdminApiError,
  listAdminContent,
  updateAdminContent,
  type AdminContentItem,
  type ContentStatus,
  type ContentType,
  type CreateAdminContentDto,
  type UpdateAdminContentDto
} from '../../services/admin'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { formatDate } from '../../utils/format'

const TYPE_CONFIG: Record<ContentType, { label: string; color: string; bg: string }> = {
  banner: { label: 'Banner', color: '#0369a1', bg: '#e0f2fe' },
  announcement: { label: 'Thông báo', color: '#b45309', bg: '#fef3c7' },
  policy: { label: 'Chính sách', color: '#4338ca', bg: '#e0e7ff' },
  faq: { label: 'FAQ', color: '#047857', bg: '#d1fae5' }
}

const STATUS_CONFIG: Record<
  ContentStatus,
  { label: string; variant: 'neutral' | 'success' | 'danger' | 'warning' | 'info' }
> = {
  draft: { label: 'Bản nháp', variant: 'warning' },
  published: { label: 'Đã xuất bản', variant: 'success' },
  archived: { label: 'Lưu trữ', variant: 'neutral' }
}

export function ContentManagementPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AdminContentItem | null>(null)
  const [archivingItem, setArchivingItem] = useState<AdminContentItem | null>(null)

  // Form states
  const [formType, setFormType] = useState<ContentType>('announcement')
  const [formTitle, setFormTitle] = useState('')
  const [formBody, setFormBody] = useState('')
  const [formStatus, setFormStatus] = useState<ContentStatus>('published')
  const [formDisplayFrom, setFormDisplayFrom] = useState('')
  const [formDisplayTo, setFormDisplayTo] = useState('')

  const { showToast } = useToast()
  const queryClient = useQueryClient()

  // Fetch content list
  const {
    data: contentList = [],
    isLoading,
    isError
  } = useQuery({
    queryKey: ['admin-content', selectedType, selectedStatus, searchQuery],
    queryFn: () =>
      listAdminContent({
        type: selectedType !== 'ALL' ? (selectedType as ContentType) : undefined,
        status: selectedStatus !== 'ALL' ? (selectedStatus as ContentStatus) : undefined,
        q: searchQuery.trim() || undefined,
        limit: 100
      })
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateAdminContentDto) => createAdminContent(data),
    onSuccess: () => {
      showToast('Đã tạo nội dung mới thành công!', { variant: 'success' })
      setIsModalOpen(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['admin-content'] })
    },
    onError: (err) => {
      const msg = getAdminApiError(err, 'Không thể tạo nội dung. Vui lòng kiểm tra lại.')
      showToast(msg, { variant: 'error' })
    }
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdminContentDto }) => updateAdminContent(id, data),
    onSuccess: () => {
      showToast('Đã cập nhật nội dung thành công!', { variant: 'success' })
      setIsModalOpen(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['admin-content'] })
    },
    onError: (err) => {
      const msg = getAdminApiError(err, 'Không thể cập nhật nội dung. Vui lòng thử lại.')
      showToast(msg, { variant: 'error' })
    }
  })

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveAdminContent(id),
    onSuccess: () => {
      showToast('Đã chuyển nội dung vào mục lưu trữ.', { variant: 'info' })
      setArchivingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-content'] })
    },
    onError: (err) => {
      const msg = getAdminApiError(err, 'Không thể lưu trữ nội dung. Vui lòng thử lại.')
      showToast(msg, { variant: 'error' })
    }
  })

  const resetForm = () => {
    setEditingItem(null)
    setFormType('announcement')
    setFormTitle('')
    setFormBody('')
    setFormStatus('published')
    setFormDisplayFrom('')
    setFormDisplayTo('')
  }

  const handleOpenCreate = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: AdminContentItem) => {
    setEditingItem(item)
    setFormType(item.type)
    setFormTitle(item.title)
    setFormBody(item.body)
    setFormStatus(item.status)
    setFormDisplayFrom(item.displayFrom ? new Date(item.displayFrom).toISOString().slice(0, 16) : '')
    setFormDisplayTo(item.displayTo ? new Date(item.displayTo).toISOString().slice(0, 16) : '')
    setIsModalOpen(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      showToast('Tiêu đề nội dung không được để trống.', { variant: 'error' })
      return
    }
    if (!formBody.trim()) {
      showToast('Nội dung chi tiết không được để trống.', { variant: 'error' })
      return
    }

    const payload = {
      type: formType,
      title: formTitle.trim(),
      body: formBody.trim(),
      status: formStatus,
      displayFrom: formDisplayFrom ? new Date(formDisplayFrom).toISOString() : null,
      displayTo: formDisplayTo ? new Date(formDisplayTo).toISOString() : null
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  // Summary counts
  const totalCount = contentList.length
  const publishedCount = contentList.filter((item) => item.status === 'published').length
  const draftCount = contentList.filter((item) => item.status === 'draft').length
  const archivedCount = contentList.filter((item) => item.status === 'archived').length

  return (
    <section style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 40 }} data-testid='admin-content-page'>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <p style={eyebrowStyle}>● Vận hành & Truyền thông</p>
          <h1 style={titleStyle}>Quản lý nội dung hệ thống</h1>
          <p style={subtitleStyle}>
            Điều phối banner quảng bá, thông báo hệ thống, chính sách bảo hành và câu hỏi thường gặp (FR-21 / FLOW-011).
          </p>
        </div>
        <Button
          data-testid='create-content-btn'
          onClick={handleOpenCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={18} />
          Tạo nội dung mới
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryValueStyle}>{totalCount}</span>
          <span style={summaryLabelStyle}>Tổng nội dung</span>
        </div>
        <div style={{ ...summaryCardStyle, borderTop: '3px solid #16a34a' }}>
          <span style={{ ...summaryValueStyle, color: '#16a34a' }}>{publishedCount}</span>
          <span style={summaryLabelStyle}>Đang phát hành</span>
        </div>
        <div style={{ ...summaryCardStyle, borderTop: '3px solid #ca8a04' }}>
          <span style={{ ...summaryValueStyle, color: '#ca8a04' }}>{draftCount}</span>
          <span style={summaryLabelStyle}>Bản nháp</span>
        </div>
        <div style={{ ...summaryCardStyle, borderTop: '3px solid #94a3b8' }}>
          <span style={{ ...summaryValueStyle, color: colors.slate }}>{archivedCount}</span>
          <span style={summaryLabelStyle}>Đã lưu trữ</span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div style={toolbarStyle}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Input
            label='Tìm kiếm'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Tìm theo tiêu đề hoặc nội dung...'
            data-testid='search-content-input'
          />
        </div>

        {/* Filter Type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: colors.slate }}>Loại nội dung</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={selectStyle}
            data-testid='filter-type-select'
          >
            <option value='ALL'>Tất cả thể loại</option>
            <option value='banner'>Banner quảng cáo</option>
            <option value='announcement'>Thông báo hệ thống</option>
            <option value='policy'>Chính sách & Quy định</option>
            <option value='faq'>Câu hỏi thường gặp (FAQ)</option>
          </select>
        </div>

        {/* Filter Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: colors.slate }}>Trạng thái</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={selectStyle}
            data-testid='filter-status-select'
          >
            <option value='ALL'>Tất cả trạng thái</option>
            <option value='published'>Đã xuất bản</option>
            <option value='draft'>Bản nháp</option>
            <option value='archived'>Lưu trữ</option>
          </select>
        </div>
      </div>

      {/* Content Table / Data Display */}
      {isLoading ? (
        <ContentSkeleton rows={6} label='Đang tải danh sách nội dung...' />
      ) : isError ? (
        <div
          role='alert'
          style={{
            padding: 24,
            textAlign: 'center',
            color: colors.danger,
            background: colors.dangerSurface,
            borderRadius: radius.md
          }}
        >
          Không thể tải danh sách nội dung. Vui lòng thử lại.
        </div>
      ) : contentList.length === 0 ? (
        <div style={emptyStateStyle} data-testid='empty-content-state'>
          <FileText size={48} color={colors.slateMuted} style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: colors.ink, marginBottom: 6 }}>
            Chưa có nội dung nào
          </h3>
          <p style={{ fontSize: '0.9rem', color: colors.slate, marginBottom: 16 }}>
            {searchQuery || selectedType !== 'ALL' || selectedStatus !== 'ALL'
              ? 'Không tìm thấy mục nội dung khớp với bộ lọc hiện tại.'
              : 'Bắt đầu tạo banner hoặc thông báo đầu tiên cho hệ thống.'}
          </p>
          <Button onClick={handleOpenCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Tạo nội dung ngay
          </Button>
        </div>
      ) : (
        <div style={tableCardStyle}>
          <DataTable
            style={{ width: '100%', borderCollapse: 'collapse' }}
            accessibleLabel='Danh sách nội dung hệ thống'
          >
            <thead>
              <tr>
                <th style={thStyle}>Phân loại</th>
                <th style={{ ...thStyle, width: '35%' }}>Tiêu đề & Trích đoạn</th>
                <th style={thStyle}>Trạng thái</th>
                <th style={thStyle}>Thời gian hiển thị</th>
                <th style={thStyle}>Người tạo / Cập nhật</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {contentList.map((item) => {
                const typeCfg = TYPE_CONFIG[item.type] ?? { label: item.type, color: '#334155', bg: '#f1f5f9' }
                const statusCfg = STATUS_CONFIG[item.status] ?? { label: item.status, variant: 'default' }

                return (
                  <tr
                    key={item.id}
                    data-testid={`content-row-${item.id}`}
                    style={{ borderBottom: `1px solid ${colors.hairline}` }}
                  >
                    {/* Type Column */}
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: typeCfg.color,
                          backgroundColor: typeCfg.bg,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        {typeCfg.label}
                      </span>
                    </td>

                    {/* Title & Preview */}
                    <td style={tdStyle}>
                      <strong style={{ display: 'block', fontSize: '0.95rem', color: colors.ink, marginBottom: 4 }}>
                        {item.title}
                      </strong>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.82rem',
                          color: colors.slate,
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {item.body}
                      </p>
                    </td>

                    {/* Status Column */}
                    <td style={tdStyle}>
                      <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                    </td>

                    {/* Display Schedule */}
                    <td style={tdStyle}>
                      <div style={{ fontSize: '0.82rem', color: colors.slate }}>
                        {item.displayFrom || item.displayTo ? (
                          <>
                            <div>Từ: {item.displayFrom ? formatDate(item.displayFrom) : 'Không giới hạn'}</div>
                            <div>Đến: {item.displayTo ? formatDate(item.displayTo) : 'Vô thời hạn'}</div>
                          </>
                        ) : (
                          <span style={{ color: colors.slateMuted }}>Hiển thị liên tục</span>
                        )}
                      </div>
                    </td>

                    {/* Author & Updated */}
                    <td style={tdStyle}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: colors.ink }}>
                        {item.author?.fullName || 'Quản trị viên'}
                      </div>
                      <small style={{ fontSize: '0.78rem', color: colors.slateMuted }}>
                        Cập nhật: {formatDate(item.updatedAt)}
                      </small>
                    </td>

                    {/* Actions */}
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <Button
                          variant='secondary'
                          size='sm'
                          onClick={() => handleOpenEdit(item)}
                          data-testid={`edit-content-btn-${item.id}`}
                          style={{ padding: '4px 8px', fontSize: '0.82rem' }}
                          title='Chỉnh sửa nội dung'
                        >
                          <Edit3 size={14} style={{ marginRight: 4 }} /> Sửa
                        </Button>
                        {item.status !== 'archived' && (
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => setArchivingItem(item)}
                            data-testid={`archive-content-btn-${item.id}`}
                            style={{ padding: '4px 8px', fontSize: '0.82rem', color: colors.danger }}
                            title='Lưu trữ / Ẩn'
                          >
                            <Archive size={14} style={{ marginRight: 4 }} /> Lưu trữ
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
        </div>
      )}

      {/* Modal Create / Edit Content */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Chỉnh sửa nội dung' : 'Tạo nội dung truyền thông mới'}
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Type & Status Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>
                Thể loại <span style={{ color: colors.danger }}>*</span>
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as ContentType)}
                style={selectStyle}
                data-testid='form-type-select'
              >
                <option value='banner'>Banner quảng cáo</option>
                <option value='announcement'>Thông báo hệ thống</option>
                <option value='policy'>Chính sách & Quy định</option>
                <option value='faq'>Câu hỏi thường gặp (FAQ)</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Trạng thái phát hành <span style={{ color: colors.danger }}>*</span>
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as ContentStatus)}
                style={selectStyle}
                data-testid='form-status-select'
              >
                <option value='published'>Đã xuất bản (Công khai)</option>
                <option value='draft'>Bản nháp (Ẩn)</option>
                <option value='archived'>Lưu trữ (Vô hiệu)</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <Input
              label='Tiêu đề nội dung'
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder='Ví dụ: Khuyến mãi mừng Đại lễ 2/9 - Giảm tới 50%'
              required
              data-testid='form-title-input'
            />
          </div>

          {/* Body Content */}
          <div>
            <label style={labelStyle}>
              Nội dung chi tiết <span style={{ color: colors.danger }}>*</span>
            </label>
            <textarea
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              placeholder='Nhập nội dung thông báo, liên kết hình ảnh banner, điều khoản chính sách...'
              rows={5}
              required
              data-testid='form-body-textarea'
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: radius.md,
                border: `1px solid ${colors.hairline}`,
                fontFamily: fonts.body,
                fontSize: '0.92rem',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Display Time Window */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Thời gian bắt đầu hiển thị</label>
              <input
                type='datetime-local'
                value={formDisplayFrom}
                onChange={(e) => setFormDisplayFrom(e.target.value)}
                style={dateTimeInputStyle}
                data-testid='form-display-from'
              />
            </div>
            <div>
              <label style={labelStyle}>Thời gian kết thúc hiển thị</label>
              <input
                type='datetime-local'
                value={formDisplayTo}
                onChange={(e) => setFormDisplayTo(e.target.value)}
                style={dateTimeInputStyle}
                data-testid='form-display-to'
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button type='button' variant='secondary' onClick={() => setIsModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              type='submit'
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid='form-submit-btn'
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Send size={15} />
              {editingItem ? 'Lưu cập nhật' : 'Xuất bản nội dung'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Archive Dialog */}
      {archivingItem && (
        <ConfirmDialog
          open={!!archivingItem}
          title='Lưu trữ nội dung này?'
          message={`Nội dung "${archivingItem.title}" sẽ được ẩn khỏi trang chủ và chuyển vào danh sách lưu trữ.`}
          confirmLabel='Đồng ý lưu trữ'
          cancelLabel='Hủy'
          danger
          onConfirm={() => archiveMutation.mutate(archivingItem.id)}
          onCancel={() => setArchivingItem(null)}
        />
      )}
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const eyebrowStyle: CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 700,
  color: colors.accent,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: '0 0 4px 0'
}

const titleStyle: CSSProperties = {
  fontSize: '1.75rem',
  fontWeight: 800,
  fontFamily: fonts.display,
  color: colors.ink,
  margin: '0 0 6px 0'
}

const subtitleStyle: CSSProperties = {
  fontSize: '0.95rem',
  color: colors.slate,
  margin: 0
}

const summaryGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 14,
  margin: '24px 0'
}

const summaryCardStyle: CSSProperties = {
  background: '#ffffff',
  padding: '16px 20px',
  borderRadius: radius.md,
  border: `1px solid ${colors.hairline}`,
  boxShadow: shadows.sm,
  display: 'flex',
  flexDirection: 'column',
  gap: 4
}

const summaryValueStyle: CSSProperties = {
  fontSize: '1.65rem',
  fontWeight: 800,
  color: colors.ink,
  lineHeight: 1
}

const summaryLabelStyle: CSSProperties = {
  fontSize: '0.82rem',
  fontWeight: 600,
  color: colors.slate
}

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 14,
  padding: 16,
  background: '#ffffff',
  borderRadius: radius.md,
  border: `1px solid ${colors.hairline}`,
  boxShadow: shadows.sm,
  marginBottom: 20,
  flexWrap: 'wrap'
}

const selectStyle: CSSProperties = {
  padding: '9px 12px',
  borderRadius: radius.md,
  border: `1px solid ${colors.hairline}`,
  background: '#ffffff',
  fontFamily: fonts.body,
  fontSize: '0.88rem',
  color: colors.ink,
  outline: 'none',
  minWidth: 160
}

const dateTimeInputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: radius.md,
  border: `1px solid ${colors.hairline}`,
  fontSize: '0.88rem',
  fontFamily: fonts.body,
  boxSizing: 'border-box'
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: colors.slate,
  marginBottom: 6
}

const tableCardStyle: CSSProperties = {
  background: '#ffffff',
  borderRadius: radius.md,
  border: `1px solid ${colors.hairline}`,
  boxShadow: shadows.sm,
  overflow: 'hidden'
}

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '14px 16px',
  fontSize: '0.82rem',
  fontWeight: 700,
  color: colors.slate,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  background: '#f8fafc',
  borderBottom: `1px solid ${colors.hairline}`
}

const tdStyle: CSSProperties = {
  padding: '14px 16px',
  verticalAlign: 'middle',
  fontSize: '0.9rem'
}

const emptyStateStyle: CSSProperties = {
  background: '#ffffff',
  padding: '48px 24px',
  borderRadius: radius.md,
  border: `1px dashed ${colors.hairline}`,
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center'
}
