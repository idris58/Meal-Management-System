// client/src/lib/meal-context.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';

export type Role = 'admin' | 'viewer';

export interface Member {
  id: string;
  name: string;
  role: Role;
  deposit: number;
  mealsEaten: number;
  isActive: boolean;
  avatar?: string;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  type: 'meal' | 'fixed';
  date: string;
  paidBy: string;
}

export interface MealLog {
  id: string;
  date: string;
  memberId: string;
  count: number;
}

export interface ArchiveCycle {
  id: string;
  endDate: string;
  stats: {
    totalDeposits: number;
    totalMealExpenses: number;
    totalFixedExpenses: number;
    totalMealsConsumed: number;
    currentMealRate: number;
    fixedCostPerMember: number;
    remainingCash: number;
  };
  members: (Member & { mealCost: number, fixedCost: number, totalCost: number, balance: number })[];
}

interface MealContextType {
  members: Member[];
  expenses: Expense[];
  mealLogs: MealLog[];
  archives: ArchiveCycle[];
  currentUser: Member | null;
  loading: boolean;
  setCurrentUser: (member: Member) => void;
  addMember: (name: string, role: Role) => Promise<void>;
  updateMember: (id: string, updates: Partial<Member>) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  addExpense: (amount: number, description: string, type: 'meal' | 'fixed', paidBy: string) => Promise<void>;
  addDeposit: (memberId: string, amount: number) => Promise<void>;
  logMeal: (memberId: string, count: number, date: string) => Promise<void>;
  resetCycle: () => Promise<void>;
  deleteArchive: (id: string) => Promise<void>;
  stats: ArchiveCycle['stats'];
  getMemberStats: (memberId: string) => {
    mealCost: number;
    fixedCost: number;
    totalCost: number;
    balance: number;
    mealsEaten: number;
  };
}

const MealContext = createContext<MealContextType | undefined>(undefined);

export function MealProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [archives, setArchives] = useState<ArchiveCycle[]>([]);
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data from Supabase on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load members
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: true });

      if (membersError) throw membersError;

      // Load expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (expensesError) throw expensesError;

      // Load meal logs
      const { data: mealLogsData, error: mealLogsError } = await supabase
        .from('meal_logs')
        .select('*')
        .order('date', { ascending: false });

      if (mealLogsError) throw mealLogsError;

      // Load archives
      const { data: archivesData, error: archivesError } = await supabase
        .from('archives')
        .select('*')
        .order('created_at', { ascending: false });

      if (archivesError) throw archivesError;

      // Transform data to match frontend types
      const transformedMembers: Member[] = (membersData || []).map(m => ({
        id: m.id,
        name: m.name,
        role: m.role as Role,
        deposit: parseFloat(m.deposit.toString()),
        mealsEaten: 0, // Will be calculated
        isActive: m.is_active,
        avatar: m.avatar || m.name.substring(0, 2).toUpperCase(),
      }));

      const transformedExpenses: Expense[] = (expensesData || []).map(e => ({
        id: e.id,
        amount: parseFloat(e.amount.toString()),
        description: e.description,
        type: e.type as 'meal' | 'fixed',
        date: e.date,
        paidBy: e.paid_by,
      }));

      const transformedMealLogs: MealLog[] = (mealLogsData || []).map(ml => ({
        id: ml.id,
        memberId: ml.member_id,
        date: ml.date,
        count: parseFloat(ml.count.toString()),
      }));

      const transformedArchives: ArchiveCycle[] = (archivesData || []).map(a => ({
        id: a.id,
        endDate: a.end_date,
        stats: a.stats,
        members: a.members,
      }));

      setMembers(transformedMembers);
      setExpenses(transformedExpenses);
      setMealLogs(transformedMealLogs);
      setArchives(transformedArchives);

      // Set first admin as current user if none set
      if (!currentUser && transformedMembers.length > 0) {
        const admin = transformedMembers.find(m => m.role === 'admin') || transformedMembers[0];
        setCurrentUser(admin);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (name: string, role: Role) => {
    const avatar = name.substring(0, 2).toUpperCase();
    const { data, error } = await supabase
      .from('members')
      .insert([{ name, role, avatar, deposit: 0, is_active: true }])
      .select()
      .single();

    if (error) {
      console.error('Error adding member:', error);
      return;
    }

    const newMember: Member = {
      id: data.id,
      name: data.name,
      role: data.role as Role,
      deposit: parseFloat(data.deposit.toString()),
      mealsEaten: 0,
      isActive: data.is_active,
      avatar: data.avatar || avatar,
    };

    setMembers([...members, newMember]);
  };

  const updateMember = async (id: string, updates: Partial<Member>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.deposit !== undefined) dbUpdates.deposit = updates.deposit;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;

    const { error } = await supabase
      .from('members')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating member:', error);
      return;
    }

    setMembers(members.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const removeMember = async (id: string) => {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error removing member:', error);
      return;
    }

    setMembers(members.filter(m => m.id !== id));
    setMealLogs(mealLogs.filter(log => log.memberId !== id));
  };

  const addExpense = async (amount: number, description: string, type: 'meal' | 'fixed', paidBy: string) => {
    const { data, error } = await supabase
      .from('expenses')
      .insert([{ amount, description, type, paid_by: paidBy, date: new Date().toISOString() }])
      .select()
      .single();

    if (error) {
      console.error('Error adding expense:', error);
      return;
    }

    const newExpense: Expense = {
      id: data.id,
      amount: parseFloat(data.amount.toString()),
      description: data.description,
      type: data.type as 'meal' | 'fixed',
      date: data.date,
      paidBy: data.paid_by,
    };

    setExpenses([newExpense, ...expenses]);
  };

  const addDeposit = async (memberId: string, amount: number) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const newDeposit = member.deposit + amount;
    await updateMember(memberId, { deposit: newDeposit });
  };

  const logMeal = async (memberId: string, count: number, dateStr: string) => {
    const existingLog = mealLogs.find(l => l.memberId === memberId && l.date === dateStr);

    if (existingLog) {
      if (count === 0) {
        // Delete the log
        const { error } = await supabase
          .from('meal_logs')
          .delete()
          .eq('id', existingLog.id);

        if (error) {
          console.error('Error deleting meal log:', error);
          return;
        }

        setMealLogs(mealLogs.filter(l => l.id !== existingLog.id));
      } else {
        // Update the log
        const { error } = await supabase
          .from('meal_logs')
          .update({ count })
          .eq('id', existingLog.id);

        if (error) {
          console.error('Error updating meal log:', error);
          return;
        }

        setMealLogs(mealLogs.map(l => l.id === existingLog.id ? { ...l, count } : l));
      }
    } else if (count > 0) {
      // Create new log
      const { data, error } = await supabase
        .from('meal_logs')
        .insert([{ member_id: memberId, date: dateStr, count }])
        .select()
        .single();

      if (error) {
        console.error('Error creating meal log:', error);
        return;
      }

      const newLog: MealLog = {
        id: data.id,
        memberId: data.member_id,
        date: data.date,
        count: parseFloat(data.count.toString()),
      };

      setMealLogs([...mealLogs, newLog]);
    }
  };

  const resetCycle = async () => {
    const archivedMembers = members.map(m => {
      const mStats = getMemberStats(m.id);
      return { ...m, ...mStats };
    });

    const newArchive: ArchiveCycle = {
      id: crypto.randomUUID(),
      endDate: new Date().toISOString(),
      stats: { ...stats },
      members: archivedMembers
    };

    // Save archive
    const { error: archiveError } = await supabase
      .from('archives')
      .insert([{
        end_date: newArchive.endDate,
        stats: newArchive.stats,
        members: newArchive.members,
      }]);

    if (archiveError) {
      console.error('Error creating archive:', archiveError);
      return;
    }

    // Clear expenses
    const { error: expensesError } = await supabase
      .from('expenses')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (expensesError) {
      console.error('Error clearing expenses:', expensesError);
    }

    // Clear meal logs
    const { error: logsError } = await supabase
      .from('meal_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (logsError) {
      console.error('Error clearing meal logs:', logsError);
    }

    // Reset member deposits
    for (const member of members) {
      await updateMember(member.id, { deposit: 0 });
    }

    // Reload data
    await loadData();
  };

  const deleteArchive = async (id: string) => {
    const { error } = await supabase
      .from('archives')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting archive:', error);
      return;
    }

    setArchives(archives.filter(a => a.id !== id));
  };

  // Calculate stats
  const totalDeposits = members.reduce((sum, m) => sum + m.deposit, 0);
  const totalMealExpenses = expenses.filter(e => e.type === 'meal').reduce((sum, e) => sum + e.amount, 0);
  const totalFixedExpenses = expenses.filter(e => e.type === 'fixed').reduce((sum, e) => sum + e.amount, 0);
  const totalMealsConsumed = mealLogs.reduce((sum, log) => sum + log.count, 0);
  const activeMembersCount = members.filter(m => m.isActive).length;
  const currentMealRate = totalMealsConsumed > 0 ? totalMealExpenses / totalMealsConsumed : 0;
  const fixedCostPerMember = activeMembersCount > 0 ? totalFixedExpenses / activeMembersCount : 0;
  const remainingCash = totalDeposits - (totalMealExpenses + totalFixedExpenses);

  const stats = { totalDeposits, totalMealExpenses, totalFixedExpenses, totalMealsConsumed, currentMealRate, fixedCostPerMember, remainingCash };

  const getMemberStats = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return { mealCost: 0, fixedCost: 0, totalCost: 0, balance: 0, mealsEaten: 0 };
    const memberMeals = mealLogs.filter(log => log.memberId === memberId).reduce((sum, log) => sum + log.count, 0);
    const mealCost = memberMeals * currentMealRate;
    const fixedCost = member.isActive ? fixedCostPerMember : 0;
    const totalCost = mealCost + fixedCost;
    const balance = member.deposit - totalCost;
    return { mealCost, fixedCost, totalCost, balance, mealsEaten: memberMeals };
  };

  return (
    <MealContext.Provider value={{
      members: members.map(m => ({ ...m, mealsEaten: mealLogs.filter(l => l.memberId === m.id).reduce((s, l) => s + l.count, 0) })),
      expenses,
      mealLogs,
      archives,
      currentUser,
      loading,
      setCurrentUser,
      addMember,
      updateMember,
      removeMember,
      addExpense,
      addDeposit,
      logMeal,
      resetCycle,
      deleteArchive,
      stats,
      getMemberStats
    }}>
      {children}
    </MealContext.Provider>
  );
}

export function useMeal() {
  const context = useContext(MealContext);
  if (context === undefined) throw new Error('useMeal must be used within a MealProvider');
  return context;
}