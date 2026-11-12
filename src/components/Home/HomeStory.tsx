import type React from 'react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HOME_VIDEO } from '@/constants/homeVideo.constants';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { scrollToId } from '@/utils/scroll.utils';
import { cn } from '@/utils/cn.utils';

const SCENE_COUNT = 8;

const SCENE_CAMERA: { position: string; scale: number }[] = [
  { position: '50% 50%', scale: 1.12 },
  { position: '30% 40%', scale: 1.3 },
  { position: '55% 25%', scale: 1.42 },
  { position: '40% 55%', scale: 1.28 },
  { position: '65% 45%', scale: 1.4 },
  { position: '35% 30%', scale: 1.32 },
  { position: '60% 60%', scale: 1.38 },
  { position: '50% 50%', scale: 1.1 },
];

interface SceneDef {
  kicker?: string;
  year?: boolean;
  title: string;
  text?: string;
  quote?: string;
  cta?: boolean;
  heroTitle?: boolean;
  scrollHint?: string;
}

const slowConnection = () => {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  return (
    connection?.saveData === true ||
    connection?.effectiveType === 'slow-2g' ||
    connection?.effectiveType === '2g' ||
    connection?.effectiveType === '3g'
  );
};

const SceneWords: React.FC<{ text: string; active: boolean }> = ({
  text,
  active,
}) => (
  <>
    {text.split(' ').map((word, i) => (
      <Fragment key={i}>
        {i > 0 ? ' ' : ''}
        <span
          className="inline-block transition-all duration-500 ease-out"
          style={{
            transitionDelay: active ? `${i * 60}ms` : '0ms',
            opacity: active ? 1 : 0,
            transform: active ? 'translateY(0)' : 'translateY(0.5em)',
          }}
        >
          {word}
        </span>
      </Fragment>
    ))}
  </>
);

const SceneYear: React.FC<{ active: boolean }> = ({ active }) => {
  const reducedMotion = useReducedMotion();
  const [value, setValue] = useState('2020');

  useEffect(() => {
    if (!active || reducedMotion) {
      setValue('2020');
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 1200);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(String(Math.round(1990 + 30 * eased)));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, reducedMotion]);

  return (
    <p
      aria-hidden="true"
      className="font-serif text-6xl leading-none text-amber-400 sm:text-8xl"
    >
      {value}
    </p>
  );
};

export const HomeStory: React.FC = () => {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeRef = useRef(0);
  const topOffsetRef = useRef(0);
  const pausedByUser = useRef(false);
  const rafRef = useRef(0);
  const [active, setActive] = useState(0);
  const [topOffset, setTopOffset] = useState(0);
  const [spotlight, setSpotlight] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [paused, setPaused] = useState(true);

  const scenes: SceneDef[] = [
    {
      kicker: t('home.story.scene0.kicker'),
      heroTitle: true,
      title: `${t('hero.titleLine1')} ${t('hero.titleLine2')}`,
      cta: true,
      scrollHint: t('home.story.scene0.scrollHint'),
    },
    {
      kicker: t('home.story.scene1.kicker'),
      title: t('home.story.scene1.title'),
      text: t('home.story.scene1.text'),
    },
    {
      kicker: t('home.story.scene2.kicker'),
      title: t('home.story.scene2.title'),
      text: t('home.story.scene2.text'),
    },
    {
      kicker: t('home.story.scene3.kicker'),
      title: t('home.story.scene3.title'),
      text: t('home.story.scene3.text'),
    },
    {
      kicker: t('home.story.scene4.kicker'),
      year: true,
      title: t('home.story.scene4.title'),
      text: t('home.story.scene4.text'),
    },
    {
      kicker: t('home.story.scene5.kicker'),
      title: t('home.story.scene5.title'),
      text: t('home.story.scene5.text'),
    },
    {
      kicker: t('home.story.scene6.kicker'),
      title: t('home.story.scene6.title'),
      text: t('home.story.scene6.text'),
    },
    {
      kicker: t('home.story.scene7.kicker'),
      title: t('home.story.scene7.title'),
      text: t('home.story.scene7.text'),
      quote: t('home.story.scene7.quote'),
      cta: true,
    },
  ];

  const update = useCallback(() => {
    const wrapper = wrapperRef.current;
    const stage = stageRef.current;
    if (!wrapper || !stage) {
      return;
    }
    const header = document.querySelector('header');
    const headerHeight = header?.offsetHeight ?? 0;
    if (headerHeight !== topOffsetRef.current) {
      topOffsetRef.current = headerHeight;
      setTopOffset(headerHeight);
    }
    const rect = wrapper.getBoundingClientRect();
    const scrollable = Math.max(rect.height - stage.offsetHeight, 1);
    const progress = Math.min(
      1,
      Math.max(0, (headerHeight - rect.top) / scrollable),
    );
    stage.style.setProperty('--story-progress', progress.toFixed(4));
    stage.style.setProperty(
      '--story-py',
      `${((progress - 0.5) * -40).toFixed(1)}px`,
    );
    const index = Math.min(
      SCENE_COUNT - 1,
      Math.floor(progress * SCENE_COUNT),
    );
    if (index !== activeRef.current) {
      activeRef.current = index;
      setActive(index);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [update]);

  useEffect(() => {
    if (
      reducedMotion ||
      typeof window.matchMedia !== 'function' ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      return;
    }
    setSpotlight(true);
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    let raf = 0;
    const onPointerMove = (event: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = stage.getBoundingClientRect();
        stage.style.setProperty(
          '--story-sx',
          `${(event.clientX - rect.left).toFixed(0)}px`,
        );
        stage.style.setProperty(
          '--story-sy',
          `${(event.clientY - rect.top).toFixed(0)}px`,
        );
      });
    };
    stage.addEventListener('pointermove', onPointerMove);
    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener('pointermove', onPointerMove);
    };
  }, [reducedMotion]);

  // Deferred video start: only after load + idle, on a capable connection,
  // and only when the stage is in or near the viewport.
  useEffect(() => {
    if (reducedMotion || slowConnection()) {
      return;
    }
    let timeoutId = 0;
    let started = false;
    const nearViewport = () => {
      const stage = stageRef.current;
      if (!stage) {
        return false;
      }
      const rect = stage.getBoundingClientRect();
      return rect.top < window.innerHeight * 1.5 && rect.bottom > 0;
    };
    const start = () => {
      if (started || !nearViewport()) {
        return;
      }
      started = true;
      window.removeEventListener('scroll', start);
      setVideoStarted(true);
    };
    const kick = () => {
      const w = window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => number;
      };
      if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(start, { timeout: 1500 });
      } else {
        timeoutId = window.setTimeout(start, 800);
      }
      window.addEventListener('scroll', start, { passive: true });
    };
    if (document.readyState === 'complete') {
      kick();
    } else {
      window.addEventListener('load', kick, { once: true });
    }
    return () => {
      window.removeEventListener('load', kick);
      window.removeEventListener('scroll', start);
      window.clearTimeout(timeoutId);
    };
  }, [reducedMotion]);

  // Video playback: autoplay on mount, pause off-screen / hidden.
  useEffect(() => {
    const video = videoRef.current;
    const stage = stageRef.current;
    if (!videoStarted || videoFailed || !video || !stage) {
      return;
    }
    const tryPlay = () => void video.play().catch(() => undefined);
    if (typeof IntersectionObserver === 'undefined') {
      if (!document.hidden) {
        tryPlay();
      }
      return;
    }
    let inView = true;
    const observer = new IntersectionObserver(
      (entries) => {
        inView = entries[0].isIntersecting;
        if (inView && !pausedByUser.current && !document.hidden) {
          tryPlay();
        } else {
          video.pause();
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(stage);
    const onVisibility = () => {
      if (document.hidden) {
        video.pause();
      } else if (inView && !pausedByUser.current) {
        tryPlay();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [videoStarted, videoFailed]);

  const scrollToScene = (index: number) => {
    const wrapper = wrapperRef.current;
    const stage = stageRef.current;
    if (!wrapper || !stage) {
      return;
    }
    const top = wrapper.getBoundingClientRect().top + window.scrollY;
    const scrollable = Math.max(wrapper.offsetHeight - stage.offsetHeight, 1);
    window.scrollTo({
      top: top + ((index + 0.5) / SCENE_COUNT) * scrollable,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  const scrollToProducts = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    scrollToId('produse');
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (video.paused) {
      pausedByUser.current = false;
      void video.play().catch(() => undefined);
    } else {
      pausedByUser.current = true;
      video.pause();
    }
  };

  const videoSrc =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 767px)').matches
      ? HOME_VIDEO.src480
      : HOME_VIDEO.src720;
  const showVideoButton = videoStarted && !videoFailed;

  return (
    <section
      ref={wrapperRef}
      aria-labelledby="home-story-heading"
      className="relative h-[600vh]"
      style={{ height: '600svh' }}
    >
      <div
        ref={stageRef}
        className="sticky top-[var(--story-top)] h-[calc(100vh-var(--story-top))] overflow-hidden bg-stone-950 supports-[height:100svh]:h-[calc(100svh-var(--story-top))]"
        style={{ '--story-top': `${topOffset}px` } as React.CSSProperties}
      >
        {/* Poster (LCP) + deferred video, travelling across the frame */}
        <div aria-hidden="true" className="absolute inset-0">
          <div
            className="h-full w-full transition-transform duration-[1200ms] ease-out"
            style={{
              transform: `translateY(var(--story-py, 0px)) scale(${SCENE_CAMERA[active].scale})`,
            }}
          >
            <img
              src={HOME_VIDEO.poster}
              srcSet={`${HOME_VIDEO.poster} 1280w`}
              sizes="100vw"
              alt=""
              decoding="async"
              ref={(img) => img?.setAttribute('fetchpriority', 'high')}
              className="h-full w-full object-cover transition-[object-position] duration-[1200ms] ease-out"
              style={{ objectPosition: SCENE_CAMERA[active].position }}
            />
            {videoStarted && !videoFailed ? (
              <video
                ref={videoRef}
                src={videoSrc}
                muted
                loop
                playsInline
                preload="auto"
                tabIndex={-1}
                onCanPlay={() => setVideoReady(true)}
                onError={() => setVideoFailed(true)}
                onPlay={() => setPaused(false)}
                onPause={() => setPaused(true)}
                className={`absolute inset-0 h-full w-full object-cover transition-[opacity,object-position] duration-[800ms,1200ms] ease-out ${
                  videoReady ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ objectPosition: SCENE_CAMERA[active].position }}
              />
            ) : null}
          </div>
        </div>
        <div aria-hidden="true" className="absolute inset-0 bg-stone-950/55" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-stone-950/85 via-stone-950/40 to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-stone-950/40"
        />
        {spotlight ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[5]"
            style={{
              background:
                'radial-gradient(540px circle at var(--story-sx, 50%) var(--story-sy, 40%), rgb(245 158 11 / 0.14), transparent 65%)',
            }}
          />
        ) : null}

        {/* Scroll progress line */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 z-20 h-0.5 w-full origin-left bg-amber-500/80"
          style={{ transform: 'scaleX(var(--story-progress, 0))' }}
        />

        {/* Scene panels */}
        {scenes.map((scene, index) => {
          const isActive = index === active;
          const HeadingTag = index === 0 ? 'h1' : index === 1 ? 'h2' : 'h3';
          return (
            <div
              key={index}
              aria-hidden={!isActive}
              className={cn(
                'absolute inset-0 z-10 transition-[opacity,visibility] duration-700',
                isActive
                  ? 'visible opacity-100'
                  : 'invisible opacity-0 pointer-events-none',
              )}
            >
              <div className="mx-auto flex h-full max-w-7xl items-center px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-20">
                <div className="max-w-[36rem] lg:max-w-[40rem]">
                  {scene.kicker ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
                      {scene.kicker}
                    </p>
                  ) : null}
                  {scene.year ? <SceneYear active={isActive} /> : null}
                  <HeadingTag
                    id={index === 1 ? 'home-story-heading' : undefined}
                    className={cn(
                      'mt-3 font-serif font-medium leading-[1.08] text-white',
                      index === 0
                        ? 'text-4xl sm:text-6xl lg:text-7xl'
                        : 'text-3xl sm:text-4xl lg:text-6xl',
                    )}
                  >
                    {index === 0 ? (
                      <>
                        <SceneWords
                          text={t('hero.titleLine1')}
                          active={isActive}
                        />{' '}
                        <SceneWords
                          text={t('hero.titleLine2')}
                          active={isActive}
                        />
                      </>
                    ) : (
                      <SceneWords text={scene.title} active={isActive} />
                    )}
                  </HeadingTag>
                  {scene.text ? (
                    <p
                      className={cn(
                        'mt-4 text-[15px] leading-6 text-white/85 transition-all duration-500 ease-out sm:mt-5 sm:text-lg sm:leading-relaxed lg:text-xl',
                        isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
                      )}
                      style={{
                        transitionDelay: isActive ? '250ms' : '0ms',
                      }}
                    >
                      {scene.text}
                    </p>
                  ) : null}
                  {scene.quote ? (
                    <p className="mt-6 font-serif text-xl font-medium text-amber-300 sm:text-2xl">
                      {scene.quote}
                    </p>
                  ) : null}
                  {scene.cta ? (
                    <div
                      className={cn(
                        'mt-6 transition-all duration-500 ease-out sm:mt-8',
                        isActive
                          ? 'translate-y-0 opacity-100'
                          : 'translate-y-4 opacity-0',
                      )}
                      style={{ transitionDelay: isActive ? '350ms' : '0ms' }}
                    >
                      <Button
                        asChild
                        size="lg"
                        className="bg-amber-500 font-semibold text-stone-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-400 hover:shadow-[0_10px_25px_-10px_rgba(245,158,11,0.5)]"
                      >
                        <a
                          href="#produse"
                          tabIndex={isActive ? 0 : -1}
                          onClick={scrollToProducts}
                        >
                          {t('hero.viewProducts')}
                        </a>
                      </Button>
                    </div>
                  ) : null}
                  {scene.scrollHint ? (
                    <div
                      aria-hidden="true"
                      className={cn(
                        'mt-8 flex items-center gap-2 text-white/60 transition-opacity duration-500',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    >
                      <ChevronDown className="size-4 motion-safe:animate-bounce" />
                      <span className="text-xs uppercase tracking-[0.2em]">
                        {scene.scrollHint}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        {/* Scene navigation dots */}
        <nav
          aria-label={t('home.story.ariaLabel')}
          className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 lg:bottom-auto lg:left-auto lg:right-4 lg:top-1/2 lg:-translate-x-0 lg:-translate-y-1/2 lg:flex-col"
        >
          {scenes.map((scene, index) => (
            <button
              key={index}
              type="button"
              onClick={() => scrollToScene(index)}
              aria-label={t('home.story.sceneAriaLabel', {
                n: index + 1,
                title: scene.title,
              })}
              aria-current={index === active ? 'true' : undefined}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <span
                className={cn(
                  'rounded-full transition-all duration-300',
                  index === active
                    ? 'h-2.5 w-2.5 bg-amber-400'
                    : 'h-1.5 w-1.5 bg-white/40 hover:bg-white/70',
                )}
              />
            </button>
          ))}
        </nav>

        {/* Video play/pause */}
        {showVideoButton ? (
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={
              paused ? t('home.video.playLabel') : t('home.video.pauseLabel')
            }
            className="absolute bottom-4 right-4 z-20 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-stone-950/70 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-stone-950/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 lg:bottom-6 lg:right-6"
          >
            {paused ? (
              <Play className="size-5" aria-hidden="true" />
            ) : (
              <Pause className="size-5" aria-hidden="true" />
            )}
          </button>
        ) : null}

        {/* Full text for assistive technology */}
        <ol className="sr-only">
          {scenes.map((scene, index) => (
            <li key={index}>
              {[scene.kicker, scene.title, scene.text, scene.quote]
                .filter(Boolean)
                .join('. ')}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};
