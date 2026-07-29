import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  Users,
  Receipt,
  FileBarChart,
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
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { LocalizedRoleBadge } from '@/components/localized-role-badge';

type NavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'nav.dashboard', href: '/app' },
  { icon: Users, label: 'nav.members', href: '/app/members' },
  { icon: UtensilsCrossed, label: 'nav.meals', href: '/app/meals' },
  { icon: Receipt, label: 'nav.expenses', href: '/app/expenses' },
  { icon: FileBarChart, label: 'nav.reports', href: '/app/reports' },
  { icon: History, label: 'nav.history', href: '/app/history' },
  { icon: Settings, label: 'nav.settings', href: '/app/settings' },
];

const PRIMARY_MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => item.href !== '/app/settings');

export function Layout({ children }: { children: React.ReactNode }) {
  // Fix: was called twice before - once for location, once for setLocation.
  // A single call gives both values and avoids two separate router subscriptions.
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { t } = useTranslation();

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

  const userSummary = (
    <div className="min-w-0 px-2">
      <div className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{profile?.full_name ?? user?.email ?? t('auth.signedIn')}</span>{profile ? <LocalizedRoleBadge role={profile.role} /> : null}</div>
      {user?.email ? <p className="truncate text-xs text-muted-foreground">{user.email}</p> : null}
    </div>
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
                  {t(item.label)}
                </div>
              </Link>
            ))}
          </nav>
          <div className="space-y-3 border-t p-4">
            {userSummary}
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              disabled={isLoggingOut}
              onClick={() => { setIsMobileMenuOpen(false); void handleLogout(); }}
            >
              {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {isLoggingOut ? t('auth.loggingOut') : t('auth.logout')}
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

        <div className="flex items-center gap-2"><ThemeToggle /><LanguageSwitcher /><PwaInstallButton
          appId="main"
          appName="MealTrack"
          className="h-9 shrink-0 gap-1.5 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm max-[380px]:[&_span]:hidden"
        />
        </div>
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
                  {t(item.label)}
                </div>
              </Link>
            ))}
          </nav>

          <div className="space-y-3 border-t p-4">
            {userSummary}
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
            >
              {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {isLoggingOut ? t('auth.loggingOut') : t('auth.logout')}
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-5xl p-4 pb-28 md:p-8">
            {children}
          </div>
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
        aria-label="Primary mobile navigation"
      >
        <div className="grid h-16 grid-cols-7 items-center gap-1">
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
                <span className="w-full truncate text-center leading-none">{t(item.label)}</span>
              </div>
            </Link>
          ))}
          <button
            type="button"
            className="flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5 shrink-0" />
            <span className="w-full truncate text-center leading-none">{t('nav.more')}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
