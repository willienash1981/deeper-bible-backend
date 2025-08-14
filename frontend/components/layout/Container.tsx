import { cn } from '@/lib/utils/cn';
import { ContainerProps } from '@/types';

export function Container({ 
  children, 
  className, 
  maxWidth = 'xl' 
}: ContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md', 
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
  };

  return (
    <div className={cn(
      'mx-auto w-full px-4 md:px-6',
      maxWidthClasses[maxWidth],
      className
    )}>
      {children}
    </div>
  );
}