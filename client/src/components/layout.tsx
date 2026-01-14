import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useMeal } from '@/lib/meal-context';
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  History, 
  Settings, 
  Menu, 
  X, 
  ChefHat,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { currentUser, setCurrentUser, members } = useMeal();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: Users, label: 'Members', href: '/members' },
    { icon: Receipt, label: 'Expenses', href: '/expenses' },
    { icon: History, label: 'History', href: '/history' },
  ];

  const handleUserSwitch = (memberId: string) => {
    const user = members.find(m => m.id === memberId);
    if (user) setCurrentUser(user);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-primary" />
          <span className="font-heading font-bold text-lg text-primary">MealManager</span>
        </div>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[80%] max-w-[300px] p-0">
            <div className="h-full flex flex-col bg-card">
              <div className="p-6 border-b">
                <div className="flex items-center gap-2 mb-6">
                  <ChefHat className="h-6 w-6 text-primary" />
                  <span className="font-heading font-bold text-xl">MealManager</span>
                </div>
                
                {currentUser && (
                  <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {currentUser.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{currentUser.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
                    </div>
                  </div>
                )}
              </div>

              <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div 
                      className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                        location === item.href 
                          ? 'bg-primary/10 text-primary font-medium' 
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

              <div className="p-4 border-t">
                <p className="text-xs text-muted-foreground mb-2 px-2">Switch User (Dev Only)</p>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <Button 
                      key={m.id} 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleUserSwitch(m.id)}
                      className={`text-xs ${currentUser?.id === m.id ? 'border-primary' : ''}`}
                    >
                      {m.name.split(' ')[0]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card h-screen sticky top-0">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-primary" />
            <span className="font-heading font-bold text-xl text-primary">MealManager</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
               <div 
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${
                  location === item.href 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          {currentUser && (
            <div className="flex items-center gap-3 mb-4">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {currentUser.avatar}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
              </div>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground mb-2">Switch User (Dev Only)</p>
          <div className="grid grid-cols-2 gap-2">
            {members.map(m => (
              <Button 
                key={m.id} 
                variant="outline" 
                size="sm" 
                onClick={() => handleUserSwitch(m.id)}
                className={`text-xs w-full justify-start ${currentUser?.id === m.id ? 'border-primary' : ''}`}
              >
                {m.name.split(' ')[0]}
              </Button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-4 md:p-8 max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}
