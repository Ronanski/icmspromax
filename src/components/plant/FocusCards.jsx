import React from 'react';
import { Calendar, Zap, PlayCircle, CheckCircle2 } from 'lucide-react';

export default function FocusCards({ orders = [], onCardClick }) {
  const scheduledCount = orders.filter(j => j.status === 'Scheduled' || j.status === 'Open').length;
  const breakInCount = orders.filter(j => j.job_type === 'Break-In' && j.status !== 'Completed').length;
  const inProgressCount = orders.filter(j => j.status === 'In-Progress').length;
  const completedCount = orders.filter(j => j.status === 'Completed').length;

  const cards = [
    { id: 'scheduled', label: 'Scheduled Work', count: scheduledCount, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'breakin', label: 'Break-In Active', count: breakInCount, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'inprogress', label: 'In Execution', count: inProgressCount, icon: PlayCircle, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'completed', label: 'Shift Accomplished', count: completedCount, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
  ];

  return (
    /* RESPONSIVE GRID: 1 col sa CP (default), 2 cols sa Tablet (sm), 4 cols sa Desktop (lg) */
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={() => onCardClick && onCardClick(card.id)}
            className="flex items-center justify-between p-4 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {card.label}
              </p>
              <p className="text-2xl font-bold tracking-tight sm:text-3xl">
                {card.count}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
