import { useMeal } from '@/lib/meal-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Meals() {
  const { members, mealLogs } = useMeal();
  
  // For the mockup, we'll show the current month
  const today = new Date();
  const days = eachDayOfInterval({
    start: startOfMonth(today),
    end: endOfMonth(today)
  });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-heading">Meal Logs</h1>
        <p className="text-sm text-muted-foreground">{format(today, 'MMMM yyyy')}</p>
      </div>

      <Card className="flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-250px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[150px] sticky left-0 bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Date</TableHead>
                {members.map(member => (
                  <TableHead key={member.id} className="text-center min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <Avatar className="h-6 w-6 text-[10px]">
                        <AvatarFallback>{member.avatar}</AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] uppercase truncate w-20">{member.name.split(' ')[0]}</span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-right font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayLogs = mealLogs.filter(l => l.date === dateStr);
                const dayTotal = dayLogs.reduce((s, l) => s + l.count, 0);

                if (dayTotal === 0 && day > today) return null; // Don't show future empty days

                return (
                  <TableRow key={dateStr}>
                    <TableCell className="font-medium sticky left-0 bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div className="flex flex-col">
                        <span className={cn(isSameDay(day, today) && "text-primary font-bold")}>
                          {format(day, 'dd MMM')}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{format(day, 'EEEE')}</span>
                      </div>
                    </TableCell>
                    {members.map(member => {
                      const log = dayLogs.find(l => l.memberId === member.id);
                      return (
                        <TableCell key={member.id} className="text-center font-mono text-sm">
                          {log ? log.count : '-'}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-bold text-emerald-600">
                      {dayTotal > 0 ? dayTotal : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Card>
    </div>
  );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
