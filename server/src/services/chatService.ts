import { prisma } from '../config/prisma';

export interface ChatMessageData {
  userId: string;
  content: string;
  role: 'user' | 'assistant';
}

/**
 * Save a chat message to database
 */
export async function saveChatMessage(data: ChatMessageData) {
  const message = await prisma.chatMessage.create({
    data: {
      userId: data.userId,
      content: data.content,
      role: data.role,
    },
  });

  return message;
}

/**
 * Get user's chat conversation history (paginated, newest first)
 */
export async function getChatHistory(userId: string, limit = 50, skip = 0) {
  const messages = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' }, // Newest first
    take: limit,
    skip: skip,
  });

  // Reverse to return in chronological order (oldest to newest)
  return messages.reverse();
}

/**
 * Get recent chat messages (for context window)
 */
export async function getRecentChatMessages(userId: string, count = 10) {
  const messages = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: count,
  });

  // Reverse to get chronological order
  return messages.reverse();
}

/**
 * Delete user's chat history (privacy)
 */
export async function deleteChatHistory(userId: string) {
  return await prisma.chatMessage.deleteMany({
    where: { userId },
  });
}

/**
 * Get chat statistics
 */
export async function getChatStats(userId: string) {
  const [totalMessages, userMessages, assistantMessages] = await Promise.all([
    prisma.chatMessage.count({ where: { userId } }),
    prisma.chatMessage.count({ where: { userId, role: 'user' } }),
    prisma.chatMessage.count({ where: { userId, role: 'assistant' } }),
  ]);

  // Get date of first message
  const firstMessage = await prisma.chatMessage.findFirst({
    where: { userId },
    orderBy: { timestamp: 'asc' },
    select: { timestamp: true },
  });

  return {
    totalMessages,
    userMessages,
    assistantMessages,
    conversationStartedAt: firstMessage?.timestamp || null,
  };
}
