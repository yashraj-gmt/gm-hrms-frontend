// src/components/auth/AuthLayout.jsx
import leftBg  from '@/assets/images/left-bg-element.png'
import rightBg from '@/assets/images/right-bg-element.png'

/**
 * AuthLayout
 * ─────────────────────────────────────────────────────────────
 * Split-screen wrapper used by every auth page.
 *
 * Props
 *   illustration  – imported PNG for the left panel
 *   illustrationAlt – accessible alt text
 *   children      – the right-panel form content
 */
export default function AuthLayout({ illustration, illustrationAlt = '', children }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white flex">

      {/* ── Background decorative elements ─────────────────── */}
      <img
        src={leftBg}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute bottom-0 left-0 w-[340px] sm:w-[420px] opacity-60"
        style={{ mixBlendMode: 'multiply' }}
      />
      <img
        src={rightBg}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute bottom-0 right-0 w-[480px] sm:w-[600px] opacity-60"
        style={{ mixBlendMode: 'multiply' }}
      />

      {/* ── Left panel — illustration ──────────────────────── */}
      <div className="hidden md:flex md:w-[52%] lg:w-[55%] items-center justify-center relative z-10 py-10 px-8">
        <img
          src={illustration}
          alt={illustrationAlt}
          className="w-full max-w-[520px] object-contain drop-shadow-sm"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>

      {/* ── Right panel — form ─────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center relative z-10 px-6 py-12 md:px-10 lg:px-16">
        <div className="w-full max-w-[440px]">
          {children}
        </div>
      </div>

    </div>
  )
}