import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/utils/cn.utils';

type WoodenBlock = {
  x: string;
  y: string;
  delay: number;
  size: number;
  color: string;
};

type WoodChip = {
  x: string;
  y: string;
  dx: number;
  dy: number;
  rotate: number;
  size: number;
  color: string;
};

const OAK = '#b8864b';
const PINE = '#d9a95f';
const DARK_OAK = '#8a5a2b';
const WALNUT = '#5c3a1e';

const BLOCKS: WoodenBlock[] = [
  { x: '0%', y: '-22px', delay: 0.0, size: 20, color: OAK },
  { x: '18%', y: '-20px', delay: 0.09, size: 16, color: PINE },
  { x: '38%', y: '-24px', delay: 0.18, size: 22, color: DARK_OAK },
  { x: '58%', y: '-20px', delay: 0.06, size: 18, color: OAK },
  { x: '78%', y: '-22px', delay: 0.15, size: 16, color: WALNUT },
  { x: '94%', y: '-20px', delay: 0.24, size: 20, color: PINE },
  { x: '4%', y: 'calc(100% + 6px)', delay: 0.3, size: 18, color: DARK_OAK },
  { x: '26%', y: 'calc(100% + 8px)', delay: 0.12, size: 14, color: OAK },
  { x: '48%', y: 'calc(100% + 6px)', delay: 0.36, size: 20, color: WALNUT },
  { x: '70%', y: 'calc(100% + 8px)', delay: 0.21, size: 16, color: PINE },
  { x: '90%', y: 'calc(100% + 6px)', delay: 0.42, size: 18, color: OAK },
  { x: 'var(--block-left)', y: '16%', delay: 0.27, size: 18, color: PINE },
  { x: 'var(--block-left)', y: '46%', delay: 0.39, size: 14, color: WALNUT },
  { x: 'var(--block-left)', y: '74%', delay: 0.15, size: 18, color: DARK_OAK },
  { x: 'var(--block-right)', y: '16%', delay: 0.33, size: 16, color: OAK },
  { x: 'var(--block-right)', y: '46%', delay: 0.21, size: 16, color: PINE },
  { x: 'var(--block-right)', y: '74%', delay: 0.45, size: 18, color: WALNUT },
];

const CHIPS: WoodChip[] = [
  { x: '8%', y: '0%', dx: -0.6, dy: -1, rotate: -90, size: 6, color: PINE },
  { x: '35%', y: '0%', dx: -0.2, dy: -1, rotate: 60, size: 5, color: OAK },
  { x: '62%', y: '0%', dx: 0.2, dy: -1, rotate: -45, size: 7, color: DARK_OAK },
  { x: '92%', y: '0%', dx: 0.7, dy: -0.9, rotate: 80, size: 5, color: PINE },
  { x: '0%', y: '45%', dx: -0.55, dy: -0.2, rotate: 45, size: 6, color: WALNUT },
  { x: '96%', y: '45%', dx: 0.55, dy: -0.1, rotate: -70, size: 6, color: OAK },
  { x: '15%', y: '100%', dx: -0.5, dy: 1, rotate: 120, size: 5, color: DARK_OAK },
  { x: '50%', y: '100%', dx: 0, dy: 1, rotate: -30, size: 7, color: PINE },
  { x: '85%', y: '100%', dx: 0.6, dy: 1, rotate: 75, size: 6, color: OAK },
];

type WoodenLoginRevealProps = {
  children: ReactNode;
  className?: string;
};

export const WoodenLoginReveal = ({
  children,
  className,
}: WoodenLoginRevealProps) => (
  <div className={cn('wooden-login-reveal', className)}>
    <div
      aria-hidden="true"
      className="wooden-login-reveal__stage pointer-events-none"
    >
      {BLOCKS.map((block, index) => (
        <span
          key={`block-${index}`}
          className="wooden-login-reveal__block"
          style={
            {
              left: block.x,
              top: block.y,
              width: `${block.size}px`,
              height: `${block.size}px`,
              '--block-color': block.color,
              '--block-delay': `${block.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
    <div className="wooden-login-reveal__card">{children}</div>
    <div
      aria-hidden="true"
      className="wooden-login-reveal__frame pointer-events-none"
    />
    <div
      aria-hidden="true"
      className="wooden-login-reveal__chips pointer-events-none"
    >
      {CHIPS.map((chip, index) => (
        <span
          key={`chip-${index}`}
          className="wooden-login-reveal__chip"
          style={
            {
              left: chip.x,
              top: chip.y,
              width: `${chip.size}px`,
              height: `${chip.size}px`,
              '--chip-color': chip.color,
              '--chip-dx': chip.dx,
              '--chip-dy': chip.dy,
              '--chip-rotate': `${chip.rotate}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  </div>
);
