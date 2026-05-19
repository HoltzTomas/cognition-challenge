"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmbeddedTweet } from "react-tweet";
import type { Tweet as TweetData } from "react-tweet/api";

type Metric = {
  label: string;
  value: string;
};

type TimelineItem = {
  label: string;
  value: string;
};

type TweetReference = {
  key: keyof PresentationTweets;
  author: string;
  handle: string;
  date: string;
  text: string;
  url: string;
  label: string;
};

type AppScreenshot = {
  alt: string;
  label: string;
  src: string;
};

type AppVideo = {
  alt: string;
  label: string;
  poster: string;
  src: string;
};

type HeroImage = {
  alt: string;
  label: string;
  src: string;
};

export type PresentationTweets = {
  accountCreationBug?: TweetData;
  beloLeaving?: TweetData;
  rauchTimeToConfetti?: TweetData;
};

type Slide = {
  number: string;
  section: string;
  title: string;
  thesis: string;
  bullets: string[];
  metrics?: Metric[];
  heroImages?: HeroImage[];
  screenshots?: AppScreenshot[];
  video?: AppVideo;
  timeline?: TimelineItem[];
  tweet?: TweetReference;
  quote?: string;
  notes: string[];
  visual: "stats" | "map" | "system" | "flow" | "incident" | "migration" | "devices" | "timeline" | "reflection";
};

const slides: Slide[] = [
  {
    number: "00",
    section: "Opening",
    title: "Building Belo's mobile app",
    thesis:
      "I joined at 18 as the second engineer and helped take Belo from a blank page to +1M registered users.",
    bullets: [
      "Only frontend/mobile engineer in the early team",
      "Owned onboarding, UX, architecture, releases, and incidents",
      "Core challenge: make crypto feel simple and trustworthy",
    ],
    metrics: [
      { value: "2nd", label: "engineer" },
      { value: "+1M", label: "registered users" },
    ],
    heroImages: [
      {
        alt: "Belo card in Apple Pay ready to tap",
        label: "Apple Pay",
        src: "/assets/belo-apple-pay.png",
      },
      {
        alt: "Belo app home screen in dark mode showing balance and shortcuts",
        label: "App home",
        src: "/assets/belo-home-dark.png",
      },
      {
        alt: "Belo app money detail screen showing USDC balance",
        label: "Wallet detail",
        src: "/assets/belo-money-detail.png",
      },
    ],
    quote: "How do we make crypto feel as simple and trustworthy as a normal banking app?",
    notes: [
      "I want to talk about my work at Belo, a Latin American crypto fintech. Belo is now one of the most relevant fintechs in the region, reportedly reaching around $70M in revenue run rate and raising a $14M Series A led by Tether.",
      "When I joined, it was still extremely early. I was 18, finishing high school, and joined as the second engineer. My official role was Mobile Engineer, but every major mobile decision went through me: framework, architecture, UX, release strategy, and roadmap priorities.",
      "The core challenge was making crypto useful and accessible for everyday people in Latin America, where stablecoins were a practical tool for saving, moving money, and receiving payments.",
    ],
    visual: "stats",
  },
  {
    number: "01",
    section: "Context + Role",
    title: "Making crypto useful in Latin America",
    thesis:
      "Belo had to hide financial and crypto complexity while I owned much of the early mobile and frontend product experience.",
    bullets: [
      "Context: inflation, capital controls, expensive transfers, limited dollars",
      "Mission: stablecoins and money movement in a simple consumer app",
      "My role: second engineer, effectively frontend/mobile owner with the CTO",
    ],
    video: {
      alt: "Screen recording of the first Belo crypto purchase flow",
      label: "Initial buy flow · Dec 2021",
      poster: "/assets/belo-v1-buy-flow-poster.jpg",
      src: "/assets/belo-v1-buy-flow.mp4",
    },
    quote:
      "The mission was not a crypto trading app. It was crypto as everyday financial infrastructure.",
    notes: [
      "To understand Belo, you need to understand the context. In Argentina and much of Latin America, the traditional financial system has a lot of friction: inflation, currency controls, limited access to dollars, expensive international transfers, and low trust in local currency.",
      "So crypto had a concrete use case: save in stablecoins, move money more freely, receive international payments, and access a system that felt more open.",
      "I joined as the second engineer and was effectively the only frontend and mobile engineer early on, so onboarding, UX decisions, architecture, release strategy, and the feel of the app were my responsibility together with the CTO.",
      "The mission was not to build a crypto trading app. It was making crypto useful and accessible for everyday people in Latin America.",
    ],
    visual: "flow",
  },
  {
    number: "02",
    section: "MVP Strategy",
    title: "Banking familiarity over crypto complexity",
    thesis:
      "The product needed to feel like a wallet or banking app, not a crypto exchange.",
    bullets: [
      "Build for normal users, not crypto experts",
      "Hide blockchains, wallets, and exchanges unless they added value",
      "Find the simplest compliant flow for each critical action",
    ],
    screenshots: [
      {
        alt: "First version of the Belo wallet home screen showing balances and currency rows",
        label: "Wallet home",
        src: "/assets/belo-v1-wallet.jpg",
      },
      {
        alt: "First version of the Belo Mastercard waitlist screen",
        label: "Card waitlist",
        src: "/assets/belo-v1-card-waitlist.jpg",
      },
    ],
    quote:
      "Familiar first, crypto infrastructure second.",
    notes: [
      "At the beginning, the app was basically a blank page. The key decision was not to build for crypto experts.",
      "The app had to feel familiar. It should feel closer to a banking or wallet app than to a crypto exchange, and the user should not need to understand crypto infrastructure to get value.",
      "That principle became especially important in onboarding, where regulatory constraints and user simplicity were constantly in tension.",
    ],
    visual: "flow",
  },
  {
    number: "03",
    section: "Onboarding",
    title: "Clicks to Deposit became the product metric",
    thesis:
      "In fintech, the aha moment is getting money into the system.",
    bullets: [
      "Metric: first open -> first deposit",
      "Compliance: what must happen now vs. later",
      "Impact: around 65% lower onboarding churn in week one",
    ],
    metrics: [
      { value: "1", label: "metric aligned the team" },
      { value: "65%", label: "first-week churn reduction" },
      { value: "0", label: "compliance shortcuts" },
    ],
    tweet: {
      key: "rauchTimeToConfetti",
      author: "Guillermo Rauch",
      handle: "@rauchg",
      date: "Nov 18, 2020",
      label: "Reference metric",
      text: "TTC: time-to-confetti",
      url: "https://x.com/rauchg/status/1329079593915928580?s=20",
    },
    quote:
      "Find the constraint, then align the team around it.",
    notes: [
      "After launch, I noticed through conversations and analytics that users were interested but dropping before the first deposit. That was a huge problem because the aha moment was not the install, it was getting money into the app.",
      "I created an internal metric called Clicks to Deposit, inspired by Vercel's Time to Confetti. The question was: how many actions does it take for a new user to go from opening the app to being able to deposit money?",
      "I worked closely with someone on compliance to understand what we truly needed upfront versus what could be delayed or simplified. The result was the shortest onboarding flow in the industry and around 65% lower onboarding churn in the first week.",
    ],
    visual: "flow",
  },
  {
    number: "04",
    section: "Setback 1",
    title: "A regex bug blocked account creation",
    thesis:
      "A username validation bug made every new username invalid.",
    bullets: [
      "Mobile review made the client fix too slow",
      "Mitigated server-side with temporary random usernames",
      "Lesson: fast iteration needs safe failure modes",
    ],
    tweet: {
      key: "accountCreationBug",
      author: "Tomas",
      handle: "@tomasholtz_",
      date: "Jul 25, 2022",
      label: "Public bug humor",
      text: "Si ven muchos bugs en belo, sepan que es porque yo codeo así.",
      url: "https://x.com/tomasholtz_/status/1551634302265446401",
    },
    notes: [
      "One painful moment was shipping a production bug that blocked users from creating an account. I introduced a mistake in the input validation regex for the username step, which meant no username was considered valid.",
      "In a web app, you can usually deploy quickly. In mobile, especially iOS, a fix can be delayed by App Store review. So instead of only focusing on the perfect client fix, I worked with the backend team to mitigate.",
      "The app already skipped the username step if the user had a username, so the backend assigned temporary random usernames. The lesson was obvious but important: no matter how fast you want to iterate, some flows cannot fail.",
    ],
    visual: "incident",
  },
  {
    number: "05",
    section: "Setback 2",
    title: "Migrating Flutter to React Native while live",
    thesis:
      "Strategically right, operationally painful.",
    bullets: [
      "Flutter app live with around 100k active users moving money",
      "Maintain, hire, learn React Native, and migrate in parallel",
      "Hardest part: prioritization under pressure",
    ],
    metrics: [
      { value: "100k", label: "monthly active users" },
      { value: "3 mo", label: "hardest migration period" },
      { value: "TS", label: "shared frontend/backend language" },
    ],
    quote:
      "It felt like rebuilding the plane while flying it.",
    notes: [
      "The hardest period was when my CTO and I decided to migrate from Flutter to React Native. It was not an easy decision because we already had a working app with real users.",
      "The reasons were strong: Flutter hiring was harder, Flutter web was not good enough for our future needs, the backend was TypeScript, and React Native had a stronger ecosystem for what we needed.",
      "The execution was the problem. The developer working with me on Flutter left, so I had to hire a React Native developer quickly while maintaining the Flutter app with around 100k MAU, learning React Native, rebuilding the app, and transferring product knowledge.",
    ],
    visual: "migration",
  },
  {
    number: "06",
    section: "Technical Depth",
    title: "Low-end Android was the real platform",
    thesis:
      "In our market, low-end Android performance was not an edge case.",
    bullets: [
      "Old OS versions, low memory, limited storage",
      "Device-specific bugs were hard to reproduce",
      "Platform decisions affected trust, support, hiring, and velocity",
    ],
    quote:
      "Technical decisions were business decisions.",
    notes: [
      "A technical challenge I underestimated early was hardware quality. We were not building a social app where a bug is just annoying. We were building an app where people moved money.",
      "Because we used cross-platform frameworks like Flutter and later React Native, performance and device compatibility became a constant challenge. I spent many hours reading GitHub issues, Stack Overflow threads, and native Android and iOS documentation.",
      "Sometimes we fixed the issue. Other times we had to make product and business tradeoffs, like not supporting very old OS versions because the maintenance cost was too high relative to usage and transaction volume.",
    ],
    visual: "devices",
  },
  {
    number: "07",
    section: "Outcome",
    title: "Zero to 1M registered users",
    thesis:
      "Belo grew from zero to around 1M registered users.",
    bullets: [
      "Built the mobile experience from scratch",
      "Created one of the simplest crypto UXs in the region",
      "Migrated Flutter -> React Native while live",
    ],
    timeline: [
      { label: "End 2021", value: "100k users" },
      { label: "Mid 2022", value: "500k users" },
      { label: "Early 2023", value: "1M users" },
    ],
    quote:
      "The work became about outcomes, not screens.",
    notes: [
      "By the time I left Belo, the app had grown from zero to around 1M registered users and was widely recognized in the local market as one of the simplest ways to use crypto.",
      "The biggest outcomes were building the mobile app from scratch, reaching major user milestones, significantly improving onboarding through Clicks to Deposit, and successfully migrating from Flutter to React Native while supporting a live production app.",
      "Personally, I learned to operate in ambiguity, make decisions with incomplete information, talk directly to users, debug painful production issues, and take responsibility beyond just writing code.",
    ],
    visual: "timeline",
  },
  {
    number: "08",
    section: "Reflection",
    title: "What I’d repeat, and what I’d change",
    thesis:
      "The biggest lesson was reducing friction everywhere.",
    bullets: [
      "Repeat: stay close to users",
      "Change: invest earlier in release safety and documentation",
      "Own ambiguous problems before they have clean boundaries",
    ],
    tweet: {
      key: "beloLeaving",
      author: "Tomas",
      handle: "@tomasholtz_",
      date: "Mar 31, 2023",
      label: "Leaving Belo",
      text: "Último día como parte del team de @belo_app. Fue una aventura increíble.",
      url: "https://x.com/tomasholtz_/status/1641873478675488783",
    },
    notes: [
      "A few things worked well: staying close to users, using simple metrics like Clicks to Deposit, and taking ownership beyond my formal title.",
      "I would invest earlier in release safety: feature flags, server-controlled flows, better validation testing, and faster rollback strategies. The username bug made it clear that mobile apps need extra care because releases are slower.",
      "I would also think earlier about hardware constraints, document business logic before migrations, and be more deliberate about deciding what not to support. Early on, I wanted to fix every edge case. Later, I learned prioritization sometimes means saying the cost is too high and focusing on the majority experience.",
    ],
    visual: "reflection",
  },
];

function clampSlide(index: number) {
  return Math.max(0, Math.min(index, slides.length - 1));
}

export function PresentationClient({ tweets = {} }: { tweets?: PresentationTweets }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const activeSlide = slides[activeIndex];
  const hasVisual = Boolean(
    activeSlide.heroImages ||
      activeSlide.metrics ||
      activeSlide.screenshots ||
      activeSlide.timeline ||
      activeSlide.tweet ||
      activeSlide.video,
  );

  const progress = useMemo(
    () => `${((activeIndex + 1) / slides.length) * 100}%`,
    [activeIndex],
  );

  const goToSlide = useCallback((index: number) => {
    setActiveIndex(clampSlide(index));
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex(index => clampSlide(index + 1));
  }, []);

  const goPrevious = useCallback(() => {
    setActiveIndex(index => clampSlide(index - 1));
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      if (
        target?.tagName === "BUTTON" ||
        target?.tagName === "A" ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        goNext();
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      }

      if (event.key.toLowerCase() === "n") {
        setShowNotes(value => !value);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrevious]);

  return (
    <main className="presentationShell">
      <header className="deckHeader" aria-label="Presentation navigation">
        <div className="brandCluster">
          <span className="mark" aria-hidden="true" />
          <div>
            <p className="deckKicker">Past Work</p>
            <p className="deckBrand">Belo Mobile</p>
          </div>
        </div>

        <nav className="slideDots" aria-label="Slides">
          {slides.map((slide, index) => (
            <button
              aria-label={`Go to slide ${index + 1}: ${slide.section}`}
              aria-current={index === activeIndex ? "step" : undefined}
              className="slideDot"
              key={slide.number}
              onClick={() => goToSlide(index)}
              type="button"
            >
              {slide.number}
            </button>
          ))}
        </nav>

        <div className="headerActions">
          <button
            aria-pressed={showNotes}
            className="notesToggle"
            onClick={() => setShowNotes(value => !value)}
            type="button"
          >
            Notes
          </button>
        </div>
      </header>

      <section className="slideStage" aria-live="polite">
        <article
          className={[
            "slideFrame",
            activeSlide.heroImages ? "slideFrameHero" : "",
            activeSlide.tweet ? "slideFrameEvidence" : "",
            activeSlide.screenshots ? "slideFrameMedia" : "",
            activeSlide.video ? "slideFrameVideo" : "",
            hasVisual ? "" : "slideFrameTextOnly",
          ]
            .filter(Boolean)
            .join(" ")}
          key={activeSlide.number}
        >
          <div className="slideNumberBlock">
            <span>{activeSlide.number}</span>
            <small>{activeSlide.section}</small>
          </div>

          <div className="slideContent">
            <div className="slideCopy">
              <p className="sectionLabel">{activeSlide.section}</p>
              <h1>{activeSlide.title}</h1>
              <p className="thesis">{activeSlide.thesis}</p>

              <ul className="pointList">
                {activeSlide.bullets.map(bullet => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>

            {hasVisual ? <SlideVisual slide={activeSlide} tweets={tweets} /> : null}
          </div>

          {activeSlide.quote ? (
            <aside className="slideQuote">
              <span>Core line</span>
              <p>{activeSlide.quote}</p>
            </aside>
          ) : null}
        </article>
      </section>

      {showNotes ? (
        <aside className="speakerNotes" aria-label="Speaker notes">
          <div className="notesMeta">
            <span>{activeSlide.number}</span>
            <strong>{activeSlide.section}</strong>
          </div>
          <div className="notesBody">
            {activeSlide.notes.map(note => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </aside>
      ) : null}

      <footer className="deckControls">
        <button
          aria-label="Previous slide"
          className="arrowButton"
          disabled={activeIndex === 0}
          onClick={goPrevious}
          type="button"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <div className="progressTrack" aria-hidden="true">
          <span style={{ width: progress }} />
        </div>

        <p className="slideCounter">
          {String(activeIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </p>

        <button
          aria-label="Next slide"
          className="arrowButton"
          disabled={activeIndex === slides.length - 1}
          onClick={goNext}
          type="button"
        >
          <span aria-hidden="true">›</span>
        </button>
      </footer>
    </main>
  );
}

function SlideVisual({
  slide,
  tweets,
}: {
  slide: Slide;
  tweets: PresentationTweets;
}) {
  if (slide.heroImages) {
    return (
      <div className={`visualPanel heroPhotoPanel visual-${slide.visual}`}>
        <div className="openingGallery" aria-label="Belo product screenshots">
          {slide.heroImages.map(image => (
            <figure className="openingPhone" key={image.src}>
              <img alt={image.alt} src={image.src} />
              <figcaption>{image.label}</figcaption>
            </figure>
          ))}
        </div>

        {slide.metrics ? (
          <div className="heroMetricStrip">
            {slide.metrics.map(metric => (
              <div className="heroMetric" key={`${metric.value}-${metric.label}`}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (slide.video) {
    return (
      <div className={`visualPanel videoPanel visual-${slide.visual}`}>
        <figure className="flowVideo">
          <video
            aria-label={slide.video.alt}
            autoPlay
            controls
            loop
            muted
            playsInline
            poster={slide.video.poster}
            preload="metadata"
          >
            <source src={slide.video.src} type="video/mp4" />
          </video>
          <figcaption>{slide.video.label}</figcaption>
        </figure>
      </div>
    );
  }

  if (slide.screenshots) {
    return (
      <div className={`visualPanel screenshotPanel visual-${slide.visual}`}>
        {slide.screenshots.map(screenshot => (
          <figure className="phoneShot" key={screenshot.src}>
            <img alt={screenshot.alt} src={screenshot.src} />
            <figcaption>{screenshot.label}</figcaption>
          </figure>
        ))}
      </div>
    );
  }

  if (slide.tweet && slide.metrics) {
    return (
      <div className={`visualPanel evidencePanel visual-${slide.visual}`}>
        <TweetEmbed reference={slide.tweet} tweet={tweets[slide.tweet.key]} />
        <div className="compactMetricGrid">
          {slide.metrics.map(metric => (
            <div className="compactMetric" key={`${metric.value}-${metric.label}`}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.timeline) {
    return (
      <div className="visualPanel timelinePanel">
        {slide.timeline.map((item, index) => (
          <div className="timelineRow" key={item.label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item.value}</strong>
            <small>{item.label}</small>
          </div>
        ))}
      </div>
    );
  }

  if (slide.metrics) {
    return (
      <div className={`visualPanel metricPanel visual-${slide.visual}`}>
        {slide.metrics.map(metric => (
          <div className="metricTile" key={`${metric.value}-${metric.label}`}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
    );
  }

  if (slide.tweet) {
    return (
      <div className={`visualPanel evidencePanel visual-${slide.visual}`}>
        <TweetEmbed reference={slide.tweet} tweet={tweets[slide.tweet.key]} />
      </div>
    );
  }

  return null;
}

function TweetEmbed({
  reference,
  tweet,
}: {
  reference: TweetReference;
  tweet?: TweetData;
}) {
  return (
    <figure className="tweetEmbed">
      <div className="tweetEmbedBody">
        {tweet ? (
          <EmbeddedTweet tweet={tweet} />
        ) : (
          <article className="tweetFallback">
            <p>{reference.text}</p>
            <a href={reference.url} rel="noreferrer" target="_blank">
              Open original tweet
            </a>
          </article>
        )}
      </div>
      <figcaption>
        {reference.label} · {reference.author} {reference.handle} ·{" "}
        <a href={reference.url} rel="noreferrer" target="_blank">
          {reference.date}
        </a>
      </figcaption>
    </figure>
  );
}
