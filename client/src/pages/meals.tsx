import { useEffect, useMemo, useState } from 'react';
import { useMeal } from '@/lib/meal-context';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Minus, Utensils, Calendar as CalendarIcon } from 'lucide-react';
import { format, eachDayOfInterval, isSameDay, parseISO, min, max, startOfDay } from 'date-fns';
import { cn } from "@/lib/utils";

function formatMealCount(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 1000) / 1000;
  return rounded.toString();
}

function QuickLogMeal({
  onClose,
  initialDate,
}: {
  onClose: () => void;
  initialDate?: Date;
}) {
  const { logMeal, members, mealLogs } = useMeal();
  const [date, setDate] = useState<Date>(initialDate ?? new Date());
  const [mealCounts, setMealCounts] = useState<Record<string, string>>(
    Object.fromEntries(members.map(member => [member.id, '0']))
  );

  useEffect(() => {
    setDate(initialDate ?? new Date());
  }, [initialDate]);

  useEffect(() => {
    const shortDate = format(date, 'yyyy-MM-dd');
    const existingLogs = Object.fromEntries(
      members.map(member => {
        const log = mealLogs.find(entry => entry.memberId === member.id && entry.date === shortDate);
        return [member.id, log ? log.count.toString() : '0'];
      })
    );
    setMealCounts(existingLogs);
  }, [date, members, mealLogs]);

  const updateCount = (id: string, delta: number) => {
    setMealCounts(prev => {
      const currentVal = parseFloat(prev[id] || '0');
      const nextVal = Math.max(0, currentVal + delta);
      return { ...prev, [id]: nextVal.toString() };
    });
  };

  const handleInputChange = (id: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setMealCounts(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const dateStr = format(date, 'yyyy-MM-dd');

    await Promise.all(
      Object.entries(mealCounts).map(async ([memberId, countStr]) => {
        const count = parseFloat(countStr);
        await logMeal(memberId, isNaN(count) ? 0 : count, dateStr);
      }),
    );

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-full justify-start py-2 text-left text-sm font-normal', !date && 'text-muted-foreground')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[18rem] rounded-xl border bg-card p-0 shadow-2xl" align="center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(nextDate) => {
                if (nextDate) {
                  setDate(nextDate);
                  const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
                  document.dispatchEvent(escapeEvent);
                }
              }}
              initialFocus
              className="p-3"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="max-h-[40vh] space-y-4 overflow-y-auto pr-2">
        {members.map(member => (
          <div key={member.id} className="flex items-center justify-between rounded-lg border bg-secondary/10 p-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 text-xs"><AvatarFallback>{member.avatar}</AvatarFallback></Avatar>
              <span className="max-w-[100px] truncate text-sm font-medium">{member.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCount(member.id, -0.5)}>
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                className="h-8 w-16 px-1 text-center text-sm font-bold"
                value={mealCounts[member.id]}
                onChange={(event) => handleInputChange(member.id, event.target.value)}
              />
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCount(member.id, 0.5)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Save Daily Log</Button>
    </form>
  );
}

export default function Meals() {
  const { members, mealLogs } = useMeal();
  const [openMeal, setOpenMeal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  
  const today = startOfDay(new Date());
  
  let days: Date[] = [];
  
  if (mealLogs.length > 0) {
    const logDates = mealLogs.map(l => startOfDay(parseISO(l.date)));
    const startDate = min(logDates);
    const endDate = max([...logDates, today]);
    days = eachDayOfInterval({ start: startDate, end: endDate }).reverse();
  } else {
    days = [today];
  }

  const memberMealTotals = useMemo(() => {
    const totals = new Map<string, number>();

    for (const member of members) {
      totals.set(member.id, 0);
    }

    for (const log of mealLogs) {
      totals.set(log.memberId, (totals.get(log.memberId) ?? 0) + log.count);
    }

    return totals;
  }, [mealLogs, members]);

  const openEditorForDate = (day: Date) => {
    setSelectedDate(day);
    setOpenMeal(true);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-heading">Meal Logs</h1>
        <Dialog
          open={openMeal}
          onOpenChange={(open) => {
            setOpenMeal(open);
            if (!open) {
              setSelectedDate(undefined);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              className="gap-2"
              onClick={() => setSelectedDate(undefined)}
            >
              <Utensils className="h-4 w-4" />
              Log Meals
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedDate ? `Edit Meals for ${format(selectedDate, 'PPP')}` : 'Log Meals by Date'}
              </DialogTitle>
            </DialogHeader>
            <QuickLogMeal
              initialDate={selectedDate}
              onClose={() => {
                setOpenMeal(false);
                setSelectedDate(undefined);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="h-[calc(100vh-240px)] overflow-auto overscroll-x-contain [scrollbar-gutter:stable_both-edges]">
          <table className="min-w-max w-full border-collapse text-sm">
            <thead className="sticky top-0 z-30">
              <tr className="bg-card border-b shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <th className="sticky left-0 top-0 z-40 min-w-[84px] whitespace-nowrap border-r bg-card p-3 text-left text-xs font-bold sm:min-w-[96px] md:min-w-[112px] md:p-4 md:text-sm">
                  Date
                </th>
                {members.map(member => (
                  <th key={member.id} className="min-w-[72px] border-r bg-card p-1.5 text-center sm:min-w-[84px] md:min-w-[100px] md:p-2">
                    <div className="flex flex-col items-center gap-1 py-0.5 md:py-1">
                      <Avatar className="h-5 w-5 text-[9px] md:h-6 md:w-6 md:text-[10px]">
                        <AvatarFallback>{member.avatar}</AvatarFallback>
                      </Avatar>
                      <span className="w-14 truncate text-[9px] font-bold uppercase sm:w-16 md:w-20 md:text-[10px]">{member.name.split(' ')[0]}</span>
                    </div>
                  </th>
                ))}
                <th className="min-w-[64px] bg-card p-3 text-right text-xs font-bold sm:min-w-[72px] md:min-w-[80px] md:p-4 md:text-sm">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayLogs = mealLogs.filter(l => l.date === dateStr);
                const dayTotal = dayLogs.reduce((s, l) => s + l.count, 0);

                return (
                  <tr
                    key={dateStr}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => openEditorForDate(day)}
                  >
                    <td className="sticky left-0 z-10 whitespace-nowrap border-r bg-card p-3 font-medium md:p-4">
                      <div className="flex flex-col">
                        <span className={cn(isSameDay(day, today) && "text-primary font-bold")}>
                          {format(day, 'dd MMM')}
                        </span>
                        <span className="text-[9px] text-muted-foreground md:text-[10px]">{format(day, 'EEEE')}</span>
                      </div>
                    </td>
                    {members.map(member => {
                      const log = dayLogs.find(l => l.memberId === member.id);
                      return (
                        <td key={member.id} className="border-r p-2.5 text-center font-mono text-xs sm:p-3 sm:text-sm md:p-4">
                          {log ? formatMealCount(log.count) : '-'}
                        </td>
                      );
                    })}
                    <td className="bg-card p-3 text-right font-bold text-emerald-600 md:p-4">
                      {dayTotal > 0 ? formatMealCount(dayTotal) : '-'}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 bg-secondary/20">
                <td className="sticky left-0 z-20 min-w-[84px] whitespace-nowrap border-r bg-card p-3 font-bold sm:min-w-[96px] md:min-w-[112px] md:p-4">
                  Total
                </td>
                {members.map(member => (
                  <td
                    key={member.id}
                    className="border-r p-2.5 text-center font-bold text-emerald-700 sm:p-3 sm:text-sm md:p-4"
                  >
                    {formatMealCount(memberMealTotals.get(member.id) ?? 0)}
                  </td>
                ))}
                <td className="bg-secondary/20 p-3 text-right font-bold text-emerald-700 md:p-4">
                  {formatMealCount(mealLogs.reduce((sum, log) => sum + log.count, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
