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

  // ==========================================================
  // TRIGGER FDC
  // ==========================================================

  const proofData = await runFdc({
    token,
    startTime,
    deadline,
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

  const [{ price: verifiedPrice }] = decodeAbiParameters(
    parseAbiParameters("(uint256 price)"),
    abiEncodedData,
  );

  // ==========================================================
  // PRINT VERIFIED PRICE
  // ==========================================================

  console.log("");
  console.log("==========================================");
  console.log("             FDC RESULT");
  console.log("==========================================");

  console.log("Token:", token);

  console.log("Verified price (raw):", verifiedPrice.toString());

  console.log("Verified price:", Number(verifiedPrice) / 100000000);

  console.log("==========================================");

  console.log("");
  console.log("MAIN RUN COMPLETE");

  return verifiedPrice;
}

main().catch((error) => {
  console.error("");
  console.error("==========================================");
  console.error("              MAIN RUN FAILED");
  console.error("==========================================");

  console.error(error);

  process.exit(1);
});
