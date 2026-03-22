import { prisma } from '../config/prisma';

const adjectives = [
  'Swift', 'Cosmic', 'Neon', 'Phantom', 'Shadow', 'Crimson', 'Azure', 'Void',
  'Storm', 'Frost', 'Ember', 'Lunar', 'Solar', 'Dark', 'Iron', 'Wild',
  'Blaze', 'Nova', 'Apex', 'Echo', 'Nexus', 'Rogue', 'Pulse', 'Titan',
];

const nouns = [
  'Fox', 'Wolf', 'Hawk', 'Tiger', 'Dragon', 'Phoenix', 'Viper', 'Cobra',
  'Eagle', 'Raven', 'Lynx', 'Panther', 'Falcon', 'Spectre', 'Ghost', 'Blade',
  'Hunter', 'Ranger', 'Cipher', 'Vector', 'Nexus', 'Byte', 'Pixel', 'Core',
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function generateUniqueUsername(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const adj = randomElement(adjectives);
    const noun = randomElement(nouns);
    const num = randomNumber(100, 9999);
    const username = `${adj}${noun}${num}`;

    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) return username;
    attempts++;
  }

  // Fallback with UUID fragment
  return `Player${Date.now().toString(36).toUpperCase()}`;
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
