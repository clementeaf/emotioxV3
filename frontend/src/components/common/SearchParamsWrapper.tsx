'use client';

import { ComponentType, ReactNode, Suspense } from 'react';

interface SearchParamsWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Componente wrapper que envuelve su contenido en un Suspense boundary
 * para manejar correctamente los hooks de Next.js que requieren Suspense
 * como useSearchParams, usePathname, etc.
 */
export function SearchParamsWrapper({
  children,
  fallback = <div className="p-4 text-center">Loading...</div>
}: SearchParamsWrapperProps) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}

/**
 * HOC (High Order Component) que envuelve un componente en un Suspense boundary
 * útil para componentes que usan useSearchParams o similares
 */
export function withSearchParams<P extends object>(Component: ComponentType<P>) {
  return function WithSearchParamsWrapper(props: P) {
    return (
      <SearchParamsWrapper>
        <Component {...props} />
      </SearchParamsWrapper>
    );
  };
}
