interface ContentSkeletonProps {
  rows?: number
  variant?: 'cards' | 'table' | 'detail'
  label?: string
}

/** Shape-preserving, accessible loading placeholder for page-level content. */
export function ContentSkeleton({ rows = 4, variant = 'table', label = 'Đang tải dữ liệu' }: ContentSkeletonProps) {
  return (
    <div className={`content-skeleton content-skeleton--${variant}`} role='status' aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <div className='content-skeleton__row' key={index}>
          <span className='content-skeleton__media' />
          <span className='content-skeleton__copy'>
            <i />
            <i />
          </span>
          <span className='content-skeleton__action' />
        </div>
      ))}
      <span className='sr-only'>{label}</span>
    </div>
  )
}

export default ContentSkeleton
