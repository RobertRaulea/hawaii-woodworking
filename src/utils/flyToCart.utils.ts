const MOBILE_BREAKPOINT = 768;
const FLIGHT_DURATION_DESKTOP_MS = 650;
const FLIGHT_DURATION_MOBILE_MS = 550;
const PULSE_DURATION_MS = 300;
const FLIGHT_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
const PLACEHOLDER_IMAGE = 'https://placehold.co/100x100?text=No+Image';

const pulse = (target: HTMLElement) => {
  target.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }],
    { duration: PULSE_DURATION_MS, easing: 'ease-out' }
  );
  const badge = document.querySelector<HTMLElement>('[data-cart-badge]');
  badge?.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(1)' }],
    { duration: PULSE_DURATION_MS, easing: 'ease-out' }
  );
};

export const flyToCart = (sourceEl: HTMLElement, imageUrl: string): void => {
  if (typeof Element.prototype.animate !== 'function') return;
  const target = document.querySelector<HTMLElement>('[data-cart-icon]');
  if (!target) return;

  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    pulse(target);
    return;
  }

  const sourceRect = sourceEl.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const startX = sourceRect.left + sourceRect.width / 2;
  const startY = sourceRect.top + sourceRect.height / 2;
  const endX = targetRect.left + targetRect.width / 2;
  const endY = targetRect.top + targetRect.height / 2;

  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  const size = isMobile ? 40 : 56;
  const distance = Math.hypot(endX - startX, endY - startY);
  const arcHeight = Math.min(120, distance * 0.35);
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2 - arcHeight;

  const img = document.createElement('img');
  img.src = imageUrl || PLACEHOLDER_IMAGE;
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  Object.assign(img.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: `${size}px`,
    height: `${size}px`,
    pointerEvents: 'none',
    zIndex: '100',
    borderRadius: '9999px',
    objectFit: 'cover',
    border: '2px solid #ffffff',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
  });
  document.body.appendChild(img);

  const offset = size / 2;
  const animation = img.animate(
    [
      {
        transform: `translate(${startX - offset}px, ${startY - offset}px) scale(1)`,
        opacity: 1,
      },
      {
        transform: `translate(${midX - offset}px, ${midY - offset}px) scale(0.8)`,
        opacity: 1,
      },
      {
        transform: `translate(${endX - offset}px, ${endY - offset}px) scale(0.3)`,
        opacity: 0.6,
      },
    ],
    {
      duration: isMobile ? FLIGHT_DURATION_MOBILE_MS : FLIGHT_DURATION_DESKTOP_MS,
      easing: FLIGHT_EASING,
      fill: 'forwards',
    }
  );
  animation.onfinish = () => {
    img.remove();
    pulse(target);
  };
  animation.oncancel = () => {
    img.remove();
  };
};
