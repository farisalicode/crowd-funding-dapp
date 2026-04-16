import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

// ✅ Import contract info correctly (your deploy script writes _FarisAli suffix)
import contractAddresses from "./contracts/contract-address.json";
import kycAbi from "./contracts/abis/KYCRegistry_FarisAli.json";
import cfAbi from "./contracts/abis/Crowdfunding_FarisAli.json";

const FULL_NAME_TO_APPROVE = "Faris Ali";
const STUDENT_NAME = "Faris Ali";
const ROLL = "22I-0804";

function short(addr = "") {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function weiToEth(wei) {
  try {
    return Number(ethers.formatEther(wei)).toFixed(4);
  } catch {
    return "0.0000";
  }
}

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState("0.0");
  const [kycContract, setKycContract] = useState(null);
  const [cfContract, setCfContract] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState("Initializing...");

  const [kycName, setKycName] = useState("");
  const [kycCNIC, setKycCNIC] = useState("");
  const [requests, setRequests] = useState([]);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [goal, setGoal] = useState("");
  const [campaigns, setCampaigns] = useState([]);

  // 🔹 Ensure MetaMask on Hardhat Local
  async function switchToHardhatNetwork() {
    const HARDHAT_CHAIN_ID = "0x7A69"; // 31337
    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (chainId !== HARDHAT_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: HARDHAT_CHAIN_ID }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: HARDHAT_CHAIN_ID,
                  chainName: "Hardhat Local",
                  rpcUrls: ["http://127.0.0.1:8545"],
                  nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
                },
              ],
            });
          }
        }
      }
    } catch (err) {
      console.error("Network switch failed:", err);
    }
  }

  // 🔹 Initial Load
  useEffect(() => {
    if (!window.ethereum) {
      setStatus("MetaMask not detected — please install MetaMask");
      return;
    }
    switchToHardhatNetwork();

    const init = async () => {
      try {
        const p = new ethers.BrowserProvider(window.ethereum);
        setProvider(p);
        const accounts = await p.send("eth_accounts", []);
        if (accounts.length === 0) {
          setStatus("Please connect MetaMask");
          return;
        }

        const s = await p.getSigner();
        setSigner(s);
        const addr = await s.getAddress();
        setAccount(addr);
        const bal = await p.getBalance(addr);
        setBalance(weiToEth(bal));

        // ✅ FIX: use correct key names
        const kycAddr = contractAddresses.KYCRegistry_FarisAli;
        const cfAddr = contractAddresses.Crowdfunding_FarisAli;

        console.log("📜 Loaded addresses:", { kycAddr, cfAddr });

        if (!kycAddr || !cfAddr) {
          setStatus("❌ Contract addresses not found — please redeploy.");
          return;
        }

        const kyc = new ethers.Contract(kycAddr, kycAbi, s);
        const cf = new ethers.Contract(cfAddr, cfAbi, s);
        setKycContract(kyc);
        setCfContract(cf);

        // Check admin
        const adminAddr = await kyc.admin();
        setIsAdmin(adminAddr.toLowerCase() === addr.toLowerCase());

        await loadKYCRequests(kyc);
        await loadCampaigns(cf);
        setStatus("✅ Connected to Hardhat Local!");
      } catch (err) {
        console.error(err);
        setStatus("Init error: " + (err.message || err.toString()));
      }
    };
    init();
  }, []);

  async function connectWallet() {
    try {
      await switchToHardhatNetwork();
      await window.ethereum.request({ method: "eth_requestAccounts" });
      window.location.reload();
    } catch (err) {
      setStatus("Connection error: " + err.message);
    }
  }

  // 🔹 Load KYC Requests
  async function loadKYCRequests(kyc) {
    try {
      const addrs = await kyc.getRequesters();
      const list = [];
      for (let a of addrs) {
        const k = await kyc.getKYC(a);
        list.push({
          address: a,
          fullName: k[0],
          cnic: k[1],
          status: Number(k[2]),
        });
      }
      setRequests(list);
    } catch (err) {
      console.error("loadKYCRequests", err);
    }
  }

  async function submitKYC() {
    if (!kycContract) return setStatus("KYC contract not loaded");
    try {
      const tx = await kycContract.submitKYC(kycName, kycCNIC);
      await tx.wait();
      await loadKYCRequests(kycContract);
      setStatus("✅ KYC submitted");
    } catch (err) {
      setStatus("Submit error: " + err.message);
    }
  }

  async function approveKYC(addr) {
    try {
      const tx = await kycContract.approveKYC(addr, FULL_NAME_TO_APPROVE);
      await tx.wait();
      await loadKYCRequests(kycContract);
      setStatus("Approved!");
    } catch (err) {
      setStatus("Approve error: " + err.message);
    }
  }

  async function loadCampaigns(cf) {
    try {
      const ids = await cf.getCampaignIds();
      const arr = [];
      for (let id of ids) {
        const c = await cf.getCampaign(id);
        arr.push({
          id: Number(c[0]),
          creator: c[1],
          title: c[2],
          description: c[3],
          goalWei: c[4],
          fundsRaisedWei: c[5],
          status: Number(c[6]),
        });
      }
      setCampaigns(arr);
    } catch (err) {
      console.error("loadCampaigns", err);
    }
  }

  async function createCampaign() {
    try {
      const tx = await cfContract.createCampaign(title, desc, ethers.parseEther(goal));
      await tx.wait();
      await loadCampaigns(cfContract);
      setStatus("✅ Campaign created!");
    } catch (err) {
      setStatus("Create error: " + err.message);
    }
  }

  async function contribute(id, amount) {
    try {
      const tx = await cfContract.contribute(id, { value: ethers.parseEther(amount) });
      await tx.wait();
      await loadCampaigns(cfContract);
      setStatus("✅ Contribution successful");
    } catch (err) {
      setStatus("Contribute error: " + err.message);
    }
  }

  async function withdraw(id) {
    try {
      const tx = await cfContract.withdraw(id);
      await tx.wait();
      await loadCampaigns(cfContract);
      setStatus("✅ Withdrawn");
    } catch (err) {
      setStatus("Withdraw error: " + err.message);
    }
  }

  // ---------------- UI ----------------
  return (
    <div style={{ padding: 20, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <h1>Decentralized Crowdfunding DApp</h1>
      <p>Developed by <b>{STUDENT_NAME}</b>, Roll: <b>{ROLL}</b></p>

      {!account ? (
        <button onClick={connectWallet}>Connect MetaMask</button>
      ) : (
        <div>
          <div>Account: {short(account)} — Balance: {balance} ETH</div>
          <div>Admin: {isAdmin ? "Yes" : "No"}</div>
        </div>
      )}

      <hr />
      <h3>Submit KYC</h3>
      <input placeholder="Full name" value={kycName} onChange={e => setKycName(e.target.value)} />
      <input placeholder="CNIC" value={kycCNIC} onChange={e => setKycCNIC(e.target.value)} />
      <button onClick={submitKYC}>Submit KYC</button>

      <hr />
      <h3>KYC Requests</h3>
      {requests.length === 0 ? (
        <div>No requests yet</div>
      ) : (
        requests.map(r => (
          <div key={r.address} style={{ border: "1px solid #ddd", margin: 5, padding: 8 }}>
            <div>{short(r.address)} — {r.fullName} ({r.cnic})</div>
            <div>Status: {["None", "Pending", "Approved", "Rejected"][r.status]}</div>
            {isAdmin && r.status === 1 && (
              <>
                <button onClick={() => approveKYC(r.address)}>Approve</button>
                <button onClick={async () => {
                  const tx = await kycContract.rejectKYC(r.address, "Rejected");
                  await tx.wait();
                  await loadKYCRequests(kycContract);
                }}>Reject</button>
              </>
            )}
          </div>
        ))
      )}

      <hr />
      <h3>Create Campaign</h3>
      <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
      <input placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
      <input placeholder="Goal (ETH)" value={goal} onChange={e => setGoal(e.target.value)} />
      <button onClick={createCampaign}>Create</button>

      <hr />
      <h3>Campaigns</h3>
      {campaigns.length === 0 ? <div>No campaigns yet</div> : campaigns.map(c => (
        <div key={c.id} style={{ border: "1px solid #ccc", padding: 10, margin: 6 }}>
          <b>{c.title}</b> — Goal: {weiToEth(c.goalWei)} ETH<br />
          Raised: {weiToEth(c.fundsRaisedWei)} ETH<br />
          Creator: {short(c.creator)}<br />
          Status: {["Active", "Completed", "Withdrawn"][c.status]}
          <div style={{ marginTop: 5 }}>
            <input id={"amt-" + c.id} placeholder="Amount (ETH)" />
            <button onClick={() => {
              const val = document.getElementById("amt-" + c.id).value;
              contribute(c.id, val);
            }}>Contribute</button>

            {c.status === 1 && account && account.toLowerCase() === c.creator.toLowerCase() && (
              <button onClick={() => withdraw(c.id)}>Withdraw</button>
            )}
          </div>
        </div>
      ))}

      <hr />
      <div><b>Status:</b> {status}</div>
    </div>
  );
}
