// src/components/auth/AuthPageLayout.jsx

import illustration from '@/assets/images/gm-hrms-illustration.png'
import logo         from '@/assets/images/login-page-hrms-logo.png'
import rocket       from '@/assets/images/man-rocket-illustration.png'

const globalCSS = `
  html, body, #root { height: 100%; overflow: hidden; margin: 0; padding: 0; }
  ::-webkit-scrollbar { display: none; }
  * { scrollbar-width: none; }

  @keyframes floatRocket {
    0%,100% { transform: rotate(-4deg) translateY(0px);  }
    50%      { transform: rotate(-4deg) translateY(-10px); }
  }
  @keyframes floatIllus {
    0%,100% { transform: translateY(0px);  }
    50%      { transform: translateY(-10px); }
  }
  @keyframes slideUp {
    from { opacity:0; transform:translateY(32px); }
    to   { opacity:1; transform:translateY(0);    }
  }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes spinBtn { to { transform: rotate(360deg); } }

  .apl-fade     { animation: fadeIn  0.65s ease both; }
  .apl-slide-up { animation: slideUp 0.75s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
  .apl-rocket   {
    animation: floatRocket 4.5s ease-in-out infinite;
    transform-origin: center bottom;
    transform: rotate(-16deg);
  }

  .apl-input:focus {
    outline: none;
    border-color: #C35E33;
    box-shadow: 0 0 0 3px rgba(195,94,51,0.15);
  }

  @media (max-width: 767px) {
    html, body, #root { height: auto; overflow: auto; min-height: 100dvh; }
  }
`

export default function AuthPageLayout({ title, subtitle, children }) {
  // ─── Desktop card ─────────────────────────────────────────────
  const DesktopCard = (
    <div
      className="bg-white rounded-2xl"
      style={{
        padding:   'clamp(28px,3.5vh,44px) clamp(24px,2.5vw,40px)',
        boxShadow: '0 16px 64px rgba(0,0,0,0.13)',
        border:    '1px solid rgba(195,94,51,0.09)',
      }}
    >
      {/* Logo */}
      <div className="flex justify-center mb-4">
        <img
          src={logo}
          alt="GM HRMS Logo"
          style={{ height: 'clamp(80px,8.5vh,98px)', width: 'auto' }}
        />
      </div>

      {/* Title */}
      <h1
        className="text-center font-bold text-gray-900 leading-tight"
        style={{
          fontSize:      'clamp(17px,1.8vw,23px)',
          letterSpacing: '-0.3px',
          fontFamily:    "'Outfit', sans-serif",
          marginBottom:  subtitle ? '6px' : '28px',
        }}
      >
        {title}
      </h1>

      {/* Optional subtitle */}
      {subtitle && (
        <p
          className="text-center text-gray-500 font-medium"
          style={{ fontSize: 'clamp(11px,1vw,13px)', marginBottom: '24px' }}
        >
          {subtitle}
        </p>
      )}

      {children}
    </div>
  )

  // ─── Mobile card ──────────────────────────────────────────────
  const MobileCard = (
    <div
      className="bg-white rounded-t-3xl rounded-b-none"
      style={{
        padding:   '32px 24px 44px',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
        minHeight: '100%',
      }}
    >
      {/* Logo */}
      <div className="flex justify-center mb-4">
        <img src={logo} alt="GM HRMS Logo" style={{ height: '64px', width: 'auto' }} />
      </div>

      {/* Title */}
      <h1
        className="text-center font-bold text-gray-900 leading-tight"
        style={{
          fontSize:      '20px',
          letterSpacing: '-0.3px',
          fontFamily:    "'Outfit', sans-serif",
          marginBottom:  subtitle ? '6px' : '28px',
        }}
      >
        {title}
      </h1>

      {/* Optional subtitle */}
      {subtitle && (
        <p
          className="text-center text-gray-500 font-medium"
          style={{ fontSize: '13px', marginBottom: '24px' }}
        >
          {subtitle}
        </p>
      )}

      {children}
    </div>
  )

  return (
    <>
      <style>{globalCSS}</style>

      {/* ══════════════════════════════════════
          DESKTOP  ≥ 768 px
      ══════════════════════════════════════ */}
      <div className="hidden md:block relative w-screen h-screen overflow-hidden apl-fade">

        {/* Orange top 50 % */}
        <div className="absolute inset-x-0 top-0 bg-[#C35E33]" style={{ height: '50%' }} />

        {/* Cream bottom 50 % */}
        <div className="absolute inset-x-0 bottom-0 bg-[#faf8f6]" style={{ height: '50%' }} />

        {/* Left hero — Welcome text + illustration */}
        <div
          className="absolute top-8 left-0 z-20 apl-fade"
          style={{
            padding: 'clamp(18px,2vh,26px) 0 0 clamp(34px,4vw,60px)',
            width:   '48%',
          }}
        >
          <div className="flex items-start gap-5">

            <div className="pt-8">
              <h1
                className="font-extrabold text-white leading-none whitespace-nowrap"
                style={{ fontSize: 'clamp(34px,3.8vw,72px)', letterSpacing: '-1px' }}
              >
                Welcome to
              </h1>
              <p
                className="font-bold text-white mt-3"
                style={{ fontSize: 'clamp(14px,1.4vw,26px)' }}
              >
                Manage your workforce smarter
              </p>
              <p
                className="font-normal text-white/80 mt-2 leading-relaxed"
                style={{ fontSize: 'clamp(10px,.9vw,17px)', maxWidth: '310px' }}
              >
                Access employee management, attendance, payroll, leave
                tracking, and HR operations from one secure platform.
              </p>
            </div>

            <div
              className="flex-shrink-0"
              style={{ width: 'clamp(210px,19vw,380px)', marginTop: '-28px' }}
            >
              <img
                src={illustration}
                alt="GM HRMS"
                className="w-full h-auto block object-contain"
              />
            </div>

          </div>
        </div>

        {/* Rocket */}
        <div
          className="absolute z-30 apl-rocket"
          style={{ bottom: '-25vh', left: '-5vw', width: 'clamp(600px,50vw,1200px)' }}
        >
          <img src={rocket} alt="Man on rocket" className="w-full h-auto block" />
        </div>

        {/* Form card */}
        <div
          className="absolute z-40 apl-slide-up"
          style={{
            right:     'clamp(44px,7%,120px)',
            top:       '18%',
            transform: 'translateY(-50%)',
            width:     'clamp(320px,32vw,480px)',
          }}
        >
          {DesktopCard}
        </div>

      </div>

      {/* ══════════════════════════════════════
          MOBILE  < 768 px
      ══════════════════════════════════════ */}
      <div className="md:hidden flex flex-col min-h-dvh overflow-auto bg-[#C35E33]">

        {/* Hero */}
       <div className="flex flex-col items-center justify-center pt-10 pb-4 px-6 flex-shrink-0">
                 <p className="font-extrabold text-white text-2xl text-center ">Welcome to</p>
                 <img src={illustration} alt="GM HRMS" className="w-36 h-auto mb-3 mt-3" />
                 <p className="text-white/75 text-xs text-center mt-1 leading-relaxed px-4">
                   Manage your workforce smarter
                 </p>
               </div>

        {/* Bottom-sheet card */}
        <div className="flex-1 mt-4 bg-white rounded-t-3xl">
          {MobileCard}
        </div>

      </div>
    </>
  )
}