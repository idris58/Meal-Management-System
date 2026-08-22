import { useEffect, useState } from "react";
import { ArrowRight, ChefHat, Link2, LoaderCircle, ShieldCheck, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

type Action = "create" | "migrate" | null;

export default function OnboardingPage() {
  const [messName, setMessName] = useState("");
  const [hasLegacyData, setHasLegacyData] = useState(false);
  const [checkingLegacy, setCheckingLegacy] = useState(true);
  const [action, setAction] = useState<Action>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.rpc("has_legacy_data").then(({ data, error: rpcError }) => {
      if (!active) return;
      if (rpcError) console.error("Could not check legacy data:", rpcError);
      setHasLegacyData(Boolean(data));
      setCheckingLegacy(false);
    });
    return () => { active = false; };
  }, []);

  const createMess = async (nextAction: Exclude<Action, null>) => {
    if (action) return;
    const name = messName.trim();
    if (!name) { setError("Enter a name for your mess."); return; }
    setAction(nextAction); setError(null);
    const result = await supabase.rpc(nextAction === "migrate" ? "migrate_legacy_data" : "create_mess", { mess_name: name });
    if (result.error) { setError(result.error.message); setAction(null); return; }
    window.location.assign("/app");
  };

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),transparent_36rem)] px-4 py-8 sm:px-6 sm:py-12"><div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
    <header className="mx-auto max-w-2xl text-center"><div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"><ChefHat className="h-7 w-7" /></div><h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Welcome to MealTrack</h1><p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Create a shared mess for your household, or join one securely with an invitation from its manager.</p></header>

    {hasLegacyData ? <Card className="border-primary/35 bg-primary/5 shadow-sm"><CardHeader><CardTitle className="text-lg">Bring your existing MealTrack data</CardTitle><CardDescription>Your previous members, cycles, meals, expenses, deposits, and history will move into a new mess.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="migration-mess-name">New mess name</Label><Input id="migration-mess-name" placeholder="e.g. Green House Mess" value={messName} onChange={(event) => setMessName(event.target.value)} disabled={Boolean(action)} /></div><Button className="w-full sm:w-auto" disabled={Boolean(action)} onClick={() => void createMess("migrate")}>{action === "migrate" ? <><LoaderCircle className="h-4 w-4 animate-spin" />Migrating...</> : "Migrate existing data"}</Button><p className="text-xs text-muted-foreground">Only migrate data you own. To enter someone else’s mess, use their invite link.</p></CardContent></Card> : null}

    <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] md:gap-6"><Card className="border-primary/35 shadow-lg shadow-primary/5"><CardHeader><div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><ChefHat className="h-5 w-5" /></div><CardTitle>Create a mess</CardTitle><CardDescription>Start a shared space for meals, expenses, and member balances. You’ll become its manager.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="mess-name">Mess name</Label><Input id="mess-name" placeholder="e.g. Green House Mess" value={messName} onChange={(event) => setMessName(event.target.value)} disabled={Boolean(action)} onKeyDown={(event) => { if (event.key === "Enter") void createMess("create"); }} /></div><Button className="w-full sm:w-auto" disabled={Boolean(action)} onClick={() => void createMess("create")}>{action === "create" ? <><LoaderCircle className="h-4 w-4 animate-spin" />Creating...</> : <><span>Create mess</span><ArrowRight className="h-4 w-4" /></>}</Button></CardContent></Card>

      <Card className="bg-card/80"><CardHeader><div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground"><UsersRound className="h-5 w-5" /></div><CardTitle>Have an invite link?</CardTitle><CardDescription>Your manager controls access with secure, one-time invite links.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-xl border bg-muted/35 p-4 text-sm text-muted-foreground"><div className="flex gap-2"><Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p>Open the link your manager sent you. You can sign in or create an account directly from the invitation.</p></div></div><div className="flex gap-2 text-sm"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" /><p className="text-muted-foreground">Don’t have a link? Ask your manager to send you a new invite link.</p></div></CardContent></Card>
    </div>

    {checkingLegacy ? <p className="text-center text-sm text-muted-foreground">Checking for existing MealTrack data...</p> : null}
    {error ? <p className="mx-auto max-w-2xl rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
  </div></main>;
}
