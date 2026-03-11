import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useUserTags } from "@/hooks/useUserTags";
import { toast } from "sonner";

const TAG_SUGGESTIONS = ["Daily Driver", "Weekend", "Dressy", "Sport", "Travel", "Special Occasion", "Beater"];

export function TagManagerCard() {
  const { tags, canCreateMore, createTag, updateTag, deleteTag } = useUserTags();
  const [newTagName, setNewTagName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    const result = await createTag(newTagName);
    if (result) {
      setNewTagName("");
      toast.success("Tag created");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    await updateTag(editingId, editingName);
    setEditingId(null);
    setEditingName("");
  };

  const handleDelete = async (id: string) => {
    await deleteTag(id);
    toast.success("Tag removed");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Tags
        </CardTitle>
        <CardDescription>
          Create up to 15 custom tags to categorize your items. Tags can be assigned to items and used as Canvas widgets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create new tag */}
        <div className="flex gap-2">
          <Input
            placeholder="New tag name..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            maxLength={30}
          />
          <Button size="sm" onClick={handleCreate} disabled={!canCreateMore || !newTagName.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {!canCreateMore && (
          <p className="text-xs text-muted-foreground">Maximum 15 tags reached</p>
        )}

        {/* Tag list */}
        <div className="space-y-2">
          {tags.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">No tags yet. Get started with a suggestion or create your own.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {TAG_SUGGESTIONS
                  .filter(s => !tags.some(t => t.name.toLowerCase() === s.toLowerCase()))
                  .map(suggestion => (
                    <Button
                      key={suggestion}
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => createTag(suggestion)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> {suggestion}
                    </Button>
                  ))}
              </div>
            </div>
          )}
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
              {editingId === tag.id ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                    className="flex-1 h-8 text-sm"
                    maxLength={30}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveEdit}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Badge variant="secondary" className="text-sm">{tag.name}</Badge>
                  <div className="flex-1" />
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8"
                    onClick={() => { setEditingId(tag.id); setEditingName(tag.name); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(tag.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-right">{tags.length}/15 tags</p>
      </CardContent>
    </Card>
  );
}
