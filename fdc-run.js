const { createPublicClient, createWalletClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");

// ============================================================
// CONFIG
// ============================================================

const RPC_URL = "https://coston2-api.flare.network/ext/C/rpc";

const VERIFIER_URL =
  "https://fdc-verifiers-testnet.flare.network/verifier/web2/Web2Json/prepareRequest";

const API_KEY = "00000000-0000-0000-0000-000000000000";

const REGISTRY = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";

const DA_LAYER_URL =
  "https://ctn2-data-availability.flare.network/api/v1/fdc/proof-by-request-round";

// ============================================================
// SUPPORTED TOKENS
// ============================================================

const TOKEN_SYMBOLS = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  BNB: "BNBUSDT",
  XRP: "XRPUSDT",
  ADA: "ADAUSDT",
  AVAX: "AVAXUSDT",
  LINK: "LINKUSDT",
  DOGE: "DOGEUSDT",
};

// ============================================================
// CLIENTS
// ============================================================

const account = privateKeyToAccount(process.env.PRIVATE_KEY);

const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  transport: http(RPC_URL),
});

// ============================================================
// HELPERS
// ============================================================

function toBytes32(text) {
  return "0x" + Buffer.from(text).toString("hex").padEnd(64, "0");
}

// ============================================================
// STEP 1
// ============================================================

async function prepareRequest({ token, startTime, deadline }) {
  const symbol = TOKEN_SYMBOLS[token];

  if (!symbol) {
    throw new Error(`Unsupported token: ${token}`);
  }

  console.log("");
  console.log("==========================================");
  console.log("STEP 1 — PREPARING FDC REQUEST");
  console.log("==========================================");

  console.log("Token:", token);
  console.log("Binance symbol:", symbol);

  console.log("Start:", new Date(startTime).toISOString());

  console.log("Deadline:", new Date(deadline).toISOString());

  const requestBody = {
    url: "https://data-api.binance.vision/api/v3/klines",

    httpMethod: "GET",

    headers: "{}",

    queryParams: JSON.stringify({
      symbol: symbol,
      interval: "1m",

      // CURRENT TEST:
      // We only fetch the candle at deadline.
      startTime: deadline,

      limit: "1",
    }),

    body: "{}",

    postProcessJq:
      '{ price: ((.[0][4] | tonumber) * 100000000 | tostring | split(".")[0] | tonumber) }',

    abiSignature: JSON.stringify({
      type: "tuple",
      components: [
        {
          name: "price",
          type: "uint256",
        },
      ],
    }),
  };

  console.log("");
  console.log("Request body:");
  console.log(JSON.stringify(requestBody, null, 2));

  const body = {
    attestationType: toBytes32("Web2Json"),

    sourceId: toBytes32("PublicWeb2"),

    requestBody,
  };

  const res = await fetch(VERIFIER_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",

      "X-API-KEY": API_KEY,
    },

    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.status !== "VALID") {
    throw new Error("prepareRequest failed: " + JSON.stringify(data));
  }

  console.log("");
  console.log("Step 1 OK — abiEncodedRequest ready");

  console.log("abiEncodedRequest:", data.abiEncodedRequest);

  return data.abiEncodedRequest;
}

// ============================================================
// STEP 2
// ============================================================

async function submitRequest(abiEncodedRequest) {
  console.log("");
  console.log("==========================================");
  console.log("STEP 2 — SUBMITTING FDC REQUEST");
  console.log("==========================================");

  const registryAbi = [
    {
      type: "function",

      name: "getContractAddressByName",

      stateMutability: "view",

      inputs: [
        {
          type: "string",
        },
      ],

      outputs: [
        {
          type: "address",
        },
      ],
    },
  ];

  const readAddr = (name) =>
    publicClient.readContract({
      address: REGISTRY,

      abi: registryAbi,

      functionName: "getContractAddressByName",

      args: [name],
    });

  const fdcHubAddr = await readAddr("FdcHub");

  const feeConfigAddr = await readAddr("FdcRequestFeeConfigurations");

  const fsmAddr = await readAddr("FlareSystemsManager");

  console.log("FdcHub:", fdcHubAddr);

  const fee = await publicClient.readContract({
    address: feeConfigAddr,

    abi: [
      {
        type: "function",

        name: "getRequestFee",

        stateMutability: "view",

        inputs: [
          {
            type: "bytes",
          },
        ],

        outputs: [
          {
            type: "uint256",
          },
        ],
      },
    ],

    functionName: "getRequestFee",

    args: [abiEncodedRequest],
  });

  console.log("Fee (wei):", fee.toString());

  const txHash = await walletClient.writeContract({
    address: fdcHubAddr,

    abi: [
      {
        type: "function",

        name: "requestAttestation",

        stateMutability: "payable",

        inputs: [
          {
            type: "bytes",
          },
        ],

        outputs: [],
      },
    ],

    functionName: "requestAttestation",

    args: [abiEncodedRequest],

    value: fee,
  });

  console.log("Submitted, tx:", txHash);

  await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  const roundId = await publicClient.readContract({
    address: fsmAddr,

    abi: [
      {
        type: "function",

        name: "getCurrentVotingEpochId",

        stateMutability: "view",

        inputs: [],

        outputs: [
          {
            type: "uint32",
          },
        ],
      },
    ],

    functionName: "getCurrentVotingEpochId",
  });

  console.log("Step 2 OK — round:", roundId.toString());

  return Number(roundId);
}

// ============================================================
// STEP 3
// ============================================================

async function waitForFinalization(seconds = 180) {
  console.log("");
  console.log("==========================================");
  console.log("STEP 3 — WAITING FOR FINALIZATION");
  console.log("==========================================");

  console.log(`Waiting ${seconds} seconds...`);

  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));

  console.log("Step 3 OK — finalized");
}

// ============================================================
// STEP 4
// ============================================================

async function getProof(roundId, abiEncodedRequest) {
  console.log("");
  console.log("==========================================");
  console.log("STEP 4 — GETTING FDC PROOF");
  console.log("==========================================");

  const res = await fetch(DA_LAYER_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",

      "X-API-KEY": API_KEY,
    },

    body: JSON.stringify({
      votingRoundId: roundId,

      requestBytes: abiEncodedRequest,
    }),
  });

  const data = await res.json();

  console.log("DA layer status:", res.status);

  console.log("");
  console.log("FDC response:");

  console.log(JSON.stringify(data, null, 2));

  if (!data || !data.proof) {
    throw new Error("No proof found");
  }

  console.log("");
  console.log("Step 4 OK — proof received");

  return data;
}

// ============================================================
// MAIN
// ============================================================

async function main({ token, startTime, deadline }) {
  token = token.toUpperCase();

  console.log("");
  console.log("==========================================");
  console.log("              VEYNT FDC");
  console.log("==========================================");

  console.log("TOKEN:", token);

  console.log("START:", new Date(startTime).toISOString());

  console.log("DEADLINE:", new Date(deadline).toISOString());

  // STEP 1
  const abiEncodedRequest = await prepareRequest({
    token,
    startTime,
    deadline,
  });

  // STEP 2
  const roundId = await submitRequest(abiEncodedRequest);

  // STEP 3
  await waitForFinalization(180);

  // STEP 4
  const proof = await getProof(roundId, abiEncodedRequest);

  // ========================================================
  // PRICE
  // ========================================================

  /*
   * For now we return the complete proof.
   *
   * Once we confirm the exact response structure,
   * we can decode the attested price directly here.
   */

  console.log("");
  console.log("==========================================");
  console.log("              FDC COMPLETE");
  console.log("==========================================");

  console.log("Token:", token);

  console.log("Deadline:", new Date(deadline).toISOString());

  console.log("");
  console.log("FDC proof received successfully.");

  return proof;
}

module.exports = {
  main,
};
