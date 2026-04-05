import * as React from 'react';
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu';
import { cva } from 'class-variance-authority';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn('relative z-10 flex max-w-max flex-1 items-center justify-center', className)}
    {...props}
  >
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
));
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName;

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn('group flex flex-1 list-none items-center justify-center space-x-1', className)}
    {...props}
  />
));
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName;

const NavigationMenuItem = NavigationMenuPrimitive.Item;

const navigationMenuTriggerStyle = cva(
  // OAST: transparent bg, Oswald via global selector, coral on active/open
  'group inline-flex h-10 w-max items-center justify-center gap-1.5 bg-transparent px-3 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ' +
  'text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] ' +
  'focus:text-[rgb(var(--text-primary))] focus:outline-none ' +
  'data-[state=open]:text-[rgb(var(--accent-primary))]'
);

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle(), 'group', className)}
    {...props}
  >
    {children}{' '}
    <ChevronDown
      size={13}
      aria-hidden="true"
      className="relative top-[1px] transition-transform duration-200 group-data-[state=open]:rotate-180 text-[rgb(var(--text-muted))]"
    />
  </NavigationMenuPrimitive.Trigger>
));
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName;

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      // OAST panel: dark surface, sharp border, no radius, no shadow
      'absolute top-0 left-0 w-full md:absolute md:w-auto',
      // Entry animation
      'data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out',
      'data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out',
      'data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52',
      'data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52',
      className
    )}
    {...props}
  />
));
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName;

const NavigationMenuLink = NavigationMenuPrimitive.Link;

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className={cn('absolute left-0 top-full flex justify-center')}>
    <NavigationMenuPrimitive.Viewport
      className={cn(
        // OAST viewport: slightly lifted bg, softened border, rounded panel, soft shadow
        'origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden',
        'bg-[#1e1e20] border border-white/[0.07]',
        'rounded-xl',
        'shadow-[0_8px_32px_rgba(0,0,0,0.45)]',
        // Animations: fade + subtle slide-down
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out data-[state=open]:fade-in',
        'data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-1',
        'duration-200',
        'md:w-[var(--radix-navigation-menu-viewport-width)]',
        className
      )}
      ref={ref}
      {...props}
    />
  </div>
));
NavigationMenuViewport.displayName = NavigationMenuPrimitive.Viewport.displayName;

const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      'top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden',
      'data-[state=visible]:animate-in data-[state=hidden]:animate-out',
      'data-[state=hidden]:fade-out data-[state=visible]:fade-in',
      className
    )}
    {...props}
  >
    {/* OAST: coral triangle indicator */}
    <div className="relative top-[60%] h-2 w-2 rotate-45 bg-[rgb(var(--accent-primary))]" />
  </NavigationMenuPrimitive.Indicator>
));
NavigationMenuIndicator.displayName = NavigationMenuPrimitive.Indicator.displayName;

// OAST ListItem — replicates existing dropdown item pattern from MarketingLayout
const ListItem = React.forwardRef<
  React.ElementRef<'a'>,
  React.ComponentPropsWithoutRef<'a'> & { title: string; href: string }
>(({ className, title, children, href, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          href={href}
          className={cn(
            // OAST: no bg-flash on hover, coral left-border accent, p-4, 0px radius
            'block p-4 text-left transition-colors duration-150 select-none outline-none',
            'border-l-2 border-transparent',
            'hover:bg-[rgba(255,107,107,0.06)] hover:border-l-2 hover:border-[rgb(var(--accent-primary))]',
            'focus:bg-[rgba(255,107,107,0.06)] focus:border-[rgb(var(--accent-primary))]',
            className
          )}
          {...props}
        >
          {/* Title: Oswald uppercase via label-os */}
          <div className="text-[12px] uppercase tracking-[0.08em] text-[rgb(var(--text-primary))] label-os mb-0.5">
            {title}
          </div>
          {/* Description: DM Sans, regular weight */}
          {children && (
            <p
              className="text-[11px] text-[rgb(var(--text-muted))] leading-snug"
              style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
            >
              {children}
            </p>
          )}
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = 'ListItem';

export {
  navigationMenuTriggerStyle, // eslint-disable-line react-refresh/only-export-components
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuLink,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  ListItem,
};
