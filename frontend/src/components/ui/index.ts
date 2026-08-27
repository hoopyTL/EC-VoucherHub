/**
 * Barrel export for the shared UI component library.
 */
export { Button } from './Button'
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button'

export { Input } from './Input'
export type { InputProps } from './Input'

export { Modal } from './Modal'
export { ConfirmDialog } from './ConfirmDialog'
export type { ModalProps, ModalSize } from './Modal'

export { LoadingSpinner } from './LoadingSpinner'
export type { LoadingSpinnerProps, SpinnerSize } from './LoadingSpinner'
export { ContentSkeleton } from './ContentSkeleton'

export { Toast, ToastProvider, useToast } from './Toast'
export type { ToastProps, ToastProviderProps, ToastContextValue, ToastItem, ToastOptions, ToastVariant } from './Toast'

export { Pagination, buildPageRange } from './Pagination'
export type { PaginationProps } from './Pagination'

export { Badge, variantForStatus } from './Badge'
export type { BadgeProps, BadgeVariant } from './Badge'

export { StarRating } from './StarRating'
export type { StarRatingProps } from './StarRating'

export {
  AppPage,
  PageHeader,
  SectionCard,
  MetricCard,
  SearchInput,
  FilterSelect,
  FilterBar,
  EmptyState,
  ErrorState,
  IconButton
} from './LayoutPrimitives'
