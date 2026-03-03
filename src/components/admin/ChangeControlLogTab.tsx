import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/utils/format";

interface ChangeLogEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  version: string | null;
  author: string | null;
  status: string;
  affected_components: string[];
  is_breaking_change: boolean;
  rollback_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "feature", label: "Feature" },
  { value: "fix", label: "Bug Fix" },
  { value: "schema", label: "Schema Change" },
  { value: "config", label: "Configuration" },
  { value: "security", label: "Security" },
  { value: "performance", label: "Performance" },
  { value: "refactor", label: "Refactor" },
  { value: "docs", label: "Documentation" },
];

const STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "rolled-back", label: "Rolled Back" },
];

const categoryColors: Record<string, string> = {
  feature: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  fix: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  schema: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  config: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  security: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  performance: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30",
  refactor: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
  docs: "bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/30",
};

const statusColors: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  "in-progress": "bg-accent/15 text-accent border-accent/30",
  done: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30",
  "rolled-back": "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
};

function EntryForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: {
  initial?: Partial<ChangeLogEntry>;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "feature");
  const [version, setVersion] = useState(initial?.version ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [status, setStatus] = useState(initial?.status ?? "done");
  const [affectedComponents, setAffectedComponents] = useState(
    initial?.affected_components?.join(", ") ?? ""
  );
  const [isBreaking, setIsBreaking] = useState(initial?.is_breaking_change ?? false);
  const [rollbackNotes, setRollbackNotes] = useState(initial?.rollback_notes ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      version: version.trim() || null,
      author: author.trim() || null,
      status,
      affected_components: affectedComponents
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      is_breaking_change: isBreaking,
      rollback_notes: rollbackNotes.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Added change control log" />
        </div>
        <div className="space-y-2">
          <Label>Version</Label>
          <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g. 2.4.0" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description *</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was changed and why..." rows={3} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Author</Label>
          <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Admin" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Affected Components (comma-separated)</Label>
        <Input value={affectedComponents} onChange={(e) => setAffectedComponents(e.target.value)} placeholder="e.g. Admin, Settings, Auth" />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={isBreaking} onCheckedChange={setIsBreaking} id="breaking" />
        <Label htmlFor="breaking" className="flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          Breaking Change
        </Label>
      </div>
      <div className="space-y-2">
        <Label>Rollback Notes</Label>
        <Textarea value={rollbackNotes} onChange={(e) => setRollbackNotes(e.target.value)} placeholder="Steps to rollback if needed..." rows={2} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{initial?.id ? "Update" : "Add Entry"}</Button>
      </div>
    </form>
  );
}

export function ChangeControlLogTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ChangeLogEntry | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["change-control-log"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("change_control_log")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ChangeLogEntry[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (entry: any) => {
      const { error } = await (supabase as any)
        .from("change_control_log")
        .insert({ ...entry, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change-control-log"] });
      toast.success("Entry added");
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...entry }: any) => {
      const { error } = await (supabase as any)
        .from("change_control_log")
        .update(entry)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change-control-log"] });
      toast.success("Entry updated");
      setEditEntry(null);
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("change_control_log")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change-control-log"] });
      toast.success("Entry deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Change Control Log</CardTitle>
          <CardDescription>Track all platform changes, releases, and version history</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditEntry(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editEntry ? "Edit Entry" : "New Change Log Entry"}</DialogTitle>
            </DialogHeader>
            <EntryForm
              initial={editEntry ?? undefined}
              onSubmit={(data) =>
                editEntry
                  ? updateMutation.mutate({ id: editEntry.id, ...data })
                  : createMutation.mutate(data)
              }
              onCancel={() => { setDialogOpen(false); setEditEntry(null); }}
              loading={createMutation.isPending || updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No entries yet. Add your first change log entry.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Breaking</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <>
                  <TableRow key={entry.id} className="cursor-pointer" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
                    <TableCell>
                      {expandedId === entry.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(entry.created_at)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{entry.version || "—"}</TableCell>
                    <TableCell className="font-medium text-sm">{entry.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={categoryColors[entry.category] || ""}>
                        {CATEGORIES.find((c) => c.value === entry.category)?.label || entry.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[entry.status] || ""}>
                        {STATUSES.find((s) => s.value === entry.status)?.label || entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.is_breaking_change && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          aria-label="Edit entry"
                          onClick={() => { setEditEntry(entry); setDialogOpen(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          aria-label="Delete entry"
                          onClick={() => {
                            if (confirm("Delete this entry?")) deleteMutation.mutate(entry.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === entry.id && (
                    <TableRow key={`${entry.id}-detail`}>
                      <TableCell colSpan={8} className="bg-muted/30">
                        <div className="space-y-3 py-2 px-2 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Description:</span>
                            <p className="mt-1 whitespace-pre-wrap">{entry.description}</p>
                          </div>
                          {entry.author && (
                            <div>
                              <span className="font-medium text-muted-foreground">Author:</span> {entry.author}
                            </div>
                          )}
                          {entry.affected_components?.length > 0 && (
                            <div>
                              <span className="font-medium text-muted-foreground">Affected Components:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {entry.affected_components.map((c) => (
                                  <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {entry.rollback_notes && (
                            <div>
                              <span className="font-medium text-muted-foreground">Rollback Notes:</span>
                              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{entry.rollback_notes}</p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
