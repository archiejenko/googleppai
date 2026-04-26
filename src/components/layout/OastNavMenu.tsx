import { useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { name: 'Home', path: '/' },
  { name: 'Capabilities', path: '/capabilities' },
  { name: 'Industries', path: '/industries' },
  { name: 'User Journey', path: '/user-journey' },
  { name: 'Pricing', path: '/pricing' },
  { name: 'Insights', path: '/insights' },
  { name: 'About', path: '/about-us' },
];

const COLUMNS = [
  {
    title: 'Training & Practice',
    color: '#FF6B6B',
    dimBg: 'rgba(255,107,107,0.12)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    links: ['Pre-Call Simulation', 'Skill Drills', 'Voice Personas', 'Session Replay'],
  },
  {
    title: 'Coaching & Development',
    color: '#4ADE80',
    dimBg: 'rgba(74,222,128,0.12)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    links: ['Morgan AI Coach', 'Alex AI Coach', 'Journey & Levelling', 'Goals & Milestones'],
  },
  {
    title: 'Analytics & Intelligence',
    color: '#60A5FA',
    dimBg: 'rgba(96,165,250,0.12)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    links: ['Transfer Gap Analysis', 'Training Analytics', 'Team Insights', 'Leaderboards'],
  },
  {
    title: 'Revenue Intelligence',
    color: '#A78BFA',
    dimBg: 'rgba(167,139,250,0.12)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    links: ['Win/Loss Engine', 'Meeting Intelligence', 'Pipeline Analytics', 'Revenue Forecasting'],
    tag: 'Upgrade',
  },
  {
    title: 'Team & Admin',
    color: '#FBBF24',
    dimBg: 'rgba(251,191,36,0.12)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    links: ['Team Management', 'Schedule & Calendar', 'Notifications', 'Audit Log'],
  },
];

export default function OastNavMenu() {
  const location = useLocation();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showDropdown = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setDropdownVisible(true), 100);
  }, []);

  const hideDropdown = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setDropdownVisible(false), 150);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
      {NAV_LINKS.map((link) =>
        link.name === 'Capabilities' ? (
          <div
            key={link.name}
            onMouseEnter={showDropdown}
            onMouseLeave={hideDropdown}
            style={{ position: 'relative' }}
          >
            <Link
              to={link.path}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                fontWeight: 500,
                color: isActive(link.path) ? '#FF6B6B' : '#7d8a98',
                padding: '8px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'color 0.15s',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive(link.path)) e.currentTarget.style.color = '#c9d1d9';
              }}
              onMouseLeave={(e) => {
                if (!isActive(link.path)) e.currentTarget.style.color = '#7d8a98';
              }}
            >
              {link.name}
            </Link>

            {/* Mega dropdown */}
            <div
              onMouseEnter={showDropdown}
              onMouseLeave={hideDropdown}
              style={{
                position: 'fixed',
                top: '64px',
                left: '50%',
                transform: dropdownVisible
                  ? 'translateX(-50%) translateY(0)'
                  : 'translateX(-50%) translateY(-4px)',
                opacity: dropdownVisible ? 1 : 0,
                pointerEvents: dropdownVisible ? 'auto' : 'none',
                transition: 'opacity 0.15s, transform 0.15s',
                maxWidth: '1100px',
                width: 'calc(100vw - 48px)',
                background: '#151c25',
                border: '1px solid #1e2a38',
                borderRadius: '12px',
                padding: '28px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                zIndex: 200,
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '24px' }}>
                {COLUMNS.map((col) => (
                  <div key={col.title}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: col.dimBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {col.icon}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Oswald', sans-serif",
                        fontSize: '13px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color: '#c9d1d9',
                        margin: '12px 0 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0',
                      }}
                    >
                      {col.title}
                      {col.tag && (
                        <span
                          style={{
                            fontSize: '9px',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            background: 'rgba(167,139,250,0.12)',
                            color: '#A78BFA',
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            marginLeft: '6px',
                          }}
                        >
                          Upgrade
                        </span>
                      )}
                    </div>
                    {col.links.map((linkText) => (
                      <Link
                        key={linkText}
                        to="/capabilities"
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '12px',
                          color: '#7d8a98',
                          display: 'block',
                          padding: '4px 0',
                          textDecoration: 'none',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#c9d1d9'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#7d8a98'; }}
                      >
                        {linkText}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>

              <div
                style={{
                  textAlign: 'right',
                  paddingTop: '16px',
                  borderTop: '1px solid #1e2a38',
                  marginTop: '16px',
                }}
              >
                <Link
                  to="/capabilities"
                  style={{
                    color: '#FF6B6B',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  View All Capabilities →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <Link
            key={link.name}
            to={link.path}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              fontWeight: 500,
              color: isActive(link.path) ? '#FF6B6B' : '#7d8a98',
              padding: '8px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              transition: 'color 0.15s',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive(link.path)) e.currentTarget.style.color = '#c9d1d9';
            }}
            onMouseLeave={(e) => {
              if (!isActive(link.path)) e.currentTarget.style.color = '#7d8a98';
            }}
          >
            {link.name}
          </Link>
        )
      )}
    </nav>
  );
}
