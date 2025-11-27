'use client';

import Link from 'next/link';

import { cn } from '@/lib/utils';

interface SidebarLinkProps {
  href: string;
  isActive?: boolean;
  children: React.ReactNode;
  className?: string;
  variant?: 'nav' | 'filter' | 'footer';
}

export function SidebarLink({ 
  href, 
  isActive, 
  children, 
  className,
  variant = 'nav'
}: SidebarLinkProps) {
  const baseStyles = 'flex items-center rounded-lg text-sm';
  
  const variants = {
    nav: cn(
      'h-10 px-3',
      isActive
        ? 'bg-neutral-100 text-neutral-900 font-medium'
        : 'text-neutral-600 hover:bg-neutral-50'
    ),
    filter: 'w-full h-8 px-3 text-neutral-600 hover:bg-neutral-50',
    footer: 'text-neutral-500 hover:text-neutral-900'
  };

  return (
    <Link
      href={href}
      className={cn(baseStyles, variants[variant], className)}
    >
      {children}
    </Link>
  );
} 