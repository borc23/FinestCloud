'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
  className?: string
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const variantClass = `btn-${variant}`
  const sizeClass = size !== 'md' ? `btn-${size}` : ''
  const loadingClass = loading ? 'btn-loading' : ''

  const classes = [
    'btn',
    variantClass,
    sizeClass,
    loadingClass,
    className
  ].filter(Boolean).join(' ')

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {!loading && children}
    </button>
  )
}
