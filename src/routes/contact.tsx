import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Send, CheckCircle, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const message = formData.message.trim();

    if (!name || !email || !message) {
      setError("Please fill in name, email, and message.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }
      setFormData({ name: "", email: "", phone: "", message: "" });
      setSubmitted(true);
      toast.success("Message sent!", {
        description: "Thanks — we'll get back to you within 24 hours.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send message.";
      setError(msg);
      toast.error("Failed to send", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-fuchsia-400" /> Get in touch
        </div>
        <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
          Let's <span className="text-gradient">connect</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground md:text-base">
          Have a question, partnership idea, or just want to say hi? We'd love to hear from you.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-5 lg:gap-12">
        {/* Info Cards */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="glass border-white/10">
            <CardContent className="flex items-start gap-4 p-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-blue-500/20 border border-white/10">
                <Mail className="h-5 w-5 text-fuchsia-300" />
              </div>
              <div>
                <div className="text-sm font-medium">Email</div>
                <div className="mt-1 text-sm text-muted-foreground">hello@stylesync.ai</div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-white/10">
            <CardContent className="flex items-start gap-4 p-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-blue-500/20 border border-white/10">
                <Phone className="h-5 w-5 text-fuchsia-300" />
              </div>
              <div>
                <div className="text-sm font-medium">Phone</div>
                <div className="mt-1 text-sm text-muted-foreground">+1 (555) 019-2834</div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-white/10">
            <CardContent className="flex items-start gap-4 p-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-blue-500/20 border border-white/10">
                <MapPin className="h-5 w-5 text-fuchsia-300" />
              </div>
              <div>
                <div className="text-sm font-medium">Office</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  123 AI Boulevard, Suite 404<br />
                  San Francisco, CA 94105
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form */}
        <Card className="glass-strong neon-border lg:col-span-3 border-white/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Send a message</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Fill out the form and we'll get back within 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500/20 to-blue-500/20 border border-white/10">
                  <CheckCircle className="h-8 w-8 text-fuchsia-300" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">Message sent!</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Thanks for reaching out. Our team will review your request and respond shortly.
                </p>
                <Button
                  asChild
                  className="mt-6 btn-glow bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:opacity-90"
                >
                  <Link to="/">
                    Back to home <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Jane Doe"
                    required
                    disabled={submitting}
                    maxLength={200}
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    className="glass border-white/10 bg-white/5 focus-visible:ring-fuchsia-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@example.com"
                    required
                    disabled={submitting}
                    maxLength={320}
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    className="glass border-white/10 bg-white/5 focus-visible:ring-fuchsia-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    disabled={submitting}
                    maxLength={40}
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                    className="glass border-white/10 bg-white/5 focus-visible:ring-fuchsia-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium">Requirement / Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us what you need..."
                    required
                    rows={5}
                    disabled={submitting}
                    maxLength={5000}
                    value={formData.message}
                    onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                    className="glass border-white/10 bg-white/5 focus-visible:ring-fuchsia-500/50 resize-none"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive" role="alert">{error}</p>
                )}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-glow bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:opacity-90"
                >
                  {submitting ? (
                    <>
                      Sending… <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    </>
                  ) : (
                    <>
                      Send Message <Send className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
