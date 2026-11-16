import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './QuestionScalePreview.css';

gsap.registerPlugin(ScrollTrigger);

/** Isolated visual study for ?preview=question-scale. */
export function QuestionScalePreview() {
  const runwayRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLHeadingElement>(null);
  const kickerRef = useRef<HTMLParagraphElement>(null);
  const bioRef = useRef<HTMLParagraphElement>(null);
  const cueRef = useRef<HTMLSpanElement>(null);
  const portraitRef = useRef<HTMLImageElement>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const questionLabelRef = useRef<HTMLParagraphElement>(null);
  const questionNoteRef = useRef<HTMLParagraphElement>(null);
  const chapterRef = useRef<HTMLDivElement>(null);
  const chapterTitleRef = useRef<HTMLHeadingElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const runway = runwayRef.current;
    const stage = stageRef.current;
    if (!runway || !stage) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: runway,
          start: 'top top',
          end: 'bottom bottom',
          scrub: reducedMotion ? false : 0.55,
        },
      });

      timeline
        .to(quoteRef.current, {
          scale: 0.46,
          xPercent: -5,
          yPercent: isMobile ? -140 : -34,
          opacity: 0.72,
          duration: 0.35,
          ease: 'power2.inOut',
        }, 0.1)
        .to(portraitRef.current, {
          xPercent: isMobile ? 0 : -25,
          yPercent: isMobile ? -34 : -12,
          scale: isMobile ? 0.32 : 0.54,
          opacity: 0.82,
          duration: 0.42,
          ease: 'power2.inOut',
        }, 0.15)
        .to([bioRef.current, cueRef.current], {
          opacity: 0,
          y: 18,
          duration: 0.14,
          ease: 'power1.in',
        }, 0.17)
        .to(kickerRef.current, {
          opacity: 0,
          y: -10,
          duration: 0.1,
          ease: 'power1.in',
        }, 0.16)
        .to(quoteRef.current, {
          scale: 0.22,
          yPercent: -112,
          opacity: 0,
          duration: 0.2,
          ease: 'power2.in',
        }, 0.58)
        .to(questionRef.current, {
          opacity: 1,
          scale: 1,
          xPercent: 0,
          yPercent: 0,
          duration: 0.3,
          ease: 'power3.out',
        }, 0.22)
        .fromTo(questionLabelRef.current,
          { opacity: 0, x: -22 },
          { opacity: 1, x: 0, duration: 0.2, ease: 'power2.out' },
          0.22
        )
        .fromTo(questionNoteRef.current,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' },
          0.34
        )
        .to(questionRef.current, {
          scale: 0.35,
          xPercent: 0,
          yPercent: -115,
          opacity: 0,
          duration: 0.2,
          ease: 'power2.inOut',
        }, 0.58)
        .to([questionLabelRef.current, questionNoteRef.current], {
          opacity: 0,
          duration: 0.12,
          ease: 'power1.in',
        }, 0.58)
        .to(chapterRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.22,
          ease: 'power2.out',
        }, 0.69)
        .fromTo(chapterTitleRef.current,
          { clipPath: 'inset(0 0 100% 0)' },
          { clipPath: 'inset(0 0 0% 0)', duration: 0.28, ease: 'power2.inOut' },
          0.74
        )
        .to(progressRef.current, { scaleX: 1, duration: 1, ease: 'none' }, 0);

      if (reducedMotion) timeline.progress(1).pause();
    }, stage);

    return () => ctx.revert();
  }, []);

  return (
    <main className="question-scale" ref={stageRef}>
      <section className="qs-runway" ref={runwayRef} aria-label="The question changes scale">
        <div className="qs-sticky">
          <header className="qs-masthead">
            <span className="qs-wordmark">THE LIVING SIGNAL</span>
            <span className="qs-section">01 — 02 <i aria-hidden="true">/</i> THE QUESTION CHANGES SCALE</span>
          </header>

          <div className="qs-opening">
            <p className="qs-kicker" ref={kickerRef}>ADITYA DUGAR <span>·</span> SOFTWARE ENGINEERING</p>
            <h1 className="qs-quote" ref={quoteRef}>
              <span>I follow questions</span>
              <span>until they become</span>
              <span>something I can build.</span>
            </h1>
            <p className="qs-bio" ref={bioRef}>Software Engineering student at Jain University.<br className="qs-desktop-only" /> Curious about what makes things work.</p>
            <img
              ref={portraitRef}
              className="qs-portrait"
              src="/assets/page-02/aditya-cutout.png"
              alt="Aditya Dugar"
              draggable={false}
            />
            <span className="qs-scroll-cue" ref={cueRef} aria-hidden="true">SCROLL TO FOLLOW <b>↓</b></span>
          </div>

          <div className="qs-transformation" aria-live="polite">
            <p className="qs-question-label" ref={questionLabelRef}>A QUESTION TAKES SHAPE</p>
            <h2 className="qs-question" ref={questionRef}>
              What happens<br />behind an<br />application?
            </h2>
            <p className="qs-question-note" ref={questionNoteRef}>The first thing I want to understand is what I can’t see.</p>
          </div>

          <div className="qs-chapter" ref={chapterRef}>
            <p className="qs-chapter-number">CHAPTER 02 <span>·</span> BEYOND THE INTERFACE</p>
            <h2 className="qs-chapter-title" ref={chapterTitleRef}>There’s always more happening<br className="qs-desktop-only" /> beneath the surface.</h2>
            <p className="qs-chapter-copy">A tool can be useful. An interface can be beautiful. What interests me is understanding what makes them possible.</p>
            <p className="qs-chapter-foot">APPLICATIONS <span>·</span> LINUX <span>·</span> AI MODELS <span>·</span> WEB EXPERIENCES</p>
          </div>

          <div className="qs-progress" aria-hidden="true"><span /></div>
        </div>
      </section>
    </main>
  );
}
