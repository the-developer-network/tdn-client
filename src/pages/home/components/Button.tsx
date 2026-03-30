import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  // Base styling for all buttons
  const baseClass = 'font-semibold rounded-full transition-all duration-200 active:scale-95 inline-flex items-center justify-center cursor-pointer';

  // Variant specific colors
  const variantClasses = {
    primary: 'bg-white text-black hover:bg-gray-200 shadow-sm',
    secondary: 'bg-zinc-800 text-white hover:bg-zinc-700',
  };

  // Size specifications
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3 text-lg',
  };

  // Combine classes without needing external libraries like clsx or tailwind-merge
  const combinedClasses = [baseClass, variantClasses[variant], sizeClasses[size], className].filter(Boolean).join(' ');

  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
}