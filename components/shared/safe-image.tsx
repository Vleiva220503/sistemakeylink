'use client'

import { useState, useEffect } from 'react'

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null
  fallbackSrc?: string
}

export function SafeImage({
  src,
  fallbackSrc = '/logo-mundo-calzado.png',
  alt = 'Imagen',
  className = '',
  ...props
}: SafeImageProps) {
  // H1: Initialize directly with the real src (no fallback on first render).
  // This eliminates the fallback → real-image flash / double-render on every mount.
  const [imgSrc, setImgSrc] = useState<string>(src ?? fallbackSrc)

  // Keep src in sync when the prop changes (e.g. after filtering / navigation).
  useEffect(() => {
    setImgSrc(src ?? fallbackSrc)
  }, [src, fallbackSrc])

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc)
    }
  }

  return (
    // H2: loading="lazy" defers off-screen images; decoding="async" avoids
    // blocking the main thread. Both can be overridden by callers via props
    // (e.g. loading="eager" for above-the-fold hero images).
    <img
      loading="lazy"
      decoding="async"
      src={imgSrc}
      alt={alt}
      onError={handleError}
      className={className}
      {...props}
    />
  )
}
