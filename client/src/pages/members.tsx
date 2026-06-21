import { useMeal } from '@/lib/meal-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { ToastAction } from '@/components/ui/toast';
import { toast } from '@/hooks/use-toast';

const memberSchema = z.object({
  name: z.string().min(2, 'Name is required'),
});

function formatMealCount(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 1000) / 1000;
  return rounded.toString();
}

function AddMemberForm({ onClose }: { onClose: () => void }) {
  const { addMember } = useMeal();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof memberSchema>>({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = async (data: z.infer<typeof memberSchema>) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await addMember(data.name);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Member Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Member'}
        </Button>
      </form>
    </Form>
  );
}

function DepositForm({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const { addDeposit } = useMeal();
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'add' | 'deduct'>('add');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const val = parseFloat(amount);
    if (!isNaN(val) && val !== 0) {
      setIsSubmitting(true);
      const signedAmount = mode === 'deduct' ? -Math.abs(val) : Math.abs(val);
      try {
        await addDeposit(memberId, signedAmount, undefined, mode === 'deduct' ? 'Deduction/Refund' : undefined);
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={mode === 'add' ? 'default' : 'outline'}
          onClick={() => setMode('add')}
          disabled={isSubmitting}
        >
          Add
        </Button>
        <Button
          type="button"
          variant={mode === 'deduct' ? 'destructive' : 'outline'}
          onClick={() => setMode('deduct')}
          disabled={isSubmitting}
        >
          Deduct
        </Button>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Amount {mode === 'deduct' ? '(deduction)' : '(deposit)'}
        </label>
        <Input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
          disabled={isSubmitting}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : mode === 'deduct' ? 'Deduct Amount' : 'Add Deposit'}
      </Button>
    </form>
  );
}

export default function Members() {
  const { members, removeMember, restoreMember, getMemberStats } = useMeal();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [depositMemberId, setDepositMemberId] = useState<string | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  const handleRemoveMember = async (memberId: string) => {
    if (deletingMemberId) return;
    setDeletingMemberId(memberId);

    try {
      const member = members.find((entry) => entry.id === memberId);
      await removeMember(memberId);
      toast({
        title: 'Deleted',
        description: `${member?.name ?? 'Member'} removed. It will be permanently deleted in 10 seconds.`,
        action: (
          <ToastAction altText="Undo member delete" onClick={() => void restoreMember(memberId)}>
            Undo
          </ToastAction>
        ),
      });
    } finally {
      setDeletingMemberId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-heading">Members</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
            </DialogHeader>
            <AddMemberForm onClose={() => setIsAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => {
          const stats = getMemberStats(member.id);
          return (
            <Card key={member.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 flex items-start justify-between border-b bg-secondary/20">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">{member.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold">{member.name}</p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        disabled={deletingMemberId === member.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this member?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove {member.name} and also delete their meal logs and deposits for the current data set.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={deletingMemberId === member.id}
                        >
                          {deletingMemberId === member.id ? 'Deleting...' : 'Yes, Delete Member'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="p-4 space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Deposit</span>
                    <span className="font-bold">৳{member.deposit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Meals Eaten</span>
                    <span className="font-medium">{formatMealCount(member.mealsEaten)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Meal Cost</span>
                    <span className="font-medium">৳{stats.mealCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Fixed Share</span>
                    <span className="font-medium">৳{stats.fixedCost.toFixed(2)}</span>
                  </div>
                  <div className="pt-3 border-t flex justify-between items-center">
                    <span className="font-medium">Net Balance</span>
                    <span className={`font-bold text-lg ${stats.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stats.balance >= 0 ? '+' : '-'}{Math.round(Math.abs(stats.balance))}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full mt-2 gap-2"
                    onClick={() => setDepositMemberId(member.id)}
                  >
                    <Wallet className="h-4 w-4" />
                    Manage Deposit
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!depositMemberId} onOpenChange={(open) => !open && setDepositMemberId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Deposit</DialogTitle>
          </DialogHeader>
          {depositMemberId && (
            <DepositForm memberId={depositMemberId} onClose={() => setDepositMemberId(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
