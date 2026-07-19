import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Send, CheckCircle, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { submitContact } from "@/lib/contact.functions";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact StyleSync AI — Get in Touch" },
      { name: "description", content: "Questions, partnerships, or feedback? Contact the StyleSync AI team — we respond within 24 hours." },
      { property: "og:title", content: "Contact StyleSync AI — Get in Touch" },
      { property: "og:description", content: "Reach the StyleSync AI team for questions, partnerships, or feedback." },
      { property: "og:url", content: "https://new-stylesync-ai.lovable.app/contact" },
      { name: "twitter:title", content: "Contact StyleSync AI — Get in Touch" },
      { name: "twitter:description", content: "Reach the StyleSync AI team for questions, partnerships, or feedback." },
    ],
    links: [{ rel: "canonical", href: "https://new-stylesync-ai.lovable.app/contact" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: "StyleSync AI",
        url: "https://new-stylesync-ai.lovable.app/contact",
        email: "hello@stylesync.ai",
        telephone: "+1-555-019-2834",
        address: {
          "@type": "PostalAddress",
          streetAddress: "123 AI Boulevard, Suite 404",
          addressLocality: "San Francisco",
          addressRegion: "CA",
          postalCode: "94105",
          addressCountry: "US",
        },
      }),
    }],
  }),
});

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().regex(/^\d{10}$/, "Phone must be exactly 10 digits"),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

type FieldErrors = Partial<Record<"name" | "email" | "phone" | "message", string>>;

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const submit = useServerFn(submitContact);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = formSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await submit({ data: parsed.data });
      toast.success("Thanks! We'll get back to you within 24 hours.");
      setFormData({ name: "", email: "", phone: "", message: "" });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
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
          <h2 className="text-lg font-semibold tracking-tight">Contact Information</h2>
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
            <CardTitle asChild>
              <h2 className="text-lg font-semibold">Send a Message</h2>
            </CardTitle>
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
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    className="glass border-white/10 bg-white/5 focus-visible:ring-fuchsia-500/50"
                  />
                  {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    className="glass border-white/10 bg-white/5 focus-visible:ring-fuchsia-500/50"
                  />
                  {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="10-digit number"
                    inputMode="numeric"
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                    className="glass border-white/10 bg-white/5 focus-visible:ring-fuchsia-500/50"
                  />
                  {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium">Requirement / Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us what you need..."
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                    className="glass border-white/10 bg-white/5 focus-visible:ring-fuchsia-500/50 resize-none"
                  />
                  {errors.message && <p className="text-xs text-red-400">{errors.message}</p>}
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-glow bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:opacity-90"
                >
                  {submitting ? (
                    <>Sending... <Loader2 className="ml-2 h-4 w-4 animate-spin" /></>
                  ) : (
                    <>Send Message <Send className="ml-2 h-4 w-4" /></>
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
