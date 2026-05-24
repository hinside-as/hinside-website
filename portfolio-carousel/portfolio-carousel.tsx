import { useEffect, useMemo, useRef } from "react";

type PortfolioItem = {
  slug: string;
  title: string;
  subtitle: string;
  image: string;
};

const BASE_SPEED = 38;
const HOVER_SPEED = 170;

function createSquareImageDataUri(colors: [string, string], label: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='640' viewBox='0 0 640 640'>
    <defs>
      <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='${colors[0]}'/>
        <stop offset='100%' stop-color='${colors[1]}'/>
      </linearGradient>
    </defs>
    <rect width='640' height='640' fill='url(#g)'/>
    <circle cx='540' cy='110' r='140' fill='rgba(255,255,255,0.18)'/>
    <circle cx='110' cy='550' r='180' fill='rgba(0,0,0,0.15)'/>
    <text x='32' y='600' fill='rgba(255,255,255,0.75)' font-family='JetBrains Mono, monospace' font-size='28'>${label}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const ITEMS: PortfolioItem[] = [
  {
    slug: "samspill",
    title: "Samspill: World Cup 2026",
    subtitle: "Event visual identity",
    image: createSquareImageDataUri(["#1f6feb", "#36cfc9"], "Samspill")
  },
  {
    slug: "arktisk",
    title: "Arktisk Form",
    subtitle: "Brand direction and campaign",
    image: createSquareImageDataUri(["#3151ff", "#f9cb28"], "Arktisk")
  },
  {
    slug: "nordhavn",
    title: "Nordhavn Studio",
    subtitle: "Digital product storytelling",
    image: createSquareImageDataUri(["#023047", "#ffb703"], "Nordhavn")
  },
  {
    slug: "aura",
    title: "Aura Live",
    subtitle: "Experience and motion concept",
    image: createSquareImageDataUri(["#7b2cbf", "#ff7d00"], "Aura")
  }
];

function PortfolioCard({ item, onHoverIn, onHoverOut }: { item: PortfolioItem; onHoverIn: () => void; onHoverOut: () => void }) {
  return (
    <a
      href={`/portfolio-${item.slug}`}
      className="portfolio-card"
      onMouseEnter={onHoverIn}
      onMouseLeave={onHoverOut}
      onFocus={onHoverIn}
      onBlur={onHoverOut}
      aria-label={`${item.title} - ${item.subtitle}`}
    >
      <img className="portfolio-image" src={item.image} alt={item.title} loading="lazy" />
      <div className="portfolio-meta">
        <p className="portfolio-title">{item.title}</p>
        <p className="portfolio-subtitle">{item.subtitle}</p>
      </div>
    </a>
  );
}

export default function PortfolioCarousel() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const firstSetRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const currentSpeedRef = useRef(BASE_SPEED);
  const targetSpeedRef = useRef(BASE_SPEED);
  const setWidthRef = useRef(0);

  const doubledItems = useMemo(() => [...ITEMS, ...ITEMS], []);

  useEffect(() => {
    const measure = () => {
      setWidthRef.current = firstSetRef.current?.offsetWidth ?? 0;
    };

    measure();

    const observer = new ResizeObserver(measure);
    if (firstSetRef.current) {
      observer.observe(firstSetRef.current);
    }

    let rafId = 0;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const current = currentSpeedRef.current;
      const target = targetSpeedRef.current;
      currentSpeedRef.current = current + (target - current) * Math.min(1, dt * 6.5);

      const width = setWidthRef.current;
      if (trackRef.current && width > 0) {
        offsetRef.current += currentSpeedRef.current * dt;
        if (offsetRef.current >= width) {
          offsetRef.current -= width;
        }

        trackRef.current.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
      }

      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  const onHoverIn = () => {
    targetSpeedRef.current = HOVER_SPEED;
  };

  const onHoverOut = () => {
    targetSpeedRef.current = BASE_SPEED;
  };

  return (
    <section className="portfolio-carousel-section" aria-label="Portfolio carousel">
      <style>{`
        .portfolio-carousel-section {
          position: relative;
          width: 100%;
          overflow: hidden;
          padding: clamp(32px, 5vw, 64px) 0;
          background: radial-gradient(120% 90% at 50% 50%, #151515, #050505);
        }

        .portfolio-carousel-mask {
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 2;
          background: linear-gradient(90deg, #050505 0%, rgba(5, 5, 5, 0) 8%, rgba(5, 5, 5, 0) 92%, #050505 100%);
        }

        .portfolio-track {
          position: relative;
          z-index: 1;
          display: flex;
          width: max-content;
          will-change: transform;
          gap: clamp(18px, 2.6vw, 40px);
          padding: 0 clamp(16px, 4vw, 48px);
        }

        .portfolio-set {
          display: flex;
          gap: clamp(18px, 2.6vw, 40px);
        }

        .portfolio-card {
          text-decoration: none;
          color: #f6f6f6;
          width: clamp(220px, 28vw, 360px);
          flex: 0 0 auto;
        }

        .portfolio-image {
          display: block;
          width: 100%;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          border-radius: 12px;
          filter: grayscale(1) saturate(0.25);
          transition: filter 280ms ease, transform 280ms ease;
          transform: scale(1);
        }

        .portfolio-card:hover .portfolio-image,
        .portfolio-card:focus-visible .portfolio-image {
          filter: grayscale(0) saturate(1);
          transform: scale(1.01);
        }

        .portfolio-meta {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-family: "JetBrains Mono", monospace;
        }

        .portfolio-title {
          margin: 0;
          line-height: 1.35;
          font-size: clamp(14px, 1.3vw, 17px);
          color: #ffffff;
        }

        .portfolio-subtitle {
          margin: 0;
          line-height: 1.35;
          font-size: clamp(13px, 1.2vw, 16px);
          color: rgba(255, 255, 255, 0.6);
        }

        .portfolio-card:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.9);
          outline-offset: 6px;
          border-radius: 12px;
        }

        @media (max-width: 720px) {
          .portfolio-card {
            width: min(74vw, 320px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .portfolio-track {
            transform: translate3d(0, 0, 0) !important;
          }

          .portfolio-image {
            transition: filter 0s ease;
          }
        }
      `}</style>

      <div ref={trackRef} className="portfolio-track">
        <div ref={firstSetRef} className="portfolio-set">
          {ITEMS.map((item) => (
            <PortfolioCard key={item.slug} item={item} onHoverIn={onHoverIn} onHoverOut={onHoverOut} />
          ))}
        </div>

        <div className="portfolio-set" aria-hidden="true">
          {doubledItems.slice(ITEMS.length).map((item, index) => (
            <PortfolioCard key={`${item.slug}-${index}`} item={item} onHoverIn={onHoverIn} onHoverOut={onHoverOut} />
          ))}
        </div>
      </div>

      <div className="portfolio-carousel-mask" aria-hidden="true" />
    </section>
  );
}
