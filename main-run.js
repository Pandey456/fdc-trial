const { main: runFdc } = require("./fdc-run.js");

async function main() {
  const token = process.env.TOKEN;
  const startTime = Number(process.env.START_TIME);
  const deadline = Number(process.env.DEADLINE);

  if (!token) {
    throw new Error("TOKEN is missing");
  }

  if (!startTime || Number.isNaN(startTime)) {
    throw new Error("START_TIME is invalid");
  }

  if (!deadline || Number.isNaN(deadline)) {
    throw new Error("DEADLINE is invalid");
  }

  console.log("");
  console.log("==========================================");
  console.log("           VEYNT MAIN RUNNER");
  console.log("==========================================");

  console.log("Token:", token);

  console.log("Start:", new Date(startTime).toISOString());

  console.log("Deadline:", new Date(deadline).toISOString());

  console.log("");
  console.log("Triggering FDC...");
  console.log("");

  const proofData = await runFdc({
    token,
    startTime,
    deadline,
  });

  console.log("");
  console.log("==========================================");
  console.log("          FDC RETURNED TO MAIN");
  console.log("==========================================");

  console.log(JSON.stringify(proofData, null, 2));

  console.log("");
  console.log("MAIN RUN COMPLETE");
}

main().catch((error) => {
  console.error("");
  console.error("==========================================");
  console.error("              MAIN RUN FAILED");
  console.error("==========================================");

  console.error(error);

  process.exit(1);
});
