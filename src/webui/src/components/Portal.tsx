import React from 'react'
import { createPortal } from 'react-dom'

// Portal that renders children directly to document.body - simplified version
export function Portal({ children }: { children: React.ReactNode }): React.ReactPortal | null {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
