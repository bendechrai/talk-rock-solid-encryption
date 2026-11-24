/** Thin wrappers around the Whisper server's HTTP API. */
import type { Conversation, DatabaseSnapshot, EphemeralKeyEntry, PublicKeyEntry, StoredMessage, User } from '@whisper/shared';

export type ApiVersion = 'v1' | 'v2' | 'v3';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `${response.status} ${response.statusText}`);
  return body as T;
}

export const api = {
  users: () => request<{ users: (User & { publicKey: string | null })[] }>('/api/users').then((r) => r.users),

  conversations: (userId: string) =>
    request<{ conversations: Conversation[] }>(`/api/conversations?userId=${encodeURIComponent(userId)}`).then((r) => r.conversations),

  conversation: (conversationId: string) =>
    request<{ conversation: Conversation }>(`/api/conversations/${conversationId}`).then((r) => r.conversation),

  messages: (version: ApiVersion, conversationId: string) =>
    request<{ messages: StoredMessage[] }>(`/api/${version}/conversations/${conversationId}/messages`).then((r) => r.messages),

  send: (version: ApiVersion, conversationId: string, sender: string, content: string) =>
    request<{ message: StoredMessage }>(`/api/${version}/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ sender, content }),
    }),

  conversationKeys: (conversationId: string) =>
    request<{ keys: PublicKeyEntry[] }>(`/api/conversations/${conversationId}/keys`).then((r) => r.keys),

  publishKey: (userId: string, publicKey: string) =>
    request(`/api/users/${userId}/key`, { method: 'PUT', body: JSON.stringify({ publicKey }) }),

  withdrawKey: (userId: string) => request(`/api/users/${userId}/key`, { method: 'DELETE' }).catch(() => undefined),

  ephemeralKeys: (conversationId: string) =>
    request<{ keys: EphemeralKeyEntry[] }>(`/api/conversations/${conversationId}/ephemeral-keys`).then((r) => r.keys),

  publishEphemeralKey: (conversationId: string, userId: string, publicKey: string, expiresAt: string) =>
    request<{ key: EphemeralKeyEntry }>(`/api/conversations/${conversationId}/ephemeral-keys/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ publicKey, expiresAt }),
    }).then((r) => r.key),

  setEphemeralExpiry: (keyId: string, expiresAt: string) =>
    request(`/api/ephemeral-keys/${keyId}/expiry`, { method: 'PUT', body: JSON.stringify({ expiresAt }) }).catch(() => undefined),

  withdrawEphemeralKey: (keyId: string) => request(`/api/ephemeral-keys/${keyId}`, { method: 'DELETE' }).catch(() => undefined),

  database: () => request<DatabaseSnapshot>('/api/admin/database'),

  reset: () => request('/api/admin/reset', { method: 'POST' }),

  setMembers: (conversationId: string, memberUserIds: string[]) =>
    request(`/api/admin/conversations/${conversationId}/members`, { method: 'PUT', body: JSON.stringify({ memberUserIds }) }),

  /** For the inspector's query tool: fetch any path and return whatever comes back. */
  raw: async (path: string): Promise<string> => {
    const response = await fetch(path);
    const text = await response.text();
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  },
};
