import { useMeal } from '@/lib/meal-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';

const memberSchema = z.object({
  name: z.string().min(2, "Name is required"),
  role: z.enum(["admin", "viewer"]),
});

function AddMemberForm({ onClose }: { onClose: () => void }) {
  const { addMember } = useMeal();
  const form = useForm<z.infer<typeof memberSchema>>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: "",
      role: "viewer",
    },
  });

  const onSubmit = (data: z.infer<typeof memberSchema>) => {
    addMember(data.name, data.role as "admin" | "viewer");
    onClose();
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
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">Manager (Admin)</SelectItem>
                  <SelectItem value="viewer">Member (Viewer)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">Create Member</Button>
      </form>
    </Form>
  );
}

function DepositForm({ memberId, onClose }: { memberId: string, onClose: () => void }) {
  const { addDeposit } = useMeal();
  const [amount, setAmount] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!isNaN(val) && val > 0) {
      addDeposit(memberId, val);
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
       <div className="space-y-2">
        <label className="text-sm font-medium">Deposit Amount</label>
        <Input 
          type="number" 
          placeholder="0.00" 
          value={amount} 
          onChange={(e) => setAmount(e.target.value)} 
          autoFocus
        />
      </div>
      <Button type="submit" className="w-full">Add Deposit</Button>
    </form>
  );
}

export default function Members() {
  const { members, currentUser, removeMember, getMemberStats } = useMeal();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [depositMemberId, setDepositMemberId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-heading">Members</h1>
        {isAdmin && (
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
        )}
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
                      <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                    </div>
                  </div>
                  {isAdmin && member.id !== currentUser?.id && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeMember(member.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="p-4 space-y-3 text-sm">
                   <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Deposit</span>
                    <span className="font-bold">৳{member.deposit.toFixed(0)}</span>
                  </div>
                   <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Meals Eaten</span>
                    <span className="font-medium">{member.mealsEaten}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Meal Cost</span>
                    <span className="font-medium">৳{stats.mealCost.toFixed(0)}</span>
                  </div>
                   <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Fixed Share</span>
                    <span className="font-medium">৳{stats.fixedCost.toFixed(0)}</span>
                  </div>
                  <div className="pt-3 border-t flex justify-between items-center">
                    <span className="font-medium">Net Balance</span>
                    <span className={`font-bold text-lg ${stats.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stats.balance >= 0 ? '+' : '-'}{Math.abs(stats.balance).toFixed(2)}
                    </span>
                  </div>

                  {isAdmin && (
                    <Button variant="outline" className="w-full mt-2 gap-2" onClick={() => setDepositMemberId(member.id)}>
                      <Wallet className="h-4 w-4" />
                      Add Deposit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!depositMemberId} onOpenChange={(open) => !open && setDepositMemberId(null)}>
        <DialogContent>
           <DialogHeader>
            <DialogTitle>Add Deposit</DialogTitle>
          </DialogHeader>
          {depositMemberId && (
            <DepositForm memberId={depositMemberId} onClose={() => setDepositMemberId(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
