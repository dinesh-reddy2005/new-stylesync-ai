import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BookOpen, Plus, Search, Trash2, Pencil, RefreshCcw, Database, Sparkles, Loader2, X,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listKnowledge, knowledgeStats, upsertKnowledge, deleteKnowledge, reembedAll,
} from "@/lib/knowledge.functions";

export const Route = createFileRoute("/admin/knowledge")({
  component: KnowledgeAdminPage,
  head: () => ({
    meta: [
      { title: "Knowledge Base — StyleSync AI Admin" },
      { name: "description", content: "Manage StyleSync AI fashion knowledge for the RAG pipeline." },
    ],
  }),
});

const CATEGORIES = [
  "All", "Audience", "Product", "Tone", "Story", "Offer", "Hashtag",
  "Body Types", "Men's Fashion", "Women's Fashion", "Color Matching",
  "Occasion Styling", "Seasonal Fashion", "Fashion Trends", "Accessories",
  "Footwear", "Fabric Guide", "Skin Tone Analysis", "Wardrobe Matching",
  "Virtual Try-On", "Shopping Recommendations", "Size Guide",
];

type Entry = {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords: string | null;
  source: string | null;
  embedding_status: string;
  created_at: string;
  updated_at: string;
};

function KnowledgeAdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Entry | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  const listFn = useServerFn(listKnowledge);
  const statsFn = useServerFn(knowledgeStats);
  const upsertFn = useServerFn(upsertKnowledge);
  const deleteFn = useServerFn(deleteKnowledge);
  const reembedFn = useServerFn(reembedAll);

  const list = useQuery({
    queryKey: ["kb", category, query],
    queryFn: () => listFn({ data: { category, query, limit: 200 } }),
    enabled: !!user,
  });
  const stats = useQuery({
    queryKey: ["kb-stats"],
    queryFn: () => statsFn(),
    enabled: !!user,
  });

  const upsertM = useMutation({
    mutationFn: (payload: Partial<Entry> & { title: string; category: string; content: string }) =>
      upsertFn({ data: payload }),
    onSuccess: () => {
      toast.success("Knowledge entry saved");
      setShowForm(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["kb"] });
      qc.invalidateQueries({ queryKey: ["kb-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Entry deleted");
      qc.invalidateQueries({ queryKey: ["kb"] });
      qc.invalidateQueries({ queryKey: ["kb-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reembedM = useMutation({
    mutationFn: () => reembedFn(),
    onSuccess: (r) => {
      toast.success(`Re-embedded ${r.processed} entries${r.failed ? `, ${r.failed} failed` : ""}`);
      qc.invalidateQueries({ queryKey: ["kb"] });
      qc.invalidateQueries({ queryKey: ["kb-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 text-fuchsia-400" /> RAG Knowledge Base
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Fashion <span className="text-gradient">Knowledge Base</span>
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Structured fashion expertise powering personalized recommendations and outfit reasoning.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="glass border-white/10"
            onClick={() => reembedM.mutate()}
            disabled={reembedM.isPending}
          >
            {reembedM.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Re-embed pending
          </Button>
          <Button
            className="btn-glow bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white"
            onClick={() => { setEditing(null); setShowForm(true); }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add entry
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total entries" value={stats.data?.total ?? 0} icon={<Database className="h-4 w-4" />} accent="from-fuchsia-500/30 to-blue-500/30" />
        <StatCard label="Embedded" value={stats.data?.processed ?? 0} icon={<Sparkles className="h-4 w-4" />} accent="from-emerald-500/30 to-blue-500/30" />
        <StatCard label="Pending" value={stats.data?.pending ?? 0} icon={<Loader2 className="h-4 w-4" />} accent="from-amber-500/30 to-fuchsia-500/30" />
        <StatCard label="Categories" value={Object.keys(stats.data?.byCategory ?? {}).length} icon={<BookOpen className="h-4 w-4" />} accent="from-blue-500/30 to-purple-500/30" />
      </div>

      {/* Filters */}
      <Card className="glass mt-6 border-white/10 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search title, content, keywords…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="glass border-white/10 pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.slice(0, 10).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  category === c
                    ? "bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white"
                    : "glass border border-white/10 text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
            <select
              value={CATEGORIES.slice(0, 10).includes(category) ? "" : category}
              onChange={(e) => e.target.value && setCategory(e.target.value)}
              className="glass rounded-full border border-white/10 bg-transparent px-3 py-1 text-xs text-muted-foreground"
            >
              <option value="">More…</option>
              {CATEGORIES.slice(10).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* List */}
      <div className="mt-6 grid gap-3">
        {list.isLoading && Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
        {list.data?.items.length === 0 && (
          <Card className="glass border-white/10 p-12 text-center text-sm text-muted-foreground">
            No entries yet. Click <span className="text-foreground font-medium">Add entry</span> to create one.
          </Card>
        )}
        {list.data?.items.map((e) => (
          <EntryRow
            key={e.id}
            entry={e as Entry}
            onEdit={() => { setEditing(e as Entry); setShowForm(true); }}
            onDelete={() => {
              if (confirm(`Delete "${e.title}"?`)) deleteM.mutate(e.id);
            }}
          />
        ))}
      </div>

      {/* Drawer / Modal */}
      {showForm && (
        <EntryForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={(values) => upsertM.mutate({ ...values, id: editing?.id })}
          submitting={upsertM.isPending}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent: string }) {
  return (
    <Card className={`glass border-white/10 p-4 bg-gradient-to-br ${accent}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-fuchsia-300">{icon}</div>
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </Card>
  );
}

function EntryRow({ entry, onEdit, onDelete }: { entry: Entry; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="glass border-white/10 p-4 transition hover:border-fuchsia-500/30">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold truncate">{entry.title}</h3>
            <Badge variant="outline" className="border-fuchsia-500/30 text-fuchsia-300">{entry.category}</Badge>
            <StatusBadge status={entry.embedding_status} />
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{entry.content}</p>
          {entry.keywords && (
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="text-blue-300">Keywords:</span> {entry.keywords}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    processed: "border-emerald-500/40 text-emerald-300",
    pending: "border-amber-500/40 text-amber-300",
    failed: "border-red-500/40 text-red-300",
  };
  return (
    <Badge variant="outline" className={map[status] ?? "border-white/20"}>
      {status}
    </Badge>
  );
}

function EntryForm({
  initial, onClose, onSave, submitting,
}: {
  initial: Entry | null;
  onClose: () => void;
  onSave: (v: { title: string; category: string; content: string; keywords?: string; source?: string }) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Body Types");
  const [content, setContent] = useState(initial?.content ?? "");
  const [keywords, setKeywords] = useState(initial?.keywords ?? "");
  const [source, setSource] = useState(initial?.source ?? "");

  const canSubmit = useMemo(() => title.trim() && category.trim() && content.trim(), [title, category, content]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="glass-strong w-full max-w-2xl rounded-t-2xl border border-white/10 p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {initial ? "Edit" : "New"} <span className="text-gradient">knowledge entry</span>
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="glass border-white/10" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="glass mt-1 w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm"
            >
              {CATEGORIES.filter((c) => c !== "All").map((c) => (
                <option key={c} value={c} className="bg-background">{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="glass border-white/10"
              placeholder="Detailed fashion knowledge…"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Keywords (comma-separated)</label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} className="glass border-white/10" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Source (optional)</label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} className="glass border-white/10" />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="glass border-white/10">Cancel</Button>
          <Button
            disabled={!canSubmit || submitting}
            onClick={() => onSave({ title, category, content, keywords: keywords || undefined, source: source || undefined })}
            className="btn-glow bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {initial ? "Save changes" : "Create entry"}
          </Button>
        </div>
      </div>
    </div>
  );
}