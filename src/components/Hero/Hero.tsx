import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

const LOCAL_HERO_SRC = '/images/hero-wood-1920.jpg';
const LOCAL_HERO_SRCSET =
  '/images/hero-wood-828.jpg 828w, /images/hero-wood-1280.jpg 1280w, /images/hero-wood-1920.jpg 1920w';
const HERO_PLACEHOLDER =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAASACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDG0uGBB59zKnmsMoOu0euKS8E9wcwk4BHT09aSBIGt1ZVJJG1iDkirEInt50Vfm8wE4B7Vxve52dCFjvjEVynmr0PqvuDWZJbPa3iiJ8g8qf6Gug+ymYEvhWOO1ZeogC+ijBVSoxmqg9bEySYuncQSkddoqaMYu1/H+VFFJ7spbGqABaqR1OM1iWfzao4bkHJIPfmiilHqJn//2Q==';

interface HeroProps {
  backgroundImage?: string;
}

export const Hero: React.FC<HeroProps> = ({ backgroundImage }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const isCustomImage = Boolean(backgroundImage);
  return (
    <div className="relative min-h-screen">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-stone-900 bg-cover bg-center"
        style={{ backgroundImage: `url("${HERO_PLACEHOLDER}")` }}
      >
        <img
          src={backgroundImage ?? LOCAL_HERO_SRC}
          srcSet={isCustomImage ? undefined : LOCAL_HERO_SRCSET}
          sizes="100vw"
          alt="Woodworking background"
          decoding="async"
          ref={(img) => img?.setAttribute('fetchpriority', 'high')}
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover object-center transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>
      </div>

      {/* Centred Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center w-full px-6 sm:px-8 lg:px-12 min-h-[85vh] gap-6">
        <p className="text-amber-400 text-sm font-medium tracking-[0.25em] uppercase animate-fade-in">{t('hero.subtitle')}</p>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-7xl font-medium text-white leading-tight max-w-4xl animate-fade-in-up">
          {t('hero.title')}
        </h1>
        <p className="max-w-2xl text-base md:text-lg text-white/70 leading-relaxed font-light animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          {t('hero.description')}
        </p>
        <Button
          variant="secondary"
          onClick={() => navigate('/catalog')}
          className="mt-4 h-auto bg-white px-10 py-3.5 text-sm font-medium tracking-wide text-stone-900 transition-all duration-300 hover:bg-amber-50 hover:text-stone-900 hover:shadow-soft-lg animate-fade-in-up"
          style={{ animationDelay: '0.3s' }}
        >
          {t('hero.viewCatalog')}
        </Button>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-fade-in" style={{ animationDelay: '0.6s' }}>
        <div className="w-5 h-8 rounded-full border-2 border-white/30 flex justify-center pt-1.5">
          <div className="w-1 h-2 bg-white/50 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};
