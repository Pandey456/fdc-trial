const VERIFIER = "https://fdc-verifiers-testnet.flare.network/verifier/web2/Web2Json/prepareRequest";
const API_KEY = "00000000-0000-0000-0000-000000000000";

const toBytes32 = (s) => "0x" + Buffer.from(s).toString("hex").padEnd(64, "0");

// ---------------------------------------------------------------------------
// ACTIVE: CoinGecko. Shape: {"bitcoin":{"usd":63843.69}} — price is a NUMBER.
// ---------------------------------------------------------------------------
// const requestBody = {
//   url: "https://api.coinbase.com/v2/prices/BTC-USD/spot",
//   httpMethod: "GET",
//   headers: "{}",
//   queryParams: "{}",
//   body: "{}",
//   postProcessJq: "{ price: ((.data.amount | tonumber) * 100000000 | tostring | split(\".\")[0] | tonumber) }",
//   abiSignature: JSON.stringify({
//     type: "tuple",
//     components: [{ name: "price", type: "uint256" }],
//   }),
// };
const tokenPairs = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD",
};

const selectedToken = "BTC";

const requestBody = {
  url: `https://api.coinbase.com/v2/prices/${tokenPairs[selectedToken]}/spot`,
  httpMethod: "GET",
  headers: "{}",
  queryParams: "{}",
  body: "{}",

  postProcessJq:
    "{ price: ((.data.amount | tonumber) * 100000000 | tostring | split(\".\")[0] | tonumber) }",

  abiSignature: JSON.stringify({
    type: "tuple",
    components: [{ name: "price", type: "uint256" }],
  }),
};

// ---------------------------------------------------------------------------
// FALLBACK: Binance market-data mirror. Shape: {"symbol":..,"price":"63843.69000000"}
// If CoinGecko FETCH ERRORs, comment out the block above and uncomment this one.
// ---------------------------------------------------------------------------
// const requestBody = {
//   url: "https://data-api.binance.vision/api/v3/ticker/price",
//   httpMethod: "GET",
//   headers: "{}",
//   queryParams: JSON.stringify({ symbol: "BTCUSDT" }),
//   body: "{}",
//   // price is a STRING with 8 decimals -> delete the dot -> already *1e8 integer
//   postProcessJq: "{ price: (.price | gsub(\"[.]\"; \"\") | tonumber) }",
//   abiSignature: JSON.stringify({
//     type: "tuple",
//     components: [{ name: "price", type: "uint256" }],
//   }),
// };

const body = {
  attestationType: toBytes32("Web2Json"),
  sourceId: toBytes32("PublicWeb2"),
  requestBody,
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
