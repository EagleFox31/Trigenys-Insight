import { ImageResponse } from 'next/og'

const size = { height: 630, width: 1200 }

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        background: '#102f52',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
        padding: '76px 84px',
        width: '100%',
      }}
    >
      <div style={{ alignItems: 'center', display: 'flex', gap: 24 }}>
        <div
          style={{
            alignItems: 'center',
            border: '3px solid #e07520',
            color: '#f0a257',
            display: 'flex',
            fontSize: 30,
            fontWeight: 800,
            height: 68,
            justifyContent: 'center',
            width: 68,
          }}
        >
          TI
        </div>
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, letterSpacing: 2 }}>
          TRIGENYS INSIGHTS
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: '#f0a257', fontSize: 22, letterSpacing: 4, marginBottom: 24 }}>
          RESEARCH · DATA · DECISIONS
        </div>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, maxWidth: 920 }}>
          Comprendre les systèmes. Décider avec lucidité.
        </div>
      </div>
      <div style={{ color: '#a9bbc9', display: 'flex', fontSize: 22 }}>
        Technology, cybersecurity, business &amp; digital systems — from Africa and beyond.
      </div>
    </div>,
    size,
  )
}
