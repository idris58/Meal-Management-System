import { useMeal } from '@/lib/meal-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function HistoryPage() {
  const { archives, deleteArchive, currentUser } = useMeal();

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
          <AccordionItem key={archive.id} value={archive.id} className="border rounded-lg bg-card px-4 relative group">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-1 items-center justify-between">
                <div className="text-left">
                  <p className="font-bold">Cycle Ended: {format(new Date(archive.endDate), 'PPP')}</p>
                  <p className="text-sm text-muted-foreground">{archive.members.length} Members • {archive.stats.totalMealsConsumed} Total Meals</p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                    Rate: ৳{archive.stats.currentMealRate.toFixed(2)}
                  </Badge>
                  {currentUser?.role === 'admin' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete History Entry?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This cycle history will be permanently deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteArchive(archive.id)} className="bg-destructive text-destructive-foreground">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pt-2">
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase">Total Deposits</p>
                  <p className="font-bold">৳{archive.stats.totalDeposits.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase">Meal Expense</p>
                  <p className="font-bold">৳{archive.stats.totalMealExpenses.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase">Fixed Expense</p>
                  <p className="font-bold">৳{archive.stats.totalFixedExpenses.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase">Fixed Rate</p>
                  <p className="font-bold">৳{archive.stats.fixedCostPerMember.toFixed(2)}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <MemberHead>Member</MemberHead>
                      <MemberHead className="text-center">Meals</MemberHead>
                      <MemberHead className="text-center">Deposit</MemberHead>
                      <MemberHead className="text-right">Final Balance</MemberHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archive.members.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-center">{m.mealsEaten}</TableCell>
                        <TableCell className="text-center">৳{m.deposit.toFixed(2)}</TableCell>
                        <TableCell className={cn("text-right font-bold", m.balance >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {m.balance >= 0 ? '+' : '-'}{Math.round(Math.abs(m.balance))}
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

function MemberHead({ children, className }: { children: React.ReactNode, className?: string }) {
  return <TableHead className={cn("bg-muted/50", className)}>{children}</TableHead>;
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
