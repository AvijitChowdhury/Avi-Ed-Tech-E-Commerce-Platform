import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_public/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/" });
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — you can sign in now.");
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in failed");
    if (!r.redirected && !r.error) navigate({ to: "/" });
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="flex justify-center mb-6">
        <div className="gradient-primary-bg h-14 w-14 rounded-2xl flex items-center justify-center glow-primary">
          <GraduationCap className="h-7 w-7 text-primary-foreground" />
        </div>
      </div>
      <h1 className="font-display text-3xl font-bold text-center mb-2">Welcome to AviEdTech</h1>
      <p className="text-center text-muted-foreground mb-8">Sign in or create an account to continue.</p>
      <div className="card-elevated rounded-2xl p-6">
        <Button onClick={google} variant="outline" className="w-full mb-4">Continue with Google</Button>
        <div className="text-center text-xs text-muted-foreground mb-4">or use email</div>
        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-2 mb-4 w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={onSignIn} className="space-y-3">
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
              <Button disabled={loading} className="w-full gradient-primary-bg text-primary-foreground">{loading ? "..." : "Sign in"}</Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={onSignUp} className="space-y-3">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
              <Button disabled={loading} className="w-full gradient-primary-bg text-primary-foreground">{loading ? "..." : "Create account"}</Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
