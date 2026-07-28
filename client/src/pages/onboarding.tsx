import { useEffect, useState } from "react";
import { ChefHat, LoaderCircle, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

type Action = "create" | "join" | "migrate" | null;

export default function OnboardingPage() {
  const [messName, setMessName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
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

  const complete = async (nextAction: Exclude<Action, null>) => {
    if (action) return;
    const name = messName.trim();
    const code = inviteCode.replace(/[^a-z0-9]/gi, "").toUpperCase();
    if (nextAction !== "join" && !name) { setError("Enter a mess name."); return; }
    if (nextAction === "join" && code.length !== 6) { setError("Enter the 6-character mess code."); return; }
    setAction(nextAction); setError(null);
    const result = nextAction === "join"
      ? await supabase.rpc("join_mess", { invite_code_input: code })
      : await supabase.rpc(nextAction === "migrate" ? "migrate_legacy_data" : "create_mess", { mess_name: name });
    if (result.error) { setError(result.error.message); setAction(null); return; }
    window.location.assign("/app");
  };

  return <div className="min-h-screen bg-background px-4 py-10"><div className="mx-auto max-w-3xl space-y-6">
    <div className="text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><ChefHat className="h-7 w-7" /></div><h1 className="font-heading text-3xl font-bold">Set up your mess</h1><p className="mt-2 text-muted-foreground">Create a shared workspace or join one with an invite code.</p></div>
    {hasLegacyData ? <Card className="border-primary/40 bg-primary/5"><CardHeader><CardTitle>Bring your existing MealTrack data</CardTitle><CardDescription>Your previous members, cycles, meals, expenses, deposits, and history can be moved into a new mess.</CardDescription></CardHeader><CardContent className="space-y-3"><Label htmlFor="migration-mess-name">New mess name</Label><Input id="migration-mess-name" placeholder="e.g. Green House Mess" value={messName} onChange={(event) => setMessName(event.target.value)} /><Button className="w-full" disabled={Boolean(action)} onClick={() => void complete("migrate")}>{action === "migrate" ? <><LoaderCircle className="h-4 w-4 animate-spin" />Migrating...</> : "Migrate my existing data"}</Button><p className="text-xs text-muted-foreground">Joining a different mess leaves this legacy data unchanged.</p></CardContent></Card> : null}
    <div className="grid gap-6 md:grid-cols-2"><Card><CardHeader><CardTitle>Create a mess</CardTitle><CardDescription>You will become its manager.</CardDescription></CardHeader><CardContent className="space-y-3"><Label htmlFor="mess-name">Mess name</Label><Input id="mess-name" placeholder="e.g. Green House Mess" value={messName} onChange={(event) => setMessName(event.target.value)} /><Button className="w-full" disabled={Boolean(action)} onClick={() => void complete("create")}>{action === "create" ? <><LoaderCircle className="h-4 w-4 animate-spin" />Creating...</> : "Create mess"}</Button></CardContent></Card>
    <Card><CardHeader><CardTitle>Join a mess</CardTitle><CardDescription>Ask your manager for the 6-character code.</CardDescription></CardHeader><CardContent className="space-y-3"><Label htmlFor="mess-code">Mess code</Label><Input id="mess-code" maxLength={6} placeholder="ABC123" value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} className="font-mono uppercase tracking-[0.2em]" /><Button variant="outline" className="w-full" disabled={Boolean(action)} onClick={() => void complete("join")}>{action === "join" ? <><LoaderCircle className="h-4 w-4 animate-spin" />Joining...</> : <><UsersRound className="h-4 w-4" />Join mess</>}</Button></CardContent></Card></div>
    {checkingLegacy ? <p className="text-center text-sm text-muted-foreground">Checking your existing data...</p> : null}{error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
  </div></div>;
}
