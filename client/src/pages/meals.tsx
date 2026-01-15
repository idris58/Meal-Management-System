import { useMeal } from '@/lib/meal-context';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, eachDayOfInterval, isSameDay, parseISO, min, max, startOfDay } from 'date-fns';
import { cn } from "@/lib/utils";

export default function Meals() {
  const { members, mealLogs } = useMeal();
  
  const today = startOfDay(new Date());
  
  let days: Date[] = [];
  
  if (mealLogs.length > 0) {
    const logDates = mealLogs.map(l => startOfDay(parseISO(l.date)));
    const startDate = min(logDates);
    const endDate = max([...logDates, today]);
    days = eachDayOfInterval({ start: startDate, end: endDate });
  } else {
    days = [today];
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-heading">Meal Logs</h1>
        <p className="text-sm text-muted-foreground">Active Cycle</p>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden border rounded-lg bg-card shadow-sm">
        <div className="h-[calc(100vh-250px)] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-30">
              <tr className="bg-card border-b shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <th className="sticky left-0 top-0 z-40 bg-card p-4 text-left font-bold border-r whitespace-nowrap min-w-[120px]">
                  Date
                </th>
                {members.map(member => (
                  <th key={member.id} className="p-2 text-center border-r min-w-[100px] bg-card">
                    <div className="flex flex-col items-center gap-1 py-1">
                      <Avatar className="h-6 w-6 text-[10px]">
                        <AvatarFallback>{member.avatar}</AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] uppercase truncate w-20 font-bold">{member.name.split(' ')[0]}</span>
                    </div>
                  </th>
                ))}
                <th className="sticky top-0 right-0 z-30 bg-card p-4 text-right font-bold min-w-[80px]">
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
                  <tr key={dateStr} className="hover:bg-muted/50 transition-colors">
                    <td className="sticky left-0 z-10 bg-card p-4 font-medium border-r whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={cn(isSameDay(day, today) && "text-primary font-bold")}>
                          {format(day, 'dd MMM')}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{format(day, 'EEEE')}</span>
                      </div>
                    </td>
                    {members.map(member => {
                      const log = dayLogs.find(l => l.memberId === member.id);
                      return (
                        <td key={member.id} className="p-4 text-center font-mono border-r">
                          {log ? log.count : '-'}
                        </td>
                      );
                    })}
                    <td className="sticky right-0 z-10 bg-card p-4 text-right font-bold text-emerald-600">
                      {dayTotal > 0 ? dayTotal : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
