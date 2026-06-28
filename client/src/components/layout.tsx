import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PwaInstallButton } from '@/components/pwa-install-button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth-context';

export function Layout({ children }: { children: React.ReactNode }) {
  // Fix: was called twice before - once for location, once for setLocation.
  // A single call gives both values and avoids two separate router subscriptions.
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, signOut } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/app' },
    { icon: Users, label: 'Members', href: '/app/members' },
    { icon: UtensilsCrossed, label: 'Meals', href: '/app/meals' },
    { icon: Receipt, label: 'Expenses', href: '/app/expenses' },
    { icon: History, label: 'History', href: '/app/history' },
    { icon: Settings, label: 'Settings', href: '/app/settings' },
  ];

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-card px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 p-0 md:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
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
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={`flex items-center gap-3 rounded-md px-4 py-3 transition-colors ${
                          location === item.href
                            ? 'bg-primary/10 font-medium text-primary'
                            : 'text-muted-foreground hover:bg-muted'
                        }`}
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
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex cursor-pointer items-center gap-3 rounded-md px-4 py-3 transition-colors ${
                    location === item.href
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
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
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-5xl p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

