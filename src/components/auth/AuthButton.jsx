// src/components/auth/AuthButton.jsx
export default function AuthButton({ children, loading = false, disabled = false, onClick, type = 'submit' }) {
  const off = loading || disabled

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={off}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        width: '100%',
        height: '52px',
        borderRadius: '12px',
        border: 'none',
        cursor: off ? 'not-allowed' : 'pointer',
        color: '#fff',
        fontSize: '15px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        background: off
          ? 'linear-gradient(135deg, #D4A090 0%, #C9907A 100%)'
          : 'linear-gradient(135deg, #D4744D 0%, #C35E33 60%, #A34A24 100%)',
        boxShadow: off ? 'none' : '0 4px 14px rgba(195,94,51,0.35)',
        transition: 'transform 0.15s, box-shadow 0.15s',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        if (!off) {
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(195,94,51,0.45)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = off ? 'none' : '0 4px 14px rgba(195,94,51,0.35)'
      }}
    >
      {loading ? (
        <>
          <svg
            style={{ animation: 'spin 0.8s linear infinite' }}
            width="18" height="18" viewBox="0 0 24 24" fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span style={{ opacity: 0.8 }}>Please wait…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </>
      ) : (
        children
      )}
    </button>
  )
}