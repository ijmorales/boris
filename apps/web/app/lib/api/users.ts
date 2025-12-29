const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface User {
  id: string;
  clerkId: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface Invite {
  id: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface UsersAndInvites {
  users: User[];
  invites: Invite[];
}

export async function fetchUsersAndInvites(): Promise<UsersAndInvites> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`);
  }

  const json = await response.json();
  return json.data;
}

export async function updateUserRole(
  userId: string,
  isAdmin: boolean,
): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAdmin }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to update user: ${response.statusText}`);
  }

  const json = await response.json();
  return json.data;
}

export async function removeUser(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to remove user: ${response.statusText}`);
  }
}

export async function createInvite(
  email: string,
  isAdmin: boolean,
): Promise<Invite> {
  const response = await fetch(`${API_BASE_URL}/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, isAdmin }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.details?.email?.[0] || `Failed to create invite`);
  }

  const json = await response.json();
  return json.data;
}

export async function deleteInvite(inviteId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/invites/${inviteId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete invite: ${response.statusText}`);
  }
}
