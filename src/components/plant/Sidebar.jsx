import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Zap,
  Calendar,
  BarChart3,
  Boxes,
  Database,
  History,
  X
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  const navItems = [
    { id: 'focus', label: "Today's Focus", icon: LayoutDashboard },
    { id: 'orders', label: 'Work Orders', icon: ClipboardList },
    { id: 'breakin', label: 'Break-In Hub', icon: Zap },
    { id: 'calendar', label: 'Work Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'itemmaster', label: 'Item Master', icon: Boxes },
    { id: 'registry', label: 'System Registry', icon: Database },
    { id: 'handover', label: 'Shift Handover', icon: History }
  ];

  return (
    <>
      {/* Mobile Backdrop / Overlay (Kapag nakabukas sa Mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header with Close Button */}
        <div className="flex h-16 items-center justify-between border-b px-4 lg:hidden">
          <span className="font-bold text-sm">Navigation Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  if (onClose) onClose(); // Automatic isara sa Mobile kapag nag-select ng tab
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="border-t p-3 text-[11px] text-muted-foreground text-center">
          <p className="font-semibold">LPDSI Limay 1</p>
          <p>ICMS ProMax v1.0.0</p>
        </div>
      </aside>
    </>
  );
}
