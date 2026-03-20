import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { featureSections } from '../../data/featuresData';
import OastNavMenu from './OastNavMenu';

export default function MarketingLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Scroll listener for nav border
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setMobileFeaturesOpen(false);
  };

  const nonFeaturesNavLinks = [
    { name: 'Industries', path: '/industries' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Insights', path: '/insights' },
    { name: 'About', path: '/about-us' },
  ];

  const handleMobileFeatureItemClick = (sectionId: string) => {
    closeMobileMenu();
    navigate('/features#' + sectionId);
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  return (
    <div
      className="marketing-layout min-h-screen text-[var(--mkt-text-primary)] font-sans overflow-x-hidden selection:bg-[rgba(255,107,107,0.3)] selection:text-white relative"
      style={{ background: 'var(--mkt-bg-canvas)' }}
    >
      {/* Sticky Navigation */}
      <nav
        className="fixed w-full z-50 transition-all duration-300"
        style={{
          background: 'var(--mkt-bg-canvas)',
          borderBottom: scrolled ? '1px solid #2a2a2e' : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex justify-between h-20 items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <span
                className="font-black text-3xl tracking-tighter text-white"
                style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
              >
                OAST<span style={{ color: 'var(--mkt-accent)' }}>.</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center">
              <OastNavMenu />
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-6">
              <Link
                to="/login"
                className="text-sm font-medium transition-colors"
                style={{ color: 'var(--mkt-text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--mkt-text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--mkt-text-secondary)')}
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 font-semibold text-sm text-white transition-all duration-200 hover:opacity-90"
                style={{
                  background: 'var(--mkt-accent)',
                  borderRadius: 0,
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Request Demo
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden transition-colors"
              style={{ color: 'var(--mkt-text-secondary)' }}
              onClick={() => isMobileMenuOpen ? closeMobileMenu() : setIsMobileMenuOpen(true)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div
            className="md:hidden absolute w-full px-6 py-8 flex flex-col space-y-4 shadow-2xl"
            style={{
              background: 'var(--mkt-bg-surface)',
              borderBottom: '1px solid var(--mkt-border)',
            }}
          >
            {/* Features accordion */}
            <div>
              <button
                className="text-lg font-medium flex justify-between items-center w-full transition-colors"
                style={{ color: 'var(--mkt-text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
                onClick={() => setMobileFeaturesOpen((v) => !v)}
              >
                Features
                <ChevronDown
                  size={16}
                  className={[
                    'transition-transform duration-150',
                    mobileFeaturesOpen ? 'rotate-180' : '',
                  ].join(' ')}
                />
              </button>

              {mobileFeaturesOpen && (
                <div
                  className="mt-3 pl-4 flex flex-col gap-3 border-l-2"
                  style={{ borderColor: 'rgba(255,107,107,0.3)' }}
                >
                  {featureSections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleMobileFeatureItemClick(s.id)}
                      className="text-left py-1"
                    >
                      <div className="text-sm text-white label-os uppercase tracking-[0.06em]">
                        {s.dropdown.label}
                      </div>
                      <div
                        className="text-xs mt-0.5"
                        style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, color: 'var(--mkt-text-muted)' }}
                      >
                        {s.dropdown.description}
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      navigate('/features');
                    }}
                    className="text-sm uppercase tracking-[0.08em] mt-1 text-left label-os"
                    style={{ color: 'var(--mkt-accent)' }}
                  >
                    View All Features →
                  </button>
                </div>
              )}
            </div>

            {/* Other nav links */}
            {nonFeaturesNavLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="text-lg font-medium transition-colors"
                style={{ color: 'var(--mkt-text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
                onClick={() => closeMobileMenu()}
              >
                {link.name}
              </Link>
            ))}

            <div
              className="pt-4 flex flex-col gap-4 mt-4"
              style={{ borderTop: '1px solid var(--mkt-border)' }}
            >
              <Link
                to="/login"
                className="w-full text-center py-3 transition-colors"
                style={{ color: 'var(--mkt-text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
                onClick={() => closeMobileMenu()}
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="w-full text-white px-6 py-3 font-semibold text-center transition-opacity hover:opacity-90"
                style={{ background: 'var(--mkt-accent)', borderRadius: 0 }}
                onClick={() => closeMobileMenu()}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-20 min-h-[calc(100vh-80px)]">
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{ background: 'var(--mkt-bg-surface)', borderTop: '1px solid var(--mkt-border)' }}>
        {/* Compliance trust strip */}
        <div className="py-5 px-6 md:px-12 text-center" style={{ borderBottom: '1px solid var(--mkt-border)' }}>
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
            SOC 2 TYPE II
            <span className="mx-4">—</span>
            GDPR COMPLIANT
            <span className="mx-4">—</span>
            SSO / SAML
            <span className="mx-4">—</span>
            99.9% UPTIME SLA
            <span className="mx-4">—</span>
            UK &amp; EU DATA RESIDENCY
          </p>
        </div>

        {/* Main footer row */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-14">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-10">

            {/* Left — wordmark + descriptor */}
            <div className="flex flex-col gap-2">
              <span
                className="font-black text-xl text-white"
                style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
              >
                OAST.
              </span>
              <span
                className="text-sm"
                style={{ color: 'var(--mkt-text-muted)', fontFamily: 'DM Sans, sans-serif' }}
              >
                AI-Native Revenue Operating System
              </span>
            </div>

            {/* Centre — nav links */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 items-center">
              {[
                { name: 'Features', path: '/features' },
                { name: 'Industries', path: '/industries' },
                { name: 'Pricing', path: '/pricing' },
                { name: 'About', path: '/about-us' },
                { name: 'Insights', path: '/insights' },
              ].map(link => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-sm transition-colors hover:text-white"
                  style={{ color: 'var(--mkt-text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Right — CTA + socials */}
            <div className="flex items-center gap-5">
              <Link
                to="/register"
                className="px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--mkt-accent)', borderRadius: 0, fontFamily: 'DM Sans, sans-serif' }}
              >
                Request Demo
              </Link>
              {/* LinkedIn */}
              <a
                href="https://linkedin.com/company/oast-app"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
                style={{ color: 'var(--mkt-text-muted)' }}
                aria-label="LinkedIn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect x="2" y="9" width="4" height="12"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </a>
              {/* Twitter / X */}
              <a
                href="https://x.com/oast_app"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
                style={{ color: 'var(--mkt-text-muted)' }}
                aria-label="Twitter / X"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="px-6 md:px-12 py-4"
          style={{ borderTop: '1px solid var(--mkt-border)' }}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <p
              className="text-xs"
              style={{ color: 'var(--mkt-text-muted)', fontFamily: 'DM Sans, sans-serif' }}
            >
              © 2026 OAST. All rights reserved.
            </p>
            <div className="flex gap-6">
              {[
                { name: 'Privacy', path: '/privacy-policy' },
                { name: 'Terms', path: '/terms-of-service' },
              ].map(link => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-xs transition-colors hover:text-white"
                  style={{ color: 'var(--mkt-text-muted)', fontFamily: 'DM Sans, sans-serif' }}
                >
                  {link.name}
                </Link>
              ))}
              <a
                href="mailto:hello@oast.app"
                className="text-xs transition-colors hover:text-white"
                style={{ color: 'var(--mkt-text-muted)', fontFamily: 'DM Sans, sans-serif' }}
              >
                hello@oast.app
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
