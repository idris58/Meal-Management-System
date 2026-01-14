import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Types
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
  type: 'meal' | 'fixed'; // meal = Table A, fixed = Table B
  date: string;
  paidBy: string; // Member ID
}

export interface MealLog {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  memberId: string;
  count: number;
}

interface MealContextType {
  members: Member[];
  expenses: Expense[];
  mealLogs: MealLog[];
  currentUser: Member | null;
  setCurrentUser: (member: Member) => void;
  
  // Actions
  addMember: (name: string, role: Role) => void;
  updateMember: (id: string, updates: Partial<Member>) => void;
  removeMember: (id: string) => void;
  addExpense: (amount: number, description: string, type: 'meal' | 'fixed', paidBy: string) => void;
  addDeposit: (memberId: string, amount: number) => void;
  logMeal: (memberId: string, count: number, date: string) => void;
  resetCycle: () => void;

  // Derived Data (Calculated)
  stats: {
    totalDeposits: number;
    totalMealExpenses: number; // Table A Total
    totalFixedExpenses: number; // Table B Total
    totalMealsConsumed: number;
    currentMealRate: number;
    fixedCostPerMember: number;
    remainingCash: number;
  };
  
  getMemberStats: (memberId: string) => {
    mealCost: number;
    fixedCost: number;
    totalCost: number;
    balance: number; // Positive = Refund (Pabe), Negative = Due (Dibe)
  };
}

const MealContext = createContext<MealContextType | undefined>(undefined);

// Mock Data Initialization
const INITIAL_MEMBERS: Member[] = [
  { id: '1', name: 'Admin User', role: 'admin', deposit: 5000, mealsEaten: 0, isActive: true, avatar: 'AD' },
  { id: '2', name: 'John Doe', role: 'viewer', deposit: 3000, mealsEaten: 0, isActive: true, avatar: 'JD' },
  { id: '3', name: 'Jane Smith', role: 'viewer', deposit: 2000, mealsEaten: 0, isActive: true, avatar: 'JS' },
];

const INITIAL_EXPENSES: Expense[] = [
  { id: '1', amount: 1200, description: 'Weekly Groceries', type: 'meal', date: new Date().toISOString(), paidBy: '1' },
  { id: '2', amount: 500, description: 'Internet Bill', type: 'fixed', date: new Date().toISOString(), paidBy: '1' },
  { id: '3', amount: 150, description: 'Cleaning Supplies', type: 'fixed', date: new Date().toISOString(), paidBy: '1' },
];

export function MealProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [currentUser, setCurrentUser] = useState<Member | null>(INITIAL_MEMBERS[0]);

  // Derived Calculations
  const totalDeposits = members.reduce((sum, m) => sum + m.deposit, 0);
  const totalMealExpenses = expenses.filter(e => e.type === 'meal').reduce((sum, e) => sum + e.amount, 0);
  const totalFixedExpenses = expenses.filter(e => e.type === 'fixed').reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate total meals from logs
  const totalMealsConsumed = mealLogs.reduce((sum, log) => sum + log.count, 0);
  const activeMembersCount = members.filter(m => m.isActive).length;

  // Key Rates
  const currentMealRate = totalMealsConsumed > 0 ? totalMealExpenses / totalMealsConsumed : 0;
  const fixedCostPerMember = activeMembersCount > 0 ? totalFixedExpenses / activeMembersCount : 0;
  const remainingCash = totalDeposits - (totalMealExpenses + totalFixedExpenses);

  const stats = {
    totalDeposits,
    totalMealExpenses,
    totalFixedExpenses,
    totalMealsConsumed,
    currentMealRate,
    fixedCostPerMember,
    remainingCash,
  };

  const getMemberStats = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return { mealCost: 0, fixedCost: 0, totalCost: 0, balance: 0 };

    const memberMeals = mealLogs
      .filter(log => log.memberId === memberId)
      .reduce((sum, log) => sum + log.count, 0);

    const mealCost = memberMeals * currentMealRate;
    const fixedCost = member.isActive ? fixedCostPerMember : 0;
    const totalCost = mealCost + fixedCost;
    const balance = member.deposit - totalCost;

    return { mealCost, fixedCost, totalCost, balance, mealsEaten: memberMeals };
  };

  // Actions
  const addMember = (name: string, role: Role) => {
    const newMember: Member = {
      id: uuidv4(),
      name,
      role,
      deposit: 0,
      mealsEaten: 0,
      isActive: true,
      avatar: name.substring(0, 2).toUpperCase(),
    };
    setMembers([...members, newMember]);
  };

  const updateMember = (id: string, updates: Partial<Member>) => {
    setMembers(members.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const removeMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
    setMealLogs(mealLogs.filter(log => log.memberId !== id));
  };

  const addExpense = (amount: number, description: string, type: 'meal' | 'fixed', paidBy: string) => {
    const newExpense: Expense = {
      id: uuidv4(),
      amount,
      description,
      type,
      date: new Date().toISOString(),
      paidBy,
    };
    setExpenses([...expenses, newExpense]);
  };

  const addDeposit = (memberId: string, amount: number) => {
    setMembers(members.map(m => 
      m.id === memberId ? { ...m, deposit: m.deposit + amount } : m
    ));
  };

  const logMeal = (memberId: string, count: number, date: string) => {
    const shortDate = date.split('T')[0];
    setMealLogs(prev => {
      const existingIdx = prev.findIndex(log => log.memberId === memberId && log.date === shortDate);
      if (existingIdx >= 0) {
        const newLogs = [...prev];
        if (count === 0) {
          newLogs.splice(existingIdx, 1);
        } else {
          newLogs[existingIdx] = { ...newLogs[existingIdx], count };
        }
        return newLogs;
      }
      if (count === 0) return prev;
      return [...prev, { id: uuidv4(), memberId, count, date: shortDate }];
    });
  };

  const resetCycle = () => {
    setMembers(members.map(m => ({ ...m, deposit: 0, mealsEaten: 0 })));
    setExpenses([]);
    setMealLogs([]);
  };

  return (
    <MealContext.Provider value={{
      members: members.map(m => ({ ...m, mealsEaten: mealLogs.filter(l => l.memberId === m.id).reduce((s, l) => s + l.count, 0) })),
      expenses,
      mealLogs,
      currentUser,
      setCurrentUser,
      addMember,
      updateMember,
      removeMember,
      addExpense,
      addDeposit,
      logMeal,
      resetCycle,
      stats,
      getMemberStats
    }}>
      {children}
    </MealContext.Provider>
  );
}

export function useMeal() {
  const context = useContext(MealContext);
  if (context === undefined) {
    throw new Error('useMeal must be used within a MealProvider');
  }
  return context;
}
