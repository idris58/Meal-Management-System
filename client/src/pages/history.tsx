import { useMeal } from '@/lib/meal-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export default function HistoryPage() {
  const { archives } = useMeal();

  if (archives.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <h1 className="text-2xl font-bold font-heading mb-2">No Past Cycles</h1>
        <p>Archive your first cycle to see it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-heading">Past Cycles</h1>

      <Accordion type="single" collapsible className="space-y-4">
        {archives.map((archive) => (
          <AccordionItem key={archive.id} value={archive.id} className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-1 items-center justify-between pr-4">
                <div className="text-left">
                  <p className="font-bold">Cycle Ended: {format(new Date(archive.endDate), 'PPP')}</p>
                  <p className="text-sm text-muted-foreground">{archive.members.length} Members • {archive.stats.totalMealsConsumed} Total Meals</p>
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  Rate: ৳{archive.stats.currentMealRate.toFixed(2)}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pt-2">
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase">Total Deposits</p>
                  <p className="font-bold">৳{archive.stats.totalDeposits.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase">Meal Expense</p>
                  <p className="font-bold">৳{archive.stats.totalMealExpenses.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase">Fixed Expense</p>
                  <p className="font-bold">৳{archive.stats.totalFixedExpenses.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase">Fixed Rate</p>
                  <p className="font-bold">৳{archive.stats.fixedCostPerMember.toFixed(0)}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead className="text-center">Meals</TableHead>
                      <TableHead className="text-center">Deposit</TableHead>
                      <TableHead className="text-right">Final Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archive.members.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-center">{m.mealsEaten}</TableCell>
                        <TableCell className="text-center">৳{m.deposit.toFixed(0)}</TableCell>
                        <TableCell className={cn("text-right font-bold", m.balance >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {m.balance >= 0 ? '+' : '-'}{Math.abs(m.balance).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
