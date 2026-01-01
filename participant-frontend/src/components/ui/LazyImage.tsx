import { useState, useEffect, useRef, forwardRef } from 'react';
import type { ImgHTMLAttributes } from 'react';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholderSrc?: string;
}

// Transparent 1x1 pixel placeholder to avoid empty src warning
const TRANSPARENT_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Lazy-loads an image when it is near the viewport using IntersectionObserver.
 * @param props - Image props
 * @param ref - Forwarded ref to the underlying img element
 */
export const LazyImage = forwardRef<HTMLImageElement, LazyImageProps>(({ src, alt, placeholderSrc, onLoad, ...props }, ref) => {
  const [imageSrc, setImageSrc] = useState(placeholderSrc || TRANSPARENT_PLACEHOLDER);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const setRefs = (node: HTMLImageElement | null): void => {
    imgRef.current = node;
    if (!ref) return;
    if (typeof ref === 'function') {
      ref(node);
      return;
    }
    ref.current = node;
  };

  useEffect(() => {
    let observer: IntersectionObserver;
    const currentImg = imgRef.current;

    if (currentImg) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        },
        { rootMargin: '0px 0px 100px 0px' } // Load when 100px from viewport
      );
      observer.observe(currentImg);
    }

    return () => {
      if (observer && currentImg) {
        observer.unobserve(currentImg);
      }
    };
  }, [src]);

  /**
   * Marks the image as loaded and forwards the load event if provided.
   * @param e - Load event
   */
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    setImageLoaded(true);
    onLoad?.(e);
  };

  return (
    <img
      ref={setRefs}
      src={imageSrc}
      alt={alt}
      onLoad={handleImageLoad}
      className={`${props.className || ''} ${!imageLoaded ? 'blur-sm animate-pulse' : ''}`}
      {...props}
    />
  );
});

LazyImage.displayName = 'LazyImage';

