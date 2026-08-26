const { decodeAbiParameters, parseAbiParameters } = require("viem");

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

  if (deadline <= startTime) {
    throw new Error("DEADLINE must be after START_TIME");
  }

  // ==========================================================
  // DETERMINE CANDLE INTERVAL
  // ==========================================================

  const durationMs = deadline - startTime;

  const durationMinutes = durationMs / (60 * 1000);

  const durationHours = durationMs / (60 * 60 * 1000);

  // Use 1-minute candles for markets up to 16 hours.
  // Use 1-hour candles for markets longer than 16 hours.

  const MAX_1M_DURATION = 16 * 60 * 60 * 1000;

  const interval = durationMs <= MAX_1M_DURATION ? "1m" : "1h";

  // ==========================================================
  // LOG
  // ==========================================================

  console.log("");
  console.log("==========================================");
  console.log("           VEYNT MAIN RUNNER");
  console.log("==========================================");

  console.log("Token:", token);

  console.log("Start:", new Date(startTime).toISOString());

  console.log("Deadline:", new Date(deadline).toISOString());

  console.log("");

  console.log("Duration (minutes):", durationMinutes);

  console.log("Duration (hours):", durationHours);

  console.log("");

  console.log("Selected interval:", interval);

  console.log("");

  // ==========================================================
  // TRIGGER FDC
  // ==========================================================

  console.log("Triggering FDC...");

  console.log("");

  const proofData = await runFdc({
    token,
    startTime,
    deadline,
    interval,
  });

  // ==========================================================
  // GET ABI ENCODED DATA
  // ==========================================================

  const abiEncodedData = proofData.response.responseBody.abiEncodedData;

  if (!abiEncodedData) {
    throw new Error("FDC response does not contain abiEncodedData.");
  }

  console.log("");
  console.log("==========================================");
  console.log("          FDC ABI DATA RECEIVED");
  console.log("==========================================");

  console.log("abiEncodedData:", abiEncodedData);

  // ==========================================================
  // DECODE FDC RESULT
  // ==========================================================

  // const [{ maxPrice, minPrice }] = decodeAbiParameters(
  //   parseAbiParameters("(uint256 maxPrice, uint256 minPrice)"),
  //   abiEncodedData,
  // );
  const [{ price: verifiedPrice }] = decodeAbiParameters(
    parseAbiParameters("(uint256 price)"),
    abiEncodedData,
  );

  // ==========================================================
  // PRINT VERIFIED PRICES
  // ==========================================================

  console.log("");
  console.log("==========================================");
  console.log("             FDC RESULT");
  console.log("==========================================");

  console.log("Token:", token);

  console.log("Interval:", interval);

  console.log("Start:", new Date(startTime).toISOString());

  console.log("Deadline:", new Date(deadline).toISOString());

  console.log("");

  console.log("Maximum price (raw):", maxPrice.toString());

  console.log("Minimum price (raw):", minPrice.toString());

  console.log("");

  console.log("Maximum price:", Number(maxPrice) / 100000000);

  console.log("Minimum price:", Number(minPrice) / 100000000);

  console.log("==========================================");
  console.log("");

  console.log("MAIN RUN COMPLETE");

  return {
    maxPrice,
    minPrice,
  };
}

main().catch((error) => {
  console.error("");

  console.error("==========================================");
  console.error("              MAIN RUN FAILED");
  console.error("==========================================");

  console.error(error);

  process.exit(1);
});
