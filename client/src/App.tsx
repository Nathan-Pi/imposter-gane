import React, { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";
const socket: Socket = io(SERVER_URL);

function App() {
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
  const [myVote, setMyVote] = useState<string | null>(null);
  const [votes, setVotes] = useState<{[player: string]: number}>({});
  const [votesRevealed, setVotesRevealed] = useState(false);

  // Listen for player list updates
  useEffect(() => {
    socket.on("playerList", (playerNames: string[]) => {
      setPlayers(playerNames);
    });

    return () => {
      socket.off("playerList");
    };
  }, []);

  useEffect(() => {
    socket.on("playerList", (playerNames: string[]) => {
      setPlayers(playerNames);
      // Host is the first player in the list
      setIsHost(playerNames[0] === name);
    });


    socket.on("gameStarted", (data: { word: string; isImposter: boolean }) => {
      setMyWord(data.word);
      setIsImposter(data.isImposter);
      setGameStarted(true);
      setIsVoting(false);
      setDiscussionSeconds(10); // 2 min discussion
    });

    socket.on("startVoting", () => {
    setIsVoting(true);
    setDiscussionSeconds(null);
  });



    return () => {
      socket.off("playerList");
      socket.off("gameStarted");
      socket.off("startVoting");
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


  // Handle create room
  const handleCreate = () => {
    if (!name) return alert("Enter your name!");
    socket.emit("createRoom", name, (data: { code: string }) => {
      setRoomCode(data.code);
    });
    setNameEntered(true);
  };

  // Handle join room
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

  if (!nameEntered) {
    return (
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
    );
  }

  if (roomCode) {
    return (
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
        {isVoting && (
          <div>
            {isVoting ? "yes" : "no"}
            <h2>Voting Phase!</h2>
            <p>
              Select who you think is the imposter.
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
          {player}: {count} votes
        </li>
      ))}
    </ul>
    <p>
      The imposter was:{" "}
      <b>
        {players.find((p) => /* logic to show imposter, see below */ false)}
      </b>
    </p>
    {/* Optionally: Add a "Play Again" button */}
  </div>
)}            </p>
          </div>
        )}
      </div>
    );
  }

  return (
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