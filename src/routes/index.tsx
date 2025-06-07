import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import ColleWorker from "../worker.ts?worker";
import { useState } from "react";
import {
  createFormHookContexts,
  useForm,
  type AnyFieldApi,
} from "@tanstack/react-form";
import ReactTimeAgo from "react-time-ago";

export const Route = createFileRoute("/")({
  component: Index,
});

interface Time {
  id: number;
  players: number[];
}

interface ColleSortResult {
  teams: Time[];
}

async function runCollesort(
  array: Player[],
  teams: number
): Promise<ColleSortResult> {
  // Make the scores unique to avoid issues with sorting
  const uniqueScores = new Set(array.map((p) => p.score));
  if (uniqueScores.size < teams) {
    throw new Error(
      `Not enough unique scores to form ${teams} teams. Please add more players or adjust scores.`
    );
  }

  const sortResult = await new Promise<Float64Array>((resolve, reject) => {
    console.log("Starting ColleSort worker with array:", array);
    if (!window.Worker) {
      console.error("Web Workers are not supported in this environment.");
      reject(new Error("Web Workers are not supported"));
      return;
    }
    /// @ts-expect-error
    if (window.worker) {
      /// @ts-expect-error
      window.worker.terminate();
    }
    const worker = new ColleWorker();
    /// @ts-expect-error
    window.worker = worker; // Expose worker for debugging
    worker.onmessage = (event) => {
      const { data } = event;
      if (data.type === "result") {
        resolve(data.result);
      } else if (data.type === "status") {
        console.log("Worker status:", data.message);
      } else if (data.type === "error") {
        console.error("Worker error:", data.message);
        reject(new Error(data.message));
      }
    };
    worker.onerror = (error) => {
      reject(error);
    };
    console.log("Sending array to worker:", array);
    worker.postMessage({
      type: "run_collesort",
      array: new Float64Array(array.map((p) => p.score)),
      teams: teams,
    });
  });

  console.log("ColleSort result:", sortResult);

  // Convert the result back to the original Player structure
  // First get the sorted scores and cut them into n subarrays
  const sortedScores = Array.from(sortResult);
  const teamSize = Math.floor(sortedScores.length / teams);
  const teamsArray: number[][] = [];
  for (let t = 0; t < teams; t++) {
    const start = t * teamSize;
    const time = sortedScores.slice(start, start + teamSize);
    teamsArray.push(time);
  }
  // Now map the scores back to players
  const playerMap = new Map(array.map((p) => [p.score, p.id]));
  const sortedTeams: Time[] = teamsArray.map((playerScores, index) => ({
    id: index + 1, // Team IDs start from 1
    players: playerScores.map((score) => {
      const playerId = playerMap.get(score);
      if (playerId === undefined) {
        console.warn(`Player with score ${score} not found.`);
        return -1; // Use -1 for unknown players
      }
      return playerId;
    }),
  }));
  return { teams: sortedTeams };
}

interface Player {
  id: number;
  name: string;
  score: number;
}

function Index() {
  const [teams, setTeams] = useState(4); // Default number of teams

  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);

  const [timerStart, setTimerStart] = useState<number | null>(null);

  const sortMutation = useMutation({
    mutationFn: async () => {
      setTimerStart(Date.now());
      const result = await runCollesort(
        selectedPlayers.map((id) => {
          const player = players.find((p) => p.id === id);
          if (!player) {
            console.warn(`Player with ID ${id} not found.`);
            throw new Error(`Player with ID ${id} not found.`);
          }
          return player;
        }),
        teams
      );
      console.log("Sorting result:", result);
      return result;
    },
    onError: (error) => {
      console.error("Error during sorting:", error);
    },
    onSuccess: () => {
      console.log("Sorting completed successfully!");
    },
  });
  function isPlayerSelected(playerId: number): boolean {
    return selectedPlayers.includes(playerId);
  }

  function hasPlayerWithScore(score: number): boolean {
    return players.some((player) => player.score === score);
  }

  function togglePlayerSelection(playerId: number) {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  }

  return (
    <div className="p-2">
      <h1 className="text-2xl font-bold mb-4">ColleSort Web</h1>

      <div>
        <h4> Player List</h4>
        <div className="flex flex-col items-start space-y-2">
          <AddPlayerForm
            onAddPlayer={(player) => {
              while (hasPlayerWithScore(player.score)) {
                // Adjust the score slightly to make it unique
                player.score += Math.random() * 0.001; // Adjust by a small random value
              }
              setPlayers((prev) => [...prev, player]);
              setSelectedPlayers((prev) => [...prev, player.id]);
            }}
          />
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            onClick={() => {
              // Trigger file input click to load CSV
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".csv";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const text = event.target?.result as string;
                    const lines = text.split("\n").map((line) => line.trim());
                    const newPlayers: Player[] = lines
                      .filter((line) => line.trim())
                      .map((line, index) => {
                        const [name, score] = line.split(",");
                        console.log(`Parsing line ${index + 1}:`, line);
                        if (!name || !score) {
                          console.warn(
                            `Invalid line format at line ${index + 1}:`,
                            line
                          );
                          throw new Error(
                            `Invalid line format at line ${index + 1}: ${line}`
                          );
                        }
                        return {
                          id: Date.now() + index, // Simple ID generation
                          name: name.trim(),
                          score: parseFloat(score.trim()),
                        };
                      });
                    // Check for deduplicate scores, adding a small offset if needed
                    const uniqueScores = new Set<number>();
                    const deduplicatedPlayers = newPlayers.map((player) => {
                      let score = player.score;
                      while (
                        uniqueScores.has(score) ||
                        hasPlayerWithScore(score)
                      ) {
                        // Randomly adjust the score slightly to make it unique
                        score += Math.random() * 0.001; // Adjust by a small random value
                      }
                      uniqueScores.add(score);
                      return { ...player, score };
                    });
                    // Check if any player with the same score already exists
                    setPlayers((prev) => [...prev, ...deduplicatedPlayers]);
                  };
                  reader.readAsText(file);
                }
              };
              input.click();
            }}
          >
            Load CSV
          </button>
        </div>

        <ul className="mt-2 max-h-60 overflow-y-auto bg-gray-300 p-2 rounded">
          <h4 className="font-semibold mb-2">Select Players</h4>
          {players.map((player) => (
            <li
              key={player.id}
              className={`p-2 border rounded mb-2 cursor-pointer ${
                isPlayerSelected(player.id)
                  ? "bg-blue-200 border-blue-500"
                  : "bg-white border-gray-300"
              }`}
              onClick={() => {
                togglePlayerSelection(player.id);
              }}
            >
              {player.name} - Score: {player.score.toFixed(2)}{" "}
            </li>
          ))}
          {players.length === 0 && (
            <li className="text-gray-500">No players added yet.</li>
          )}
        </ul>
      </div>

      <div className="mt-4 flex items-center">
        <button
          className="inline-block px-4 py-2 bg-green-500 text-white rounded hover:bg-blue-600 transition-colors mx-1 disabled:opacity-50 hover:disabled:bg-green-500"
          onClick={() => sortMutation.mutate()}
          disabled={
            !(
              selectedPlayers.length >= teams &&
              selectedPlayers.length % teams === 0 &&
              !sortMutation.isPending
            )
          }
        >
          Start Sorting!
        </button>
        <select
          className="ml-2 p-2 border rounded mx-1"
          value={teams}
          onChange={(e) => setTeams(Number(e.target.value))}
        >
          <option value={2}>2 Teams</option>
          <option value={3}>3 Teams</option>
          <option value={4}>4 Teams</option>
        </select>
        <div className="ml-4">
          <small>{selectedPlayers.length} jogadores selecionados</small>
          <br />
          <small>
            {selectedPlayers.length < teams
              ? "Selecione mais jogadores para completar os times."
              : selectedPlayers.length % teams === 0
              ? "Todos os times estão completos!"
              : `Os times não estão balanceados. A quantidade de jogadores selecionados (${selectedPlayers.length}) não é divisível por ${teams}.`}
          </small>
        </div>
      </div>
      <div className="mt-4">
        {sortMutation.isPending && (
          <>
            <p className="mt-2 text-gray-500">Sorting in progress...</p>
            <ReactTimeAgo
              date={timerStart || Date.now()}
              className="text-sm text-gray-500"
              timeStyle={"mini"}
            />
          </>
        )}
        {sortMutation.isSuccess && (
          <p className="mt-2 text-green-500">Sorting completed successfully!</p>
        )}
        {sortMutation.isError && (
          <p className="mt-2 text-red-500">An error occurred during sorting.</p>
        )}
      </div>
      {sortMutation.isSuccess && sortMutation.data ? (
        <div className="mt-4 flex flex-col space-y-4">
          <h2 className="text-xl font-bold mb-2">Sorted Teams</h2>
          <div className="bg-gray-100 p-4 rounded shadow flex flex-row space-x-4">
            {sortMutation.data.teams.map((team) => (
              <div
                key={team.id}
                className="mb-4 p-4 border rounded bg-white shadow"
              >
                <h3 className="font-semibold">Team {team.id}</h3>
                <small className="text-gray-500">
                  μ ={" "}
                  {(
                    team.players.reduce((acc, playerId) => {
                      const player = players.find((p) => p.id === playerId);
                      return player ? acc + player.score : acc;
                    }, 0) / team.players.length
                  ).toFixed(2)}{" "}
                  | σ ={" "}
                  {Math.sqrt(
                    team.players.reduce((acc, playerId) => {
                      const player = players.find((p) => p.id === playerId);
                      if (!player) return acc;
                      const mean =
                        team.players.reduce((sum, id) => {
                          const p = players.find((p) => p.id === id);
                          return p ? sum + p.score : sum;
                        }, 0) / team.players.length;
                      return acc + Math.pow(player.score - mean, 2);
                    }, 0) / team.players.length
                  ).toFixed(2)}
                </small>
                <ul className="list-disc pl-5">
                  {team.players.map((playerId) => {
                    const player = players.find((p) => p.id === playerId);
                    return (
                      <li key={playerId}>
                        {player
                          ? `${player.name} - Score: ${player.score.toFixed(2)}`
                          : "Unknown Player"}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {field.state.meta.isTouched && !field.state.meta.isValid ? (
        <em>{field.state.meta.errors.join(",")}</em>
      ) : null}
      {field.state.meta.isValidating ? "Validating..." : null}
    </>
  );
}

function AddPlayerForm({
  onAddPlayer,
}: {
  onAddPlayer: (player: Player) => void;
}) {
  const form = useForm({
    defaultValues: {
      nome: "",
      score: 0,
    },
    onSubmit: ({ value }) => {
      const newPlayer: Player = {
        id: Date.now(), // Simple ID generation based on timestamp
        name: value.nome,
        score: value.score,
      };
      onAddPlayer(newPlayer);
      form.reset();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="mb-4"
    >
      <div className="flex-1 flex flex-row space-y-2">
        <form.Field
          name="nome"
          validators={{
            onChange: ({ value }) => {
              if (value.trim() === "") {
                return "Player name is required";
              }
              return undefined;
            },
          }}
          children={(field) => {
            return (
              <div className="mb-2">
                <label className="block mb-1">Player Name</label>
                <input
                  type="text"
                  className="p-2 border rounded w-full"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldInfo field={field} />
              </div>
            );
          }}
        />

        <form.Field
          name="score"
          validators={{
            onChange: ({ value }) => {
              const score = Number(value);
              if (isNaN(score) || score <= 0) {
                return "Score must be a positive number";
              }
              return undefined;
            },
          }}
          children={(field) => {
            return (
              <div className="mb-2">
                <label className="block mb-1">Player Score</label>
                <input
                  type="number"
                  className="p-2 border rounded w-full"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(+e.target.value)}
                />
                <FieldInfo field={field} />
              </div>
            );
          }}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mx-1 my-5"
        >
          Add Player
        </button>
      </div>
    </form>
  );
}
