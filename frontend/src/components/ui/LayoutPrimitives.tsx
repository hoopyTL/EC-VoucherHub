import type { CSSProperties, ReactNode, SelectHTMLAttributes } from 'react'
import { AlertCircle, Inbox, Search } from 'lucide-react'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { Button } from './Button'

export function AppPage({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <section className='app-page' style={style}>
      {children}
    </section>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className='page-header'>
      <div>
        {eyebrow && <div className='page-header__eyebrow'>{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className='page-header__actions'>{actions}</div>}
    </header>
  )
}

export function SectionCard({
  children,
  title,
  action,
  style
}: {
  children: ReactNode
  title?: ReactNode
  action?: ReactNode
  style?: CSSProperties
}) {
  return (
    <section className='section-card' style={style}>
      {(title || action) && (
        <header className='section-card__header'>
          <h2>{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function MetricCard({
  label,
  value,
  helper,
  icon
}: {
  label: ReactNode
  value: ReactNode
  helper?: ReactNode
  icon?: ReactNode
}) {
  return (
    <article className='metric-card'>
      <div className='metric-card__head'>
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </article>
  )
}

export function SearchInput({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className='search-input' style={style}>
      <Search size={18} aria-hidden='true' />
      <input type='search' {...props} />
    </label>
  )
}

export function FilterSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className='filter-select' {...props} />
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className='filter-bar'>{children}</div>
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className='state-panel' role='status'>
      <Inbox size={30} color={colors.brand} aria-hidden='true' />
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({
  title,
  description,
  onRetry
}: {
  title: ReactNode
  description?: ReactNode
  onRetry?: () => void
}) {
  return (
    <div className='state-panel state-panel--error' role='alert'>
      <AlertCircle size={30} aria-hidden='true' />
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {onRetry && (
        <Button variant='secondary' onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  )
}

export function IconButton({
  label,
  children,
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
}) {
  return (
    <button type='button' aria-label={label} title={label} className='icon-button' style={style} {...props}>
      {children}
    </button>
  )
}

export const primitiveStyles = { colors, fonts, radius, shadows }
