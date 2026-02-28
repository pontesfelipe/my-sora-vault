import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit, Trash2, UserPlus, Users, Crown, Edit3, Eye } from "lucide-react";

interface CollectionAccess {
  id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  user_email?: string;
  user_name?: string;
}

interface Collection {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  owner_email?: string;
  owner_name?: string;
  access: CollectionAccess[];
  watch_count: number;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

export const CollectionsTab = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [newName, setNewName] = useState("");
  const [addingAccessTo, setAddingAccessTo] = useState<Collection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<'owner' | 'editor' | 'viewer'>("viewer");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all collections
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

      if (collectionsError) throw collectionsError;

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (profilesError) throw profilesError;

      // Fetch all user_collections
      const { data: accessData, error: accessError } = await supabase
        .from('user_collections')
        .select('*');

      if (accessError) throw accessError;

      // Fetch watch counts per collection
      const { data: watchesData, error: watchesError } = await supabase
        .from('watches')
        .select('collection_id');

      if (watchesError) throw watchesError;

      // Create a map of collection_id -> watch count
      const watchCountMap = new Map<string, number>();
      (watchesData || []).forEach(watch => {
        if (watch.collection_id) {
          watchCountMap.set(watch.collection_id, (watchCountMap.get(watch.collection_id) || 0) + 1);
        }
      });

      const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Map collections with owner info and access list
      const collectionsWithAccess = (collectionsData || []).map(collection => {
        const ownerProfile = profileMap.get(collection.created_by);
        const collectionAccess = (accessData || [])
          .filter(a => a.collection_id === collection.id)
          .map(a => {
            const userProfile = profileMap.get(a.user_id);
            return {
              id: a.id,
              user_id: a.user_id,
              role: a.role as 'owner' | 'editor' | 'viewer',
              user_email: userProfile?.email,
              user_name: userProfile?.full_name || undefined,
            };
          });

        return {
          ...collection,
          owner_email: ownerProfile?.email,
          owner_name: ownerProfile?.full_name || undefined,
          access: collectionAccess,
          watch_count: watchCountMap.get(collection.id) || 0,
        };
      });

      setCollections(collectionsWithAccess);
      setProfiles(profilesData || []);
    } catch (error: any) {
      console.error("Error fetching collections:", error);
      toast.error("Failed to load collections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditName = async () => {
    if (!editingCollection || !newName.trim()) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('collections')
        .update({ name: newName.trim() })
        .eq('id', editingCollection.id);

      if (error) throw error;

      toast.success("Collection name updated");
      setEditingCollection(null);
      setNewName("");
      fetchData();
    } catch (error: any) {
      console.error("Error updating collection:", error);
      toast.error("Failed to update collection name");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAccess = async () => {
    if (!addingAccessTo || !selectedUserId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_collections')
        .upsert({
          user_id: selectedUserId,
          collection_id: addingAccessTo.id,
          role: selectedRole,
        }, {
          onConflict: 'user_id,collection_id'
        });

      if (error) throw error;

      toast.success("Access granted successfully");
      setAddingAccessTo(null);
      setSelectedUserId("");
      setSelectedRole("viewer");
      fetchData();
    } catch (error: any) {
      console.error("Error adding access:", error);
      toast.error("Failed to grant access");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAccess = async (accessId: string, collectionId: string) => {
    try {
      const { error } = await supabase
        .from('user_collections')
        .delete()
        .eq('id', accessId);

      if (error) throw error;

      toast.success("Access removed");
      fetchData();
    } catch (error: any) {
      console.error("Error removing access:", error);
      toast.error("Failed to remove access");
    }
  };

  const handleUpdateRole = async (accessId: string, newRole: 'owner' | 'editor' | 'viewer') => {
    try {
      const { error } = await supabase
        .from('user_collections')
        .update({ role: newRole })
        .eq('id', accessId);

      if (error) throw error;

      toast.success("Role updated");
      fetchData();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const handleDeleteCollection = async () => {
    if (!deletingCollection) return;

    setSaving(true);
    try {
      // First delete all user_collections entries
      const { error: accessError } = await supabase
        .from('user_collections')
        .delete()
        .eq('collection_id', deletingCollection.id);

      if (accessError) throw accessError;

      // Then delete the collection itself
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', deletingCollection.id);

      if (error) throw error;

      toast.success("Collection deleted successfully");
      setDeletingCollection(null);
      fetchData();
    } catch (error: any) {
      console.error("Error deleting collection:", error);
      toast.error("Failed to delete collection");
    } finally {
      setSaving(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-3 h-3" />;
      case 'editor': return <Edit3 className="w-3 h-3" />;
      case 'viewer': return <Eye className="w-3 h-3" />;
      default: return null;
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    switch (role) {
      case 'owner': return 'default';
      case 'editor': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Collections
          </CardTitle>
          <CardDescription>
            Manage all collections and user access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collection Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-center">Watches</TableHead>
                <TableHead>Users with Access</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((collection) => (
                <TableRow key={collection.id}>
                  <TableCell className="font-medium">{collection.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{collection.owner_name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">{collection.owner_email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{collection.watch_count}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {collection.access.map((access) => (
                        <div key={access.id} className="flex items-center gap-1">
                          <Badge variant={getRoleBadgeVariant(access.role)} className="gap-1 text-xs">
                            {getRoleIcon(access.role)}
                            {access.user_email?.split('@')[0]}
                          </Badge>
                          {access.role !== 'owner' && (
                            <Select
                              value={access.role}
                              onValueChange={(value) => handleUpdateRole(access.id, value as any)}
                            >
                              <SelectTrigger className="h-6 w-20 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="viewer">Viewer</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="owner">Owner</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {access.role !== 'owner' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              aria-label="Remove access"
                              onClick={() => handleRemoveAccess(access.id, collection.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(collection.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit collection"
                        onClick={() => {
                          setEditingCollection(collection);
                          setNewName(collection.name);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Add user access"
                        onClick={() => setAddingAccessTo(collection)}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete collection"
                        onClick={() => setDeletingCollection(collection)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {collections.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No collections found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Name Dialog */}
      <Dialog open={!!editingCollection} onOpenChange={(open) => !open && setEditingCollection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection Name</DialogTitle>
            <DialogDescription>
              Change the name of this collection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Collection Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter collection name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCollection(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditName} disabled={saving || !newName.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Access Dialog */}
      <Dialog open={!!addingAccessTo} onOpenChange={(open) => !open && setAddingAccessTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User Access</DialogTitle>
            <DialogDescription>
              Grant a user access to {addingAccessTo?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {profiles
                    .filter(p => !addingAccessTo?.access.some(a => a.user_id === p.id))
                    .map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name || profile.email} ({profile.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer (Read only)</SelectItem>
                  <SelectItem value="editor">Editor (Can edit)</SelectItem>
                  <SelectItem value="owner">Owner (Full control)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingAccessTo(null)}>
              Cancel
            </Button>
            <Button onClick={handleAddAccess} disabled={saving || !selectedUserId}>
              {saving ? "Granting..." : "Grant Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCollection} onOpenChange={(open) => !open && setDeletingCollection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCollection?.name}"? This will permanently delete the collection and remove all user access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCollection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? "Deleting..." : "Delete Collection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
