// ... other imports
import React, { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";
const socket: Socket = io(SERVER_URL);

function App() {
  // ... existing state
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState("");
  const [name, setName] = useState("");
  const [nameEntered, setNameEntered] = useState(false);
  const [players, setPlayers] = useState<string[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [myWord, setMyWord] = useState<string | null>(null);
  const [isImposter, setIsImposter] = useState(false);

  const [discussionSeconds, setDiscussionSeconds] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  // NEW FOR VOTING/REVEAL
  const [myVote, setMyVote] = useState<string | null>(null);
  const [votes, setVotes] = useState<{ [player: string]: number }>({});
  const [votesRevealed, setVotesRevealed] = useState(false);
  const [imposterName, setImposterName] = useState<string | null>(null);
  const [revealWord, setRevealWord] = useState<string | null>(null);
  const [revealImposterWord, setRevealImposterWord] = useState<string | null>(null);

  useEffect(() => {
    socket.on("playerList", (playerNames: string[]) => {
      setPlayers(playerNames);
      setIsHost(playerNames[0] === name);
    });

    socket.on("gameStarted", (data: { word: string; isImposter: boolean }) => {
      setMyWord(data.word);
      setIsImposter(data.isImposter);
      setGameStarted(true);
      setIsVoting(false);
      setDiscussionSeconds(120); // 2 min discussion
      setMyVote(null);
      setVotes({});
      setVotesRevealed(false);
      setImposterName(null);
      setRevealWord(null);
      setRevealImposterWord(null);
    });

    socket.on("startVoting", () => {
      setIsVoting(true);
      setDiscussionSeconds(null);
      setMyVote(null);
      setVotes({});
      setVotesRevealed(false);
      setImposterName(null);
      setRevealWord(null);
      setRevealImposterWord(null);
    });

    socket.on("revealVotes", (data: { votes: { [player: string]: number }, imposter: string, word: string, imposterWord: string }) => {
      setVotes(data.votes);
      setImposterName(data.imposter);
      setRevealWord(data.word);
      setRevealImposterWord(data.imposterWord);
      setVotesRevealed(true);
    });

    socket.on("backToLobby", () => {
    setGameStarted(false);
    setIsVoting(false);
    setMyWord(null);
    setIsImposter(false);
    setDiscussionSeconds(null);
    setVotes({});
    setVotesRevealed(false);
    setImposterName(null);
    setRevealWord(null);
    setRevealImposterWord(null);
    setMyVote(null);
  });


    return () => {
      socket.off("playerList");
      socket.off("gameStarted");
      socket.off("startVoting");
      socket.off("revealVotes");
      socket.off("backToLobby");

    };
  }, [name]);

  useEffect(() => {
    if (discussionSeconds === null || isVoting) return;
    if (discussionSeconds === 0) {
      if (isHost && roomCode) {
        socket.emit("startVoting", roomCode);
      }
      return;
    }
    const t = setTimeout(() => setDiscussionSeconds((s) => (s ? s - 1 : 0)), 1000);
    return () => clearTimeout(t);
  }, [discussionSeconds, isVoting, isHost, roomCode]);

  const handleCreate = () => {
    if (!name) return alert("Enter your name!");
    socket.emit("createRoom", name, (data: { code: string }) => {
      setRoomCode(data.code);
    });
    setNameEntered(true);
  };

  const handleJoin = () => {
    if (!name) return alert("Enter your name!");
    socket.emit(
      "joinRoom",
      { code: inputCode, name },
      (resp: { success: boolean; code?: string; message?: string }) => {
        if (resp.success) setRoomCode(resp.code!);
        else alert(resp.message);
      }
    );
    setNameEntered(true);
  };

  const handleStartGame = () => {
    if (!roomCode) return;
    socket.emit("startGame", roomCode, (resp: { success: boolean; message?: string }) => {
      if (!resp.success) alert(resp.message);
    });
  };

  return !nameEntered ? (
    <div>
      <h1>Imposter Word Game</h1>
      <input
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={20}
      />
      <br />
      <button onClick={() => setNameEntered(true)} disabled={!name}>
        Continue
      </button>
    </div>
  ) : roomCode ? (
    <div>
      <h1>Room: {roomCode}</h1>
      <p>Share this code with your friends!</p>
      <h2>Players:</h2>
      <ul>
        {players.map((player) => (
          <li key={player}>{player}</li>
        ))}
      </ul>
      {!gameStarted && isHost && (
        <button onClick={handleStartGame}>Start Game</button>
      )}
      {gameStarted && !isVoting && (
        <div>
          <h2>Your word:</h2>
          <p>
            <strong>
              {myWord}
              {isImposter ? " (You are the IMPOSTER!)" : ""}
            </strong>
          </p>
          <h3>
            Discussion Time:{" "}
            {discussionSeconds !== null
              ? `${Math.floor(discussionSeconds / 60)}:${String(
                  discussionSeconds % 60
                ).padStart(2, "0")}`
              : ""}
          </h3>
          {isHost && (
            <button
              onClick={() => socket.emit("startVoting", roomCode)}
              disabled={discussionSeconds === 0}
            >
              End Discussion Early
            </button>
          )}
        </div>
      )}
      {isVoting && !votesRevealed && (
        <div>
          <h2>Voting Phase!</h2>
          <p>Select who you think is the imposter:</p>
          <ul>
            {players
              .filter((p) => p !== name)
              .map((p) => (
                <li key={p}>
                  <button
                    onClick={() => {
                      setMyVote(p);
                      socket.emit("vote", { roomCode, votedFor: p, voter: name });
                    }}
                    disabled={!!myVote}
                  >
                    {p}
                  </button>
                </li>
              ))}
          </ul>
          {myVote && <p>You voted for: <b>{myVote}</b></p>}
          {!myVote && <p>Waiting for your vote...</p>}
        </div>
      )}
      {isVoting && votesRevealed && (
        <div>
          <h2>Results!</h2>
          <ul>
            {Object.entries(votes).map(([player, count]) => (
              <li key={player}>
                {player}: {count} vote{count !== 1 ? "s" : ""}
              </li>
            ))}
          </ul>
          <p>
            <b>The imposter was: {imposterName}</b>
          </p>
          <p>
            Regular word: <b>{revealWord}</b> <br />
            Imposter word: <b>{revealImposterWord}</b>
          </p>
          {imposterName &&
            (votes[imposterName || ""] === Math.max(...Object.values(votes))
              ? <p style={{ color: "green" }}>🎉 The group found the imposter!</p>
              : <p style={{ color: "red" }}>😈 The imposter got away!</p>
            )}
        </div>
      )}
      {isHost && votesRevealed && (
  <>
    <button onClick={() => socket.emit("playAgain", roomCode)}>
      Play Again
    </button>
    <button onClick={() => socket.emit("backToLobby", roomCode)}>
      Back to Lobby
    </button>
  </>
)}
    </div>
  ) : (
    <div>
      <h1>Imposter Word Game</h1>
      <button onClick={handleCreate} disabled={!name}>
        Create Room
      </button>
      <hr />
      <input
        placeholder="Enter room code"
        value={inputCode}
        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
        maxLength={5}
      />
      <button onClick={handleJoin} disabled={!name || !inputCode}>
        Join Room
      </button>
    </div>
  );
}

export default App;