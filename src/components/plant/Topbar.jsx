import React from 'react';
import { Menu, Bell, Shield, User } from 'lucide-react';

export default function Topbar({ onToggleSidebar, activeWorkspace }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur transition-all sm:px-6">
      {/* Left side: Hamburger Button (Visible on Mobile only) & App Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground shadow-sm">
            P
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight tracking-tight sm:text-base">
              ICMS ProMax
            </span>
            <span className="text-[10px] text-muted-foreground sm:text-xs">
              LPDSI Limay 1
            </span>
          </div>
        </div>
      </div>

      {/* Right side: System Status & User Info */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Online</span>
        </div>

        <div className="flex items-center gap-2 border-l pl-2 sm:pl-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-xs">
            TM
          </div>
          <div className="hidden flex-col text-left sm:flex">
            <span className="text-xs font-semibold">Turla Michael</span>
            <span className="text-[10px] text-muted-foreground">Plant Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
