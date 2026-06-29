import React, { useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  Users,
  Receipt,
  History,
  Menu,
  Settings,
  ChefHat,
  UtensilsCrossed,
  LogOut,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PwaInstallButton } from '@/components/pwa-install-button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

type NavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/app' },
  { icon: Users, label: 'Members', href: '/app/members' },
  { icon: UtensilsCrossed, label: 'Meals', href: '/app/meals' },
  { icon: Receipt, label: 'Expenses', href: '/app/expenses' },
  { icon: History, label: 'History', href: '/app/history' },
  { icon: Settings, label: 'Settings', href: '/app/settings' },
];

const PRIMARY_MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => item.href !== '/app/settings');
const SWIPE_NAV_ROUTES = PRIMARY_MOBILE_NAV_ITEMS.map((item) => item.href);
const SWIPE_MIN_DISTANCE = 80;
const SWIPE_DIRECTION_RATIO = 1.5;

function isSwipeIgnoredTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return true;
  }

  return Boolean(
    target.closest(
      [
        'a',
        'button',
        'input',
        'textarea',
        'select',
        '[contenteditable="true"]',
        '[role="button"]',
        '[role="dialog"]',
        '[data-radix-dialog-content]',
        '[data-swipe-ignore]',
      ].join(','),
    ),
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  // Fix: was called twice before - once for location, once for setLocation.
  // A single call gives both values and avoids two separate router subscriptions.
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut();
      setLocation('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      setIsLoggingOut(false);
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (window.innerWidth >= 768 || !SWIPE_NAV_ROUTES.includes(location)) {
      touchStartRef.current = null;
      return;
    }

    if (isSwipeIgnoredTarget(event.target)) {
      touchStartRef.current = null;
      return;
    }

    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start || window.innerWidth >= 768) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (
      Math.abs(deltaX) < SWIPE_MIN_DISTANCE ||
      Math.abs(deltaX) < Math.abs(deltaY) * SWIPE_DIRECTION_RATIO
    ) {
      return;
    }

    const currentIndex = SWIPE_NAV_ROUTES.indexOf(location);
    if (currentIndex === -1) {
      return;
    }

    const nextIndex =
      deltaX < 0
        ? (currentIndex + 1) % SWIPE_NAV_ROUTES.length
        : (currentIndex - 1 + SWIPE_NAV_ROUTES.length) % SWIPE_NAV_ROUTES.length;

    setLocation(SWIPE_NAV_ROUTES[nextIndex]);
  };

  const brand = (
    <Link href="/app">
      <div className="flex min-w-0 cursor-pointer items-center gap-2">
        <ChefHat className="h-7 w-7 shrink-0 text-primary md:h-8 md:w-8" />
        <span className="truncate font-heading text-lg font-bold text-primary md:text-xl">
          MealTrack
        </span>
      </div>
    </Link>
  );

  const mobileSheet = (
    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
      <SheetContent side="left" className="w-[80%] max-w-[300px] p-0">
        <div className="flex h-full flex-col bg-card">
          <div className="border-b p-6">
            <Link href="/app">
              <div className="flex cursor-pointer items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                <ChefHat className="h-6 w-6 text-primary" />
                <span className="font-heading text-xl font-bold">MealTrack</span>
              </div>
            </Link>
          </div>
          <nav className="flex-1 space-y-2 p-4">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-md px-4 py-3 transition-colors',
                    location === item.href
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
              </Link>
            ))}
          </nav>
          <div className="space-y-3 border-t p-4">
            <div className="truncate px-2 text-sm text-muted-foreground">
              {user?.email ?? 'Signed in'}
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              disabled={isLoggingOut}
              onClick={() => { setIsMobileMenuOpen(false); void handleLogout(); }}
            >
              {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="min-h-screen bg-background">
      {mobileSheet}

      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-card px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {brand}
        </div>

        <PwaInstallButton
          appId="main"
          appName="MealTrack"
          className="h-9 shrink-0 gap-1.5 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm max-[380px]:[&_span]:hidden"
        />
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col border-r bg-card md:sticky md:top-16 md:flex">
          <nav className="flex-1 space-y-2 p-4 pt-6">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md px-4 py-3 transition-colors',
                    location === item.href
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
              </Link>
            ))}
          </nav>

          <div className="space-y-3 border-t p-4">
            <div className="truncate px-2 text-sm text-muted-foreground">
              {user?.email ?? 'Signed in'}
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
            >
              {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main
          className="min-w-0 flex-1 overflow-y-auto"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => {
            touchStartRef.current = null;
          }}
        >
          <div className="container mx-auto max-w-5xl p-4 pb-28 md:p-8">
            {children}
          </div>
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
        aria-label="Primary mobile navigation"
        data-swipe-ignore
      >
        <div className="grid h-16 grid-cols-6 items-center gap-1">
          {PRIMARY_MOBILE_NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium transition-colors',
                  location === item.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="w-full truncate text-center leading-none">{item.label}</span>
              </div>
            </Link>
          ))}
          <button
            type="button"
            className="flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5 shrink-0" />
            <span className="w-full truncate text-center leading-none">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

