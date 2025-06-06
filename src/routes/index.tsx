import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="p-2">
      <h1 className="text-2xl font-bold mb-4">ColleSort Web</h1>
      <p>
        This is a web application for sorting collections using the ColleSort
        algorithm.
      </p>
      <p>
        The ColleSort algorithm is designed to efficiently find the best team
        division for a given set of players, ensuring that the teams are as
        balanced as possible based on their skill levels.
      </p>
      <a className="inline-block mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-blue-600 transition-colors">
        Start Sorting!
      </a>
    </div>
  );
}
