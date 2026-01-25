'use client';

import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from 'framer-motion';
import {
  Children,
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

const DOCK_SIZE = 128;
const DEFAULT_MAGNIFICATION = 80;
const DEFAULT_DISTANCE = 140;
const DEFAULT_PANEL_SIZE = 64;

type DockProps = {
  children: React.ReactNode;
  className?: string;
  distance?: number;
  panelHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
  direction?: 'horizontal' | 'vertical';
};
type DockItemProps = {
  className?: string;
  children: React.ReactNode;
};
type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
};
type DockIconProps = {
  className?: string;
  children: React.ReactNode;
};

type DocContextType = {
  mouse: MotionValue;
  spring: SpringOptions;
  magnification: number;
  distance: number;
  direction: 'horizontal' | 'vertical';
};
type DockProviderProps = {
  children: React.ReactNode;
  value: DocContextType;
};

const DockContext = createContext<DocContextType | undefined>(undefined);

function DockProvider({ children, value }: DockProviderProps) {
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

function useDock() {
  const context = useContext(DockContext);
  if (!context) {
    throw new Error('useDock must be used within an DockProvider');
  }
  return context;
}

function Dock({
  children,
  className,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  panelHeight = DEFAULT_PANEL_SIZE,
  direction = 'horizontal',
}: DockProps) {
  const mouse = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxSize = useMemo(() => {
    return Math.max(DOCK_SIZE, magnification + magnification / 2 + 4);
  }, [magnification]);

  const sizeRow = useTransform(isHovered, [0, 1], [panelHeight, maxSize]);
  const size = useSpring(sizeRow, spring);

  const isVertical = direction === 'vertical';

  return (
    <motion.div
      style={{
        [isVertical ? 'width' : 'height']: size,
        scrollbarWidth: 'none',
      }}
      className={cn(
        'mx-2 flex max-w-full overflow-x-auto',
        isVertical ? 'flex-col items-start h-full overflow-y-auto overflow-x-hidden' : 'items-end'
      )}
    >
      <motion.div
        onMouseMove={({ pageX, pageY }) => {
          isHovered.set(1);
          mouse.set(isVertical ? pageY : pageX);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouse.set(Infinity);
        }}
        className={cn(
          'mx-auto flex w-fit gap-4 rounded-2xl bg-gray-50 px-4 dark:bg-neutral-900',
          isVertical ? 'flex-col py-4 h-full' : 'items-end h-full',
          className
        )}
        style={{ 
          [isVertical ? 'width' : 'height']: panelHeight 
        }}
        role='toolbar'
        aria-label='Application dock'
      >
        <DockProvider value={{ mouse, spring, distance, magnification, direction }}>
          {children}
        </DockProvider>
      </motion.div>
    </motion.div>
  );
}

function DockItem({ children, className }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { distance, magnification, mouse, spring, direction } = useDock();

  const isHovered = useMotionValue(0);
  const isVertical = direction === 'vertical';

  const mouseDistance = useTransform(mouse, (val) => {
    const domRect = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0, y: 0, height: 0 };
    if (isVertical) {
        return val - domRect.y - domRect.height / 2;
    }
    return val - domRect.x - domRect.width / 2;
  });

  const sizeTransform = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [40, magnification, 40]
  );

  const size = useSpring(sizeTransform, spring);

  return (
    <motion.div
      ref={ref}
      style={{ 
          [isVertical ? 'height' : 'width']: size,
          [isVertical ? 'width' : 'height']: size, // Keep aspect square
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      className={cn(
        'relative inline-flex items-center justify-center',
        className
      )}
      tabIndex={0}
      role='button'
      aria-haspopup='true'
    >
      {Children.map(children, (child) =>
        cloneElement(child as React.ReactElement<any>, { width: size, isHovered })
      )}
    </motion.div>
  );
}

function DockLabel({ children, className, ...rest }: DockLabelProps) {
  const restProps = rest as Record<string, unknown>;
  const isHovered = restProps['isHovered'] as MotionValue<number>;
  const [isVisible, setIsVisible] = useState(false);
  const { direction } = useDock();
  const isVertical = direction === 'vertical';

  useEffect(() => {
    const unsubscribe = isHovered.on('change', (latest) => {
      setIsVisible(latest === 1);
    });

    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0, x: 0 }}
          animate={{ 
              opacity: 1, 
              y: isVertical ? 0 : -10,
              x: isVertical ? 10 : 0
          }}
          exit={{ opacity: 0, y: 0, x: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'absolute w-fit whitespace-pre rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-neutral-700 dark:border-neutral-900 dark:bg-neutral-800 dark:text-white',
            isVertical ? 'left-full top-1/2 -translate-y-1/2 ml-2' : '-top-6 left-1/2 -translate-x-1/2',
            className
          )}
          role='tooltip'
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className, ...rest }: DockIconProps) {
  const restProps = rest as Record<string, unknown>;
  const width = restProps['width'] as MotionValue<number>;

  const widthTransform = useTransform(width, (val) => val / 2);

  return (
    <motion.div
      style={{ width: widthTransform, height: widthTransform }}
      className={cn('flex items-center justify-center', className)}
    >
      {children}
    </motion.div>
  );
}

export { Dock, DockIcon, DockItem, DockLabel };
