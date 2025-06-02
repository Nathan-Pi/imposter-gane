import { WORD_PAIRS } from "./WordList";

type Player = {
  id: string;
  name: string;
};
type Room = {
  code: string;
  players: Player[];
  gameStarted?: boolean;
  words?: { [id: string]: string }; // playerId → word
  imposterId?: string;
  votes?: { [voter: string]: string }; // voterName → votedForName
};

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  return Math.random().toString(36).substr(2, 5).toUpperCase();
}

export function createRoom(socketId: string, name: string): Room {
  const code = generateRoomCode();
  const room: Room = { code, players: [{ id: socketId, name }] };
  rooms.set(code, room);
  return room;
}

export function joinRoom(code: string, socketId: string, name: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.gameStarted) return null; // Prevent joining if game started
  // Prevent duplicate players
  if (!room.players.find((p) => p.id === socketId)) {
    room.players.push({ id: socketId, name });
  }
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function removePlayer(socketId: string) {
  for (const room of rooms.values()) {
    room.players = room.players.filter((p) => p.id !== socketId);
  }
}

export function startGame(code: string) {
  const room = rooms.get(code);
  if (!room || room.players.length < 3) return null; // Need at least 3 to start

  // Pick a random pair
  const [word, imposterWord] = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];

  // Pick imposter at random
  const imposterIdx = Math.floor(Math.random() * room.players.length);
  const imposter = room.players[imposterIdx];

  room.imposterId = imposter.id;
  room.gameStarted = true;
  room.words = {};
  room.votes = {};

  room.players.forEach((p) => {
    room.words![p.id] = p.id === imposter.id ? imposterWord : word;
  });

  return { ...room, word, imposterWord, imposterId: imposter.id };
}

// --- VOTE LOGIC ---

export function recordVote(code: string, voterName: string, votedForName: string) {
  const room = rooms.get(code);
  if (!room) return null;
  if (!room.votes) room.votes = {};
  room.votes[voterName] = votedForName;

  // When all players have voted, tally and return results
  if (Object.keys(room.votes).length >= room.players.length) {
    const tally: { [name: string]: number } = {};
    Object.values(room.votes).forEach((votedFor) => {
      tally[votedFor] = (tally[votedFor] || 0) + 1;
    });

    const imposter = room.players.find((p) => p.id === room.imposterId);
    const imposterName = imposter ? imposter.name : "";

    const regularWord = Object.entries(room.words || {}).find(
      ([id]) => id !== room.imposterId
    )?.[1] || "";
    const imposterWord = Object.entries(room.words || {}).find(
      ([id]) => id === room.imposterId
    )?.[1] || "";

    // Optionally: reset votes here for next round
    // room.votes = {};

    return {
      votes: tally,
      imposter: imposterName,
      word: regularWord,
      imposterWord: imposterWord,
    };
  }
  return null;
}