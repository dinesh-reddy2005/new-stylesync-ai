import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard, GoogleIcon } from "@/components/auth-card";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined,
  }),
});

function SignupPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { next } = Route.useSearch();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && session) {
      if (next) window.location.replace(next);
      else navigate({ to: "/dashboard", replace: true });
    }
  }, [session, authLoading, navigate, next]);

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${next ?? "/dashboard"}`,
        data: { display_name: displayName },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      if (next) window.location.replace(next);
      else navigate({ to: "/dashboard", replace: true });
    } else {
      setInfo("Check your email to confirm your account.");
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + (next ?? "/dashboard"),
    });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Create your account" subtitle="Start styling with AI in seconds.">
      <Button onClick={handleGoogle} disabled={loading} variant="outline" className="w-full glass border-white/10 hover:bg-white/5">
        <GoogleIcon className="mr-1" /> Continue with Google
      </Button>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-white/10" /> or <div className="h-px flex-1 bg-white/10" />
      </div>
      <form onSubmit={handleEmail} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex Rivera" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {info && <p className="text-sm text-muted-foreground">{info}</p>}
        <Button type="submit" disabled={loading} className="w-full btn-glow bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:opacity-90">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="text-foreground underline-offset-4 hover:underline">Sign in</Link>
      </p>
    </AuthCard>
  );
}