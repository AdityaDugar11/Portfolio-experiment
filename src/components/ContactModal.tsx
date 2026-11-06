import React, { useEffect, useRef } from 'react';
import { X, Mail, ArrowUpRight } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Lock background scroll and manage focus
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button on open
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg p-8 rounded-2xl bg-[#1E1513]/95 border border-signal-coral/40 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(224,109,83,0.2)] text-signal-ivory transition-all duration-300 animate-in fade-in zoom-in-95"
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-signal-ivory/70 hover:text-signal-ivory hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-coral"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-signal-coral" />
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-signal-coral">
              Initiate Inquiry
            </span>
          </div>
          <h2
            id="contact-modal-title"
            className="font-serif text-3xl font-medium tracking-tight text-signal-ivory"
          >
            Let&rsquo;s Connect
          </h2>
          <p className="text-sm text-signal-ivory/70 font-light leading-relaxed">
            Whether it&rsquo;s a technical collaboration, intelligent systems discussion, or engineering project, I&rsquo;d be glad to hear from you.
          </p>
        </div>

        {/* Contact Links */}
        <div className="space-y-3">
          {/* Email */}
          <a
            href="mailto:adityadugar7@gmail.com"
            className="group flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/10 hover:border-signal-coral/60 hover:bg-signal-coral/10 transition-all duration-200"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-signal-coral/20 text-signal-coral group-hover:bg-signal-coral group-hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold tracking-wider uppercase text-signal-ivory/60">
                  Email
                </div>
                <div className="text-sm font-medium text-signal-ivory group-hover:text-signal-peach transition-colors">
                  adityadugar7@gmail.com
                </div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-signal-ivory/50 group-hover:text-signal-coral group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </a>

          {/* LinkedIn */}
          <a
            href="https://www.linkedin.com/in/adityadugar11/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/10 hover:border-signal-peach/60 hover:bg-signal-peach/10 transition-all duration-200"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-signal-peach/20 text-signal-peach group-hover:bg-signal-peach group-hover:text-black transition-colors">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28m1.39 9.74v-8.37H5.07v8.37h2.78z" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold tracking-wider uppercase text-signal-ivory/60">
                  LinkedIn
                </div>
                <div className="text-sm font-medium text-signal-ivory group-hover:text-signal-peach transition-colors">
                  linkedin.com/in/adityadugar11
                </div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-signal-ivory/50 group-hover:text-signal-peach group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </a>

          {/* GitHub */}
          <a
            href="https://github.com/AdityaDugar11"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/10 hover:border-signal-sky/60 hover:bg-signal-sky/10 transition-all duration-200"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-signal-sky/20 text-signal-sky group-hover:bg-signal-sky group-hover:text-black transition-colors">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold tracking-wider uppercase text-signal-ivory/60">
                  GitHub
                </div>
                <div className="text-sm font-medium text-signal-ivory group-hover:text-signal-sky transition-colors">
                  github.com/AdityaDugar11
                </div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-signal-ivory/50 group-hover:text-signal-sky group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </a>
        </div>
      </div>
    </div>
  );
};
