const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Deploy KYC contract
  const KYC = await ethers.getContractFactory("KYCRegistry_FarisAli");
  const kyc = await KYC.deploy();
  await kyc.waitForDeployment();
  console.log("KYCRegistry_FarisAli deployed to:", await kyc.getAddress());

  // Deploy Crowdfunding contract (pass KYC address)
  const Crowdfunding = await ethers.getContractFactory("Crowdfunding_FarisAli");
  const crowdfunding = await Crowdfunding.deploy(await kyc.getAddress());
  await crowdfunding.waitForDeployment();
  console.log("Crowdfunding_FarisAli deployed to:", await crowdfunding.getAddress());

  // ---- Copy ABI + addresses to React frontend ----
  const frontendDir = path.join(__dirname, "../../user-interface/src/contracts");

  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  // Save addresses
  const addresses = {
    KYCRegistry_FarisAli: await kyc.getAddress(),
    Crowdfunding_FarisAli: await crowdfunding.getAddress(),
  };
  fs.writeFileSync(
    path.join(frontendDir, "contract-address.json"),
    JSON.stringify(addresses, null, 2)
  );

  // Save ABIs
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");
  const abisDir = path.join(frontendDir, "abis");
  if (!fs.existsSync(abisDir)) {
    fs.mkdirSync(abisDir, { recursive: true });
  }

  const kycArtifact = require(path.join(
    artifactsDir,
    "KYCRegistry_FarisAli.sol/KYCRegistry_FarisAli.json"
  ));
  const crowdfundingArtifact = require(path.join(
    artifactsDir,
    "Crowdfunding_FarisAli.sol/Crowdfunding_FarisAli.json"
  ));

  fs.writeFileSync(
    path.join(abisDir, "KYCRegistry_FarisAli.json"),
    JSON.stringify(kycArtifact.abi, null, 2)
  );
  fs.writeFileSync(
    path.join(abisDir, "Crowdfunding_FarisAli.json"),
    JSON.stringify(crowdfundingArtifact.abi, null, 2)
  );

  console.log("✅ ABIs & addresses copied to frontend!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
