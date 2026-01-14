import { useMeal, Expense } from '@/lib/meal-context';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Zap } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Expenses() {
  const { expenses, members } = useMeal();

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'Unknown';

  const renderExpenseList = (filteredExpenses: Expense[]) => (
    <div className="space-y-3">
      {filteredExpenses.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No expenses found.</p>
      ) : (
        filteredExpenses.map((expense) => (
          <div key={expense.id} className="flex items-center justify-between p-4 bg-card border rounded-lg hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-full ${expense.type === 'meal' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                {expense.type === 'meal' ? <ShoppingBag className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-medium">{expense.description}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                  <span>•</span>
                  <span>Paid by {getMemberName(expense.paidBy)}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold font-heading">৳{expense.amount.toFixed(0)}</p>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                {expense.type === 'meal' ? 'Table A' : 'Table B'}
              </Badge>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between flex-none">
        <h1 className="text-2xl font-bold font-heading">Expenses</h1>
      </div>

      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mb-4 flex-none">
          <TabsTrigger value="all">All Expenses</TabsTrigger>
          <TabsTrigger value="meal">Meals (Khoroc)</TabsTrigger>
          <TabsTrigger value="fixed">Fixed (Other)</TabsTrigger>
        </TabsList>
        
        <ScrollArea className="flex-1 -mx-4 px-4">
          <TabsContent value="all" className="m-0">
            {renderExpenseList([...expenses].reverse())}
          </TabsContent>
          <TabsContent value="meal" className="m-0">
            {renderExpenseList(expenses.filter(e => e.type === 'meal').reverse())}
          </TabsContent>
          <TabsContent value="fixed" className="m-0">
            {renderExpenseList(expenses.filter(e => e.type === 'fixed').reverse())}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
