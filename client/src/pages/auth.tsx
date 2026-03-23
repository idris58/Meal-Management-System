import { useState } from "react";
import { ChefHat, Chrome, LoaderCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleEmailAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!data.session) {
        setMessage("Account created. Check your email to confirm your account.");
      } else {
        setMessage("Account created. You are now signed in.");
      }
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : "Authentication failed. Try again.";
      setError(nextError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError(null);
    setMessage(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (oauthError) {
      setGoogleLoading(false);
      setError(oauthError.message);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dff6eb_0%,#f8fafc_40%,#eef3f7_100%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-4 py-10 lg:flex-row lg:items-center lg:px-8">
        <section className="max-w-xl space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-sm text-emerald-700 shadow-sm backdrop-blur">
            <ChefHat className="h-4 w-4" />
            Shared meal operations, one secure workspace
          </div>

          <div className="space-y-4">
            <h1 className="font-heading text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
              Meal management with account-based access.
            </h1>
            <p className="max-w-lg text-base leading-7 text-slate-600 md:text-lg">
              Sign in with email and password, create a new account, or continue
              with Google. After logout, the app returns to the login screen.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
              <p className="text-sm font-semibold text-slate-900">Email login</p>
              <p className="mt-1 text-sm text-slate-600">
                Standard email and password access.
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
              <p className="text-sm font-semibold text-slate-900">Signup page</p>
              <p className="mt-1 text-sm text-slate-600">
                New users can register directly in the app.
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
              <p className="text-sm font-semibold text-slate-900">Google OAuth</p>
              <p className="mt-1 text-sm text-slate-600">
                One-click sign-in for supported accounts.
              </p>
            </div>
          </div>
        </section>

        <Card className="w-full max-w-md border-white/80 bg-white/90 shadow-2xl backdrop-blur">
          <CardHeader className="space-y-5 pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-200">
                <ChefHat className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">
                  MealManager
                </p>
                <CardTitle className="mt-1 text-2xl text-slate-900">
                  {mode === "login" ? "Welcome back" : "Create your account"}
                </CardTitle>
              </div>
            </div>

            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === "login"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setMessage(null);
                }}
              >
                Login
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === "signup"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setMessage(null);
                }}
              >
                Sign up
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <form className="space-y-4" onSubmit={handleEmailAuth}>
              <div className="space-y-2">
                <Label htmlFor="auth-email">Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-password">Password</Label>
                <Input
                  id="auth-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              {message ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {message}
                </p>
              ) : null}

              <Button className="w-full" type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : mode === "login" ? (
                  "Login with Email"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-[0.2em] text-slate-500">
                <span className="bg-white px-2">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleAuth}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <Chrome className="h-4 w-4" />
                  Google
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
