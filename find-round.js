const { ethers } = require("ethers");
const provider = new ethers.JsonRpcProvider("https://coston2-api.flare.network/ext/C/rpc");

// FlareContractRegistry — same address on every Flare network
const REGISTRY = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";
const REGISTRY_ABI = ["function getContractAddressByName(string) view returns (address)"];

const FSM_ABI = [
  "function getCurrentVotingEpochId() view returns (uint32)",
  "function firstVotingRoundStartTs() view returns (uint64)",
];

(async () => {
  const reg = new ethers.Contract(REGISTRY, REGISTRY_ABI, provider);
  const fsmAddr = await reg.getContractAddressByName("FlareSystemsManager");
  console.log("FlareSystemsManager:", fsmAddr);

  const fsm = new ethers.Contract(fsmAddr, FSM_ABI, provider);
  const current = await fsm.getCurrentVotingEpochId();
  const startTs = await fsm.firstVotingRoundStartTs();
  console.log("CURRENT round now:", current.toString());
  console.log("firstVotingRoundStartTs (REAL):", startTs.toString());

  // Your submit was at unix 1785833597. Real round:
  const yourRound = Math.floor((1785833597 - Number(startTs)) / 90);
  console.log("YOUR round (computed with real start):", yourRound);
})();
