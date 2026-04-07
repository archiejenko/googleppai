import { Link, useNavigate } from 'react-router-dom';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '../ui/navigation-menu';
import { capabilitySections } from '../../data/capabilitiesData';

export default function OastNavMenu() {
  const navigate = useNavigate();

  const handleCapabilityItemClick = (sectionId: string) => {
    navigate('/capabilities#' + sectionId);
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  return (
    <NavigationMenu>
      <NavigationMenuList className="gap-1">

        {/* Home — direct link */}
        <NavigationMenuItem>
          <Link
            to="/"
            className="inline-flex h-10 items-center px-3 py-2 text-sm transition-colors tracking-wide hover:text-white"
            style={{ color: 'var(--mkt-text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
          >
            Home
          </Link>
        </NavigationMenuItem>

        {/* Capabilities — dropdown with section anchors */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>Capabilities</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid grid-cols-1 w-[320px]">
              {capabilitySections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => handleCapabilityItemClick(section.id)}
                    className="block w-full text-left select-none p-4 leading-none no-underline outline-none transition-colors hover:bg-[rgba(255,107,107,0.06)] focus:bg-[rgba(255,107,107,0.06)]"
                    style={{ borderRadius: 0 }}
                  >
                    <div
                      className="text-sm font-semibold text-white mb-1 uppercase tracking-[0.06em]"
                      style={{ fontFamily: 'Oswald, sans-serif' }}
                    >
                      {section.dropdown.label}
                    </div>
                    <div
                      className="text-xs leading-relaxed"
                      style={{ color: 'var(--mkt-text-muted)', fontFamily: 'DM Sans, sans-serif' }}
                    >
                      {section.dropdown.description}
                    </div>
                  </button>
                </li>
              ))}
              <li>
                <Link
                  to="/capabilities"
                  className="block px-4 py-3 text-sm uppercase tracking-[0.08em] transition-colors hover:opacity-80"
                  style={{ color: 'var(--mkt-accent)', fontFamily: 'DM Sans, sans-serif', borderRadius: 0 }}
                >
                  View All Capabilities →
                </Link>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Industries — direct link */}
        <NavigationMenuItem>
          <Link
            to="/industries"
            className="inline-flex h-10 items-center px-3 py-2 text-sm transition-colors tracking-wide hover:text-white"
            style={{ color: 'var(--mkt-text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
          >
            Industries
          </Link>
        </NavigationMenuItem>

        {/* User Journey — direct link */}
        <NavigationMenuItem>
          <Link
            to="/user-journey"
            className="inline-flex h-10 items-center px-3 py-2 text-sm transition-colors tracking-wide hover:text-white"
            style={{ color: 'var(--mkt-text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
          >
            User Journey
          </Link>
        </NavigationMenuItem>

        {/* Pricing — direct link */}
        <NavigationMenuItem>
          <Link
            to="/pricing"
            className="inline-flex h-10 items-center px-3 py-2 text-sm transition-colors tracking-wide hover:text-white"
            style={{ color: 'var(--mkt-text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
          >
            Pricing
          </Link>
        </NavigationMenuItem>

        {/* Insights — direct link */}
        <NavigationMenuItem>
          <Link
            to="/insights"
            className="inline-flex h-10 items-center px-3 py-2 text-sm transition-colors tracking-wide hover:text-white"
            style={{ color: 'var(--mkt-text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
          >
            Insights
          </Link>
        </NavigationMenuItem>

        {/* About — direct link */}
        <NavigationMenuItem>
          <Link
            to="/about-us"
            className="inline-flex h-10 items-center px-3 py-2 text-sm transition-colors tracking-wide hover:text-white"
            style={{ color: 'var(--mkt-text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
          >
            About
          </Link>
        </NavigationMenuItem>

      </NavigationMenuList>
    </NavigationMenu>
  );
}
