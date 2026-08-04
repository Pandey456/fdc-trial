const VERIFIER = "https://fdc-verifiers-testnet.flare.network/verifier/web2/Web2Json/prepareRequest";
const API_KEY = "00000000-0000-0000-0000-000000000000";

const toBytes32 = (s) => "0x" + Buffer.from(s).toString("hex").padEnd(64, "0");

const body = {
  attestationType: toBytes32("Web2Json"),
  sourceId: toBytes32("PublicWeb2"),
  requestBody: {
    url: "https://api.binance.com/api/v3/ticker/price",
    httpMethod: "GET",
    headers: "{}",
    queryParams: JSON.stringify({ symbol: "BTCUSDT" }),
    body: "{}",
    postProcessJq: "{ price: (.price | tonumber | . * 100000000 | floor) }",
    abiSignature: {
      type: "tuple",
      components: [{ name: "price", type: "uint256" }],
    },
  },
};

(async () => {
  console.log("POST", VERIFIER);
  console.log("BODY:", JSON.stringify(body, null, 2));
  try {
    const res = await fetch(VERIFIER, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
      body: JSON.stringify(body),
    });
    console.log("HTTP STATUS:", res.status);
    console.log("RESPONSE:", await res.text());
  } catch (e) {
    console.error("REQUEST FAILED:", e.message);
    process.exit(1);
  }
})();
