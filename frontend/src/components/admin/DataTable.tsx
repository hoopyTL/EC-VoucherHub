import type { CSSProperties, ReactNode, TableHTMLAttributes } from 'react'

export interface DataTableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode
  containerStyle?: CSSProperties
  accessibleLabel?: string
}

/** Shared semantic table shell for administration and partner workspaces. */
export function DataTable({ children, className = '', containerStyle, accessibleLabel, ...props }: DataTableProps) {
  return (
    <div
      className='data-table-shell'
      style={{
        overflowX: 'auto',
        border: '1px solid var(--line)',
        borderRadius: 12,
        background: 'var(--surface)',
        ...containerStyle
      }}
    >
      <table
        {...props}
        aria-label={accessibleLabel}
        className={`admin-data-table ${className}`.trim()}
        style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680, ...(props.style ?? {}) }}
      >
        {children}
      </table>
    </div>
  )
}

export default DataTable
