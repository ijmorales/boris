import { ChevronDown, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  type AdAccountSummary,
  assignAccountToClient,
  type Client,
  createClient,
  deleteClient,
  fetchAdAccounts,
  fetchClients,
} from '~/lib/api/clients';

export function meta() {
  return [
    { title: 'Clients | Boris' },
    { name: 'description', content: 'Manage your clients' },
  ];
}

function formatCurrency(cents: number, currency: string): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

interface SpendingByCurrency {
  [currency: string]: number;
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [accounts, setAccounts] = useState<AdAccountSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(
    new Set(),
  );
  const [assigningAccount, setAssigningAccount] = useState<string | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [clientsData, accountsData] = await Promise.all([
        fetchClients(),
        fetchAdAccounts(),
      ]);
      setClients(clientsData);
      setAccounts(accountsData);
      setError(null);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createClient(newName.trim());
      setNewName('');
      await loadData();
    } catch (err) {
      setError('Failed to create client');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    setIsDeleting(true);
    try {
      await deleteClient(clientToDelete.id);
      setClientToDelete(null);
      await loadData();
    } catch (err) {
      setError('Failed to delete client');
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAssign = async (accountId: string, clientId: string | null) => {
    setAssigningAccount(accountId);
    try {
      await assignAccountToClient(accountId, clientId);
      await loadData();
    } catch (err) {
      setError('Failed to assign account');
      console.error(err);
    } finally {
      setAssigningAccount(null);
    }
  };

  const toggleExpanded = (clientId: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const getAccountsForClient = useCallback(
    (clientId: string) => accounts.filter((a) => a.clientId === clientId),
    [accounts],
  );

  const getClientSpending = useCallback(
    (clientId: string): SpendingByCurrency => {
      const clientAccounts = getAccountsForClient(clientId);
      const spending: SpendingByCurrency = {};
      for (const account of clientAccounts) {
        if (!spending[account.currency]) {
          spending[account.currency] = 0;
        }
        spending[account.currency] += account.totalSpendCents;
      }
      return spending;
    },
    [getAccountsForClient],
  );

  const formatClientSpending = useCallback(
    (clientId: string): string => {
      const spending = getClientSpending(clientId);
      const currencies = Object.keys(spending);
      if (currencies.length === 0) return '$0.00';
      return currencies
        .map((currency) => formatCurrency(spending[currency], currency))
        .join(' + ');
    },
    [getClientSpending],
  );

  const unassignedAccounts = useMemo(
    () => accounts.filter((a) => !a.clientId),
    [accounts],
  );

  const totalUnassignedSpending = useMemo(() => {
    const spending: SpendingByCurrency = {};
    for (const account of unassignedAccounts) {
      if (!spending[account.currency]) {
        spending[account.currency] = 0;
      }
      spending[account.currency] += account.totalSpendCents;
    }
    const currencies = Object.keys(spending);
    if (currencies.length === 0) return '$0.00';
    return currencies
      .map((currency) => formatCurrency(spending[currency], currency))
      .join(' + ');
  }, [unassignedAccounts]);

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
          <h1 className="text-4xl font-bold">Clients</h1>
          <p className="text-muted-foreground mt-2">
            Group ad accounts under clients for organized dashboard views
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* Create form */}
        <form onSubmit={handleCreate} className="flex gap-3 mb-8">
          <Input
            name="name"
            placeholder="New client name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="max-w-sm"
          />
          <Button type="submit" disabled={!newName.trim() || isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            <span className="ml-2">Create</span>
          </Button>
        </form>

        {/* Client list with accounts */}
        {clients.length === 0 ? (
          <div className="text-center py-16 border rounded-lg bg-muted/50">
            <h2 className="text-xl font-semibold mb-2">No clients yet</h2>
            <p className="text-muted-foreground">
              Create your first client to organize ad accounts.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {clients.map((client) => {
              const clientAccounts = getAccountsForClient(client.id);
              const isExpanded = expandedClients.has(client.id);
              const totalSpending = formatClientSpending(client.id);

              return (
                <div key={client.id} className="border rounded-lg bg-card">
                  <div className="flex items-center justify-between p-4">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(client.id)}
                      className="flex items-center gap-3 text-left flex-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{client.name}</span>
                      <span className="text-muted-foreground text-sm">
                        {clientAccounts.length}{' '}
                        {clientAccounts.length === 1 ? 'account' : 'accounts'}
                      </span>
                      <span className="text-sm font-semibold text-green-600 ml-auto mr-4">
                        {totalSpending}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setClientToDelete(client)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="border-t px-4 py-3 space-y-2">
                      {clientAccounts.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No accounts assigned. Assign accounts from the
                          unassigned section below.
                        </p>
                      ) : (
                        clientAccounts.map((account) => (
                          <div
                            key={account.id}
                            className="flex items-center justify-between py-2 pl-6"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                {account.platform}
                              </span>
                              <span className="text-sm">
                                {account.name || 'Unnamed Account'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium text-green-600">
                                {formatCurrency(
                                  account.totalSpendCents,
                                  account.currency,
                                )}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAssign(account.id, null)}
                                disabled={assigningAccount === account.id}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                {assigningAccount === account.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  'Unassign'
                                )}
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Unassigned accounts */}
        {unassignedAccounts.length > 0 && (
          <div className="border rounded-lg bg-card">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Unassigned Accounts</h2>
                <p className="text-sm text-muted-foreground">
                  These ad accounts are not assigned to any client
                </p>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">
                {totalUnassignedSpending}
              </span>
            </div>
            <div className="p-4 space-y-3">
              {unassignedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      {account.platform}
                    </span>
                    <span className="text-sm">
                      {account.name || 'Unnamed Account'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(
                        account.totalSpendCents,
                        account.currency,
                      )}
                    </span>
                  </div>
                  <select
                    className="text-sm border rounded px-2 py-1 bg-background"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAssign(account.id, e.target.value);
                      }
                    }}
                    disabled={assigningAccount === account.id}
                  >
                    <option value="">Assign to client...</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All assigned message */}
        {accounts.length > 0 &&
          unassignedAccounts.length === 0 &&
          clients.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>All ad accounts are assigned to clients.</p>
            </div>
          )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!clientToDelete}
        onOpenChange={(open) => !open && setClientToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{clientToDelete?.name}"? Any
              assigned ad accounts will become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
