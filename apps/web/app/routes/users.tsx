import { Loader2, Mail, Shield, ShieldOff, Trash2, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  createInvite,
  deleteInvite,
  fetchUsersAndInvites,
  type Invite,
  removeUser,
  updateUserRole,
  type User,
} from '~/lib/api/users';

export function meta() {
  return [
    { title: 'Team | Boris' },
    { name: 'description', content: 'Manage your team members' },
  ];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [inviteToDelete, setInviteToDelete] = useState<Invite | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchUsersAndInvites();
      setUsers(data.users);
      setInvites(data.invites);
      setError(null);
    } catch (err) {
      setError('Failed to load team data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await createInvite(newEmail.trim(), newIsAdmin);
      setNewEmail('');
      setNewIsAdmin(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRole = async (user: User) => {
    setUpdatingUserId(user.id);
    try {
      await updateUserRole(user.id, !user.isAdmin);
      await loadData();
    } catch (err) {
      setError('Failed to update user role');
      console.error(err);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const confirmRemoveUser = async () => {
    if (!userToRemove) return;

    setIsDeleting(true);
    try {
      await removeUser(userToRemove.id);
      setUserToRemove(null);
      await loadData();
    } catch (err) {
      setError('Failed to remove user');
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteInvite = async () => {
    if (!inviteToDelete) return;

    setIsDeleting(true);
    try {
      await deleteInvite(inviteToDelete.id);
      setInviteToDelete(null);
      await loadData();
    } catch (err) {
      setError('Failed to revoke invite');
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Team</h1>
          <p className="text-muted-foreground mt-2">
            Manage your organization's team members and invitations
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* Invite form */}
        <form onSubmit={handleInvite} className="mb-8">
          <div className="flex gap-3 items-end">
            <div className="flex-1 max-w-sm">
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
              >
                Email address
              </label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="colleague@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAdmin"
                checked={newIsAdmin}
                onChange={(e) => setNewIsAdmin(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="isAdmin" className="text-sm">
                Admin
              </label>
            </div>
            <Button type="submit" disabled={!newEmail.trim() || isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              <span className="ml-2">Invite</span>
            </Button>
          </div>
        </form>

        {/* Current members */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Members ({users.length})
          </h2>
          {users.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-muted/50">
              <p className="text-muted-foreground">No members yet</p>
            </div>
          ) : (
            <div className="border rounded-lg divide-y">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        {user.clerkId.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.clerkId}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        user.isAdmin
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {user.isAdmin ? 'Admin' : 'Member'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleRole(user)}
                      disabled={updatingUserId === user.id}
                      title={user.isAdmin ? 'Demote to member' : 'Promote to admin'}
                    >
                      {updatingUserId === user.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : user.isAdmin ? (
                        <ShieldOff className="size-4" />
                      ) : (
                        <Shield className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUserToRemove(user)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Pending Invites ({invites.length})
            </h2>
            <div className="border rounded-lg divide-y">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center">
                      <Mail className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited {formatDate(invite.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        invite.isAdmin
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {invite.isAdmin ? 'Admin' : 'Member'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInviteToDelete(invite)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Remove user confirmation dialog */}
      <AlertDialog
        open={!!userToRemove}
        onOpenChange={(open) => !open && setUserToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this user from the organization?
              They will lose access to all organization data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveUser} disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke invite confirmation dialog */}
      <AlertDialog
        open={!!inviteToDelete}
        onOpenChange={(open) => !open && setInviteToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the invitation for{' '}
              {inviteToDelete?.email}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteInvite}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
