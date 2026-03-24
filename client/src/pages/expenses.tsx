import { useEffect, useState } from 'react';
import { useMeal, Expense } from '@/lib/meal-context';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ShoppingBag, Zap, Plus, Pencil } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const expenseSchema = z.object({
  amount: z.coerce.number().min(1, 'Amount is required'),
  description: z.string().min(2, 'Description is required'),
  type: z.enum(['meal', 'fixed']),
  paidBy: z.string().min(2, 'Shopper name is required'),
});

function ExpenseEditor({
  expense,
  onClose,
}: {
  expense?: Expense | null;
  onClose: () => void;
}) {
  const { addExpense, updateExpense } = useMeal();
  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: expense?.amount ?? 0,
      description: expense?.description ?? '',
      type: expense?.type ?? 'meal',
      paidBy: expense?.paidBy ?? '',
    },
  });

  useEffect(() => {
    form.reset({
      amount: expense?.amount ?? 0,
      description: expense?.description ?? '',
      type: expense?.type ?? 'meal',
      paidBy: expense?.paidBy ?? '',
    });
  }, [expense, form]);

  const onSubmit = async (data: z.infer<typeof expenseSchema>) => {
    if (expense) {
      await updateExpense(expense.id, data);
    } else {
      await addExpense(data.amount, data.description, data.type, data.paidBy);
    }

    onClose();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expense Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="meal">Meal (Grocery/Food)</SelectItem>
                  <SelectItem value="fixed">Fixed (Bills/Utilities)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Input placeholder="e.g., Rice, WiFi Bill" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="paidBy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Who Shopped?</FormLabel>
              <FormControl><Input placeholder="Shopper's Name" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {expense ? 'Save Changes' : 'Add Expense'}
        </Button>
      </form>
    </Form>
  );
}

export default function Expenses() {
  const { expenses } = useMeal();
  const [openExpense, setOpenExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const renderExpenseList = (filteredExpenses: Expense[]) => {
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    return (
      <div className="space-y-3 pb-4">
        {filteredExpenses.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No expenses found.</p>
        ) : (
          <>
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`rounded-full p-2 ${expense.type === 'meal' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                    {expense.type === 'meal' ? <ShoppingBag className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                      <span>•</span>
                      <span>Paid by {expense.paidBy}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setEditingExpense(expense)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <div className="text-right">
                    <p className="font-heading font-bold">৳{expense.amount.toFixed(0)}</p>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                      {expense.type === 'meal' ? 'Table A' : 'Table B'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-between py-4">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="font-heading text-xl font-bold">৳{total.toFixed(2)}</span>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-none items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Expenses</h1>
        <Dialog open={openExpense} onOpenChange={setOpenExpense}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <ExpenseEditor onClose={() => setOpenExpense(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="flex flex-1 flex-col">
        <TabsList className="mb-4 grid w-full flex-none grid-cols-3">
          <TabsTrigger value="all">All Expenses</TabsTrigger>
          <TabsTrigger value="meal">Meals (Khoroc)</TabsTrigger>
          <TabsTrigger value="fixed">Fixed (Other)</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 -mx-4 px-4">
          <TabsContent value="all" className="m-0">
            {renderExpenseList([...expenses].reverse())}
          </TabsContent>
          <TabsContent value="meal" className="m-0">
            {renderExpenseList(expenses.filter((expense) => expense.type === 'meal').reverse())}
          </TabsContent>
          <TabsContent value="fixed" className="m-0">
            {renderExpenseList(expenses.filter((expense) => expense.type === 'fixed').reverse())}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingExpense ? (
            <ExpenseEditor
              expense={editingExpense}
              onClose={() => setEditingExpense(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
