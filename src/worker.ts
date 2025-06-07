function do_sort(array: Float64Array, teams: number): Promise<Float64Array> {
    return new Promise(async (resolve, reject) => {
        try {
            console.log("Starting ColleSort worker with array:", array);
            const { run_collesort } = await import("../pkg/collesort_web.js");
            if (!run_collesort) {
                console.error("ColleSort function not found in the module.");
                reject(new Error("ColleSort function not found"));
                return;
            }
            console.log("ColleSort module loaded successfully.");

            let res = await run_collesort(Float64Array.from(array), teams);
            console.log("ColleSort completed, result:", res);
            resolve(new Float64Array(res));
        } catch (error) {
            console.error("Error during ColleSort execution:", error);
            reject(error);
            return;
        }
    });
}

self.onmessage = async (event) => {
    const { data } = event;
    if (data.type === "run_collesort") {
        console.log("Worker received data:", data);
        postMessage({ type: "status", message: "Processing data..." });
        const result = do_sort(new Float64Array(data.array), data.teams);
        result.then(sortedArray => {
            console.log("Worker sorted array:", sortedArray);
            postMessage({ type: "result", result: sortedArray });
        }).catch(error => {
            console.error("Worker encountered an error:", error);
            postMessage({ type: "error", message: error.message });
        });
        postMessage({ type: "status", message: "Starting ColleSort..." });
    }
    else {
        console.error("Worker received unknown message type:", data.type);
    }
}

