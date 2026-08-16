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
  const [imgSrc, setImgSrc] = useState<string>(fallbackSrc)

  useEffect(() => {
    if (src) {
      setImgSrc(src)
    } else {
      setImgSrc(fallbackSrc)
    }
  }, [src, fallbackSrc])

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc)
    }
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={handleError}
      className={className}
      {...props}
    />
  )
}
