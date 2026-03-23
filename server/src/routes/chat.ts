import { Router, Request, Response, NextFunction } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticate, AuthRequest } from '../middleware/auth';
import { rateLimit } from 'express-rate-limit';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { 
  saveChatMessage, 
  getChatHistory, 
  getRecentChatMessages,
  deleteChatHistory,
  getChatStats,
} from '../services/chatService';

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many messages. Please slow down.' },
});

const SYSTEM_PROMPT = `You are VaultBot, the friendly AI helpdesk assistant for VaultGames — a multiplayer online gaming platform.

You help players with:
- Game rules (Mines: multiplayer mine-sweeping game; Word Jumble: fastest correct unscramble wins)
- Account issues (login, registration, password reset, OTP verification)
- Navigating the platform (finding games, profile settings, friends)
- Coins and rewards system
- Technical troubleshooting
- Friend system (sending/accepting requests, finding players)

Tone: friendly, concise, enthusiastic about gaming. Use gaming terminology naturally.
Keep responses short and actionable — max 3 sentences unless explaining complex rules.
Do not discuss anything unrelated to VaultGames.

Mines Game Rules:
- Players take turns clicking tiles on a 5x5 grid
- Grid has mines hidden beneath tiles
- Safe tile = score +10 points, turn advances to next player
- Mine tile = player eliminated
- Last player standing wins

Word Jumble Rules:
- A scrambled word appears on screen
- All players race to unscramble it first
- First correct answer wins the round and earns speed-based points
- Most points after N rounds wins`;

// POST /api/chat/message
router.post('/message', chatLimiter, authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      sendError(res, 400, 'Messages array is required', 'MISSING_MESSAGES');
      return;
    }

    // Validate message format
    const validMessages = messages
      .filter((m: any) => m.role && m.content && typeof m.content === 'string')
      .slice(-10) // Only last 10 messages for context
      .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // Save user's message
    const userMessage = validMessages[validMessages.length - 1];
    if (userMessage && userMessage.role === 'user') {
      await saveChatMessage({
        userId: req.user!.userId,
        content: userMessage.content,
        role: 'user',
      });
    }

    // Convert messages to Gemini format
    const geminiMessages = validMessages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user', // Gemini uses 'model' instead of 'assistant'
      parts: [{ text: m.content }],
    }));

    // Call Gemini API
    const response = await model.generateContent({
      contents: geminiMessages,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.7,
      },
    });

    const reply = response.response.text() || 'I encountered an issue. Please try again.';

    // Save assistant's response (fire-and-forget)
    saveChatMessage({
      userId: req.user!.userId,
      content: reply,
      role: 'assistant',
    }).catch(console.error);

    sendSuccess(res, 200, { reply });
  } catch (err: any) {
    if (err.status === 429) {
      sendError(res, 429, 'AI service is busy. Please try again shortly.', 'AI_SERVICE_BUSY');
      return;
    }
    next(err);
  }
});

// GET /api/chat/history — get user's chat conversation history
router.get('/history', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const messages = await getChatHistory(req.user!.userId, limit);

    sendSuccess(res, 200, { messages, count: messages.length });
  } catch (err) { next(err); }
});

// GET /api/chat/stats — get chat statistics
router.get('/stats', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await getChatStats(req.user!.userId);
    sendSuccess(res, 200, stats);
  } catch (err) { next(err); }
});

// DELETE /api/chat/history — delete user's chat history
router.delete('/history', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await deleteChatHistory(req.user!.userId);
    sendSuccess(res, 200, { message: 'Chat history deleted successfully' });
  } catch (err) { next(err); }
});

export default router;
