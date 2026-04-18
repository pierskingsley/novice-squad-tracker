export function CIUnderline({ color = '#F4C430', w = 100, style = {} }) {
  return (
    <svg width={w} height="10" viewBox="0 0 100 10" preserveAspectRatio="none" style={style}>
      <path d="M 2 6 Q 15 2 28 5 T 55 5 T 82 5 T 98 4" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function CIScribble({ color = '#2B3A5C', style = {} }) {
  return (
    <svg width="60" height="24" viewBox="0 0 60 24" style={style}>
      <path d="M 4 14 Q 10 4 18 10 T 32 12 T 48 8 T 58 14" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 14 20 L 18 16 M 40 20 L 44 16" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function CIStar({ color = '#F4C430', size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 3 L14 9 L20 10 L16 14 L17 20 L12 17 L7 20 L8 14 L4 10 L10 9 Z"
        fill={color} stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

export function CIWordmark({ dark = false, size = 20 }) {
  const ink = dark ? '#F5F1E8' : '#181614'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: size * 1.5, height: size * 1.5,
        background: '#D13A2E', color: '#F5F1E8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Archivo Black", Impact, sans-serif',
        fontSize: size * 0.9, fontWeight: 900,
        transform: 'rotate(-3deg)',
        boxShadow: `3px 3px 0 #2B3A5C`,
        flexShrink: 0,
      }}>V</div>
      <div style={{ lineHeight: 1 }}>
        <div style={{
          fontFamily: '"Archivo Black", Impact, sans-serif',
          fontSize: size, fontWeight: 900, color: ink,
          letterSpacing: -0.5, textTransform: 'uppercase',
        }}>Squad Log</div>
        <div style={{
          fontFamily: 'Caveat, cursive',
          fontSize: size * 0.62, color: '#D13A2E', marginTop: 2,
          transform: 'rotate(-1.5deg)', transformOrigin: 'left',
        }}>by Vesta R.C.</div>
      </div>
    </div>
  )
}
