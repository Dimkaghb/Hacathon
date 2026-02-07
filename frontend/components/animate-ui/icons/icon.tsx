'use client';

import * as React from 'react';
import { useAnimation, type AnimationControls, type Variants } from 'motion/react';

type IconProps<T extends string = string> = {
  size?: number;
  animation?: T;
  className?: string;
};

type IconWrapperProps<T extends string = string> = IconProps<T> & {
  icon: React.ComponentType<IconProps<T> & { controls: AnimationControls }>;
};

type AnimateIconContextType = {
  controls: AnimationControls;
};

const AnimateIconContext = React.createContext<AnimateIconContextType | null>(null);

function useAnimateIconContext() {
  const context = React.useContext(AnimateIconContext);
  if (!context) {
    throw new Error('useAnimateIconContext must be used within an IconWrapper');
  }
  return context;
}

function getVariants(
  animations: Record<string, Record<string, Variants>>
): Record<string, Variants> {
  return animations['default'] || {};
}

function IconWrapper<T extends string>({
  icon: Icon,
  size = 24,
  className,
  ...props
}: IconWrapperProps<T>) {
  const controls = useAnimation();

  return (
    <AnimateIconContext.Provider value={{ controls }}>
      <div
        className={`inline-flex items-center justify-center pointer-events-none ${className || ''}`}
        data-animated-icon
        ref={(el) => {
          if (!el) return;
          const parent = el.closest('[data-sidebar-link]') || el.parentElement;
          if (!parent) return;

          const enter = () => controls.start('animate');
          const leave = () => controls.start('initial');

          parent.addEventListener('mouseenter', enter);
          parent.addEventListener('mouseleave', leave);

          (el as any)._cleanup = () => {
            parent.removeEventListener('mouseenter', enter);
            parent.removeEventListener('mouseleave', leave);
          };
        }}
      >
        <Icon size={size} controls={controls} {...(props as any)} />
      </div>
    </AnimateIconContext.Provider>
  );
}

export {
  IconWrapper,
  useAnimateIconContext,
  getVariants,
  type IconProps,
  type IconWrapperProps,
};
