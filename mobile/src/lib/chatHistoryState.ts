// Metadata refresh must not erase already displayed messages. A removed server
// conversation is not kept; message contents are revalidated separately.
export function mergeConversationMetadata<T extends { id: string; serverConversationId: string | null; messages: unknown[] }>(current: T[], loaded: T[]): T[] {
  const existing = new Map(current.filter(chat => chat.serverConversationId).map(chat => [chat.serverConversationId, chat]));
  return loaded.map(chat => {
    const previous = chat.serverConversationId ? existing.get(chat.serverConversationId) : undefined;
    return previous ? { ...chat, messages: previous.messages } : chat;
  });
}
