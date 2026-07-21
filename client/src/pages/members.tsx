import { useMeal, type Member } from '@/lib/meal-context';
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
import { Plus, Trash2, Wallet, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { UndoDeleteGhost } from '@/components/undo-delete-ghost';

const DELETE_GRACE_MS = 10 * 1000;

const memberSchema = z.object({
  name: z.string().min(2, 'Name is required'),
});

function formatMealCount(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 1000) / 1000;
  return rounded.toString();
}

type MemberStatsSnapshot = {
  mealCost: number;
  fixedCost: number;
  totalCost: number;
  balance: number;
  mealsEaten: number;
};

type DeletedMemberGhost = {
  member: Member;
  stats: MemberStatsSnapshot;
  index: number;
  expiresAt: number;
};

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

function MemberCard({
  member,
  stats,
  deletingMemberId,
  onDeposit,
  onDelete,
}: {
  member: Member;
  stats: MemberStatsSnapshot;
  deletingMemberId?: string | null;
  onDeposit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start justify-between border-b bg-secondary/20 p-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">{member.avatar}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold">{member.name}</p>
            </div>
          </div>
          {onDelete ? (
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
                    This will remove {member.name} and also delete their meal logs and deposits.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} disabled={deletingMemberId === member.id}>
                    {deletingMemberId === member.id ? 'Deleting...' : 'Yes, Delete Member'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>

        <div className="space-y-3 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Deposit</span>
            <span className="font-bold">৳{member.deposit.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Meals Eaten</span>
            <span className="font-medium">{formatMealCount(member.mealsEaten)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Meal Cost</span>
            <span className="font-medium">৳{stats.mealCost.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Fixed Share</span>
            <span className="font-medium">৳{stats.fixedCost.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <span className="font-medium">Net Balance</span>
            <span className={`text-lg font-bold ${stats.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {stats.balance >= 0 ? '+' : '-'}{Math.round(Math.abs(stats.balance))}
            </span>
          </div>

          <Button
            variant="outline"
            className="mt-2 w-full gap-2"
            onClick={onDeposit}
            disabled={!onDeposit}
          >
            <Wallet className="h-4 w-4" />
            Manage Deposit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Members() {
  const { members, removeMember, restoreMember, getMemberStats } = useMeal();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [depositMemberId, setDepositMemberId] = useState<string | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [deletedMembers, setDeletedMembers] = useState<DeletedMemberGhost[]>([]);

  const handleRemoveMember = async (memberId: string) => {
    if (deletingMemberId) return;
    const memberIndex = members.findIndex((entry) => entry.id === memberId);
    const member = members[memberIndex];
    if (!member) return;

    const stats = getMemberStats(memberId);
    setDeletingMemberId(memberId);

    try {
      await removeMember(memberId);
      setDeletedMembers((prev) => [
        ...prev.filter((entry) => entry.member.id !== memberId),
        {
          member,
          stats,
          index: Math.max(0, memberIndex),
          expiresAt: Date.now() + DELETE_GRACE_MS,
        },
      ]);
    } finally {
      setDeletingMemberId(null);
    }
  };

  const handleUndoMember = async (memberId: string) => {
    setDeletedMembers((prev) => prev.filter((entry) => entry.member.id !== memberId));
    await restoreMember(memberId);
  };

  const memberCards = useMemo(() => {
    const cards: Array<
      | { type: 'member'; member: Member; index: number }
      | { type: 'deleted'; ghost: DeletedMemberGhost }
    > = members.map((member, index) => ({ type: 'member', member, index }));

    for (const ghost of [...deletedMembers].sort((a, b) => a.index - b.index)) {
      cards.splice(Math.min(ghost.index, cards.length), 0, { type: 'deleted', ghost });
    }

    return cards;
  }, [deletedMembers, members]);

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

      {members.length === 0 ? (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-8 text-center bg-card/50 backdrop-blur-sm min-h-[350px] animate-in fade-in-50 duration-300">
          <div className="rounded-full bg-gradient-to-br from-primary/10 to-primary/5 p-4 mb-4 ring-8 ring-primary/5 text-primary">
            <Users className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <h3 className="font-heading text-lg font-bold text-foreground">No members in this cycle</h3>
          <p className="text-muted-foreground text-sm max-w-sm mt-2 mb-6 leading-relaxed">
            Add roommates, family members, or mess colleagues to start tracking their meals, deposits, and shared expenses.
          </p>
          <Button 
            className="gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-transform bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Your First Member
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {memberCards.map((item) => {
            if (item.type === 'deleted') {
              const { ghost } = item;
              return (
                <UndoDeleteGhost
                  key={`deleted-${ghost.member.id}`}
                  message={`Member '${ghost.member.name}' deleted.`}
                  expiresAt={ghost.expiresAt}
                  onUndo={() => void handleUndoMember(ghost.member.id)}
                  onExpired={() => setDeletedMembers((prev) => prev.filter((entry) => entry.member.id !== ghost.member.id))}
                  className="min-h-full"
                >
                  <MemberCard member={ghost.member} stats={ghost.stats} />
                </UndoDeleteGhost>
              );
            }

            const stats = getMemberStats(item.member.id);
            return (
              <MemberCard
                key={item.member.id}
                member={item.member}
                stats={stats}
                deletingMemberId={deletingMemberId}
                onDeposit={() => setDepositMemberId(item.member.id)}
                onDelete={() => handleRemoveMember(item.member.id)}
              />
            );
          })}
        </div>
      )}

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
