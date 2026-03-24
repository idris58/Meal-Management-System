import type { Express } from "express";
import { type Server } from "http";

import { assertSupabaseAdmin } from "./supabase-admin";

type MemberRow = {
  id: string;
  name: string;
  deposit: number | string;
  is_active: boolean;
  avatar: string | null;
};

type ExpenseRow = {
  id: string;
  amount: number | string;
  description: string;
  type: "meal" | "fixed";
  date: string;
  paid_by: string;
};

type MealLogRow = {
  id: string;
  date: string;
  member_id: string;
  count: number | string;
};

function buildSharedPayload(
  membersData: MemberRow[],
  expensesData: ExpenseRow[],
  mealLogsData: MealLogRow[],
) {
  const members = membersData.map((member) => ({
    id: member.id,
    name: member.name,
    deposit: Number(member.deposit),
    isActive: member.is_active,
    avatar: member.avatar || member.name.substring(0, 2).toUpperCase(),
  }));

  const expenses = expensesData.map((expense) => ({
    id: expense.id,
    amount: Number(expense.amount),
    description: expense.description,
    type: expense.type,
    date: expense.date,
    paidBy: expense.paid_by,
  }));

  const mealLogs = mealLogsData.map((log) => ({
    id: log.id,
    date: log.date,
    memberId: log.member_id,
    count: Number(log.count),
  }));

  const totalDeposits = members.reduce((sum, member) => sum + member.deposit, 0);
  const totalMealExpenses = expenses
    .filter((expense) => expense.type === "meal")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const totalFixedExpenses = expenses
    .filter((expense) => expense.type === "fixed")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const totalMealsConsumed = mealLogs.reduce((sum, log) => sum + log.count, 0);
  const activeMembersCount = members.filter((member) => member.isActive).length;
  const currentMealRate =
    totalMealsConsumed > 0 ? totalMealExpenses / totalMealsConsumed : 0;
  const fixedCostPerMember =
    activeMembersCount > 0 ? totalFixedExpenses / activeMembersCount : 0;
  const remainingCash =
    totalDeposits - (totalMealExpenses + totalFixedExpenses);

  const memberSummaries = members.map((member) => {
    const mealsEaten = mealLogs
      .filter((log) => log.memberId === member.id)
      .reduce((sum, log) => sum + log.count, 0);
    const mealCost = mealsEaten * currentMealRate;
    const fixedCost = member.isActive ? fixedCostPerMember : 0;
    const totalCost = mealCost + fixedCost;
    const balance = member.deposit - totalCost;

    return {
      ...member,
      mealsEaten,
      mealCost,
      fixedCost,
      totalCost,
      balance,
    };
  });

  return {
    stats: {
      totalDeposits,
      totalMealExpenses,
      totalFixedExpenses,
      totalMealsConsumed,
      currentMealRate,
      fixedCostPerMember,
      remainingCash,
    },
    members: memberSummaries,
    expenses,
    mealLogs,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/share/:token", async (req, res) => {
    const token = String(req.params.token || "").trim();

    if (!token) {
      return res.status(400).json({ message: "Missing share token." });
    }

    const supabaseAdmin = assertSupabaseAdmin();

    const { data: shareLink, error: shareLinkError } = await supabaseAdmin
      .from("share_links")
      .select("user_id, is_enabled")
      .eq("token", token)
      .maybeSingle();

    if (shareLinkError) {
      throw shareLinkError;
    }

    if (!shareLink || !shareLink.is_enabled) {
      return res.status(404).json({ message: "Shared view not found." });
    }

    const [membersResult, expensesResult, mealLogsResult] = await Promise.all([
      supabaseAdmin
        .from("members")
        .select("id, name, deposit, is_active, avatar")
        .eq("user_id", shareLink.user_id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("expenses")
        .select("id, amount, description, type, date, paid_by")
        .eq("user_id", shareLink.user_id)
        .order("date", { ascending: false }),
      supabaseAdmin
        .from("meal_logs")
        .select("id, date, member_id, count")
        .eq("user_id", shareLink.user_id)
        .order("date", { ascending: false }),
    ]);

    if (membersResult.error) {
      throw membersResult.error;
    }

    if (expensesResult.error) {
      throw expensesResult.error;
    }

    if (mealLogsResult.error) {
      throw mealLogsResult.error;
    }

    return res.json(
      buildSharedPayload(
        membersResult.data || [],
        expensesResult.data || [],
        mealLogsResult.data || [],
      ),
    );
  });

  return httpServer;
}
