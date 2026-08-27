import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Megaphone, X } from 'lucide-react'
import { api } from '../../services/api'
import { colors, fonts, shadows } from '../../theme/tokens'

interface PublicContentItem {
  id: string
  type: string
  title: string
  body: string
  status: string
  displayFrom: string | null
  displayTo: string | null
}

export function AnnouncementBar() {
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  const { data: announcements = [] } = useQuery<PublicContentItem[]>({
    queryKey: ['public-announcements'],
    queryFn: async () => {
      const response = await api.get('/content', { params: { type: 'announcement' } })
      return response.data.data?.items ?? []
    },
    staleTime: 60_000
  })

  const activeAnnouncements = announcements.filter((item) => !dismissedIds.includes(item.id))

  if (activeAnnouncements.length === 0) return null

  const current = activeAnnouncements[0]

  return (
    <aside
      role='region'
      aria-label='Thông báo hệ thống'
      data-testid='announcement-bar'
      style={{
        background: colors.ink,
        color: colors.onInk,
        padding: '10px 16px',
        fontSize: '0.88rem',
        fontFamily: fonts.body,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 100,
        boxShadow: shadows.sm
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          maxWidth: 1200,
          margin: '0 auto',
          textAlign: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '2px 8px',
            borderRadius: 9999,
            fontSize: '0.76rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}
        >
          <Megaphone size={13} />
          Thông báo
        </span>
        <strong style={{ fontWeight: 700 }}>{current.title}</strong>
        <span style={{ opacity: 0.9 }}>— {current.body}</span>
      </div>

      <button
        onClick={() => setDismissedIds((prev) => [...prev, current.id])}
        aria-label='Đóng thông báo'
        style={{
          position: 'absolute',
          right: 14,
          background: 'transparent',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.8)',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 4
        }}
      >
        <X size={16} />
      </button>
    </aside>
  )
}
