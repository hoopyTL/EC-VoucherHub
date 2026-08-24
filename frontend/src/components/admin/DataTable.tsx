import type { CSSProperties, ReactNode, TableHTMLAttributes } from 'react'

export interface DataTableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode
  containerStyle?: CSSProperties
  accessibleLabel?: string
}

/** Shared semantic table shell for administration and partner workspaces. */
export function DataTable({ children, className = '', containerStyle, accessibleLabel, ...props }: DataTableProps) {
  return (
    <div className='data-table-shell' style={containerStyle}>
      <table {...props} aria-label={accessibleLabel} className={`admin-data-table ${className}`.trim()}>
        {children}
      </table>
    </div>
  )
}

export default DataTable
