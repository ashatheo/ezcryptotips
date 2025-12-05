const solc = require('solc');
const fs = require('fs');
const path = require('path');

console.log("🔨 Compiling HederaTipSplitter contract...\n");

// Read contract source
const contractPath = path.join(__dirname, '../contracts/HederaTipSplitter.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Prepare compiler input
const input = {
  language: 'Solidity',
  sources: {
    'HederaTipSplitter.sol': {
      content: source
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode']
      }
    }
  }
};

// Compile
console.log("⚙️  Compiling with Solidity 0.8.20...");
const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Check for errors
if (output.errors) {
  const errors = output.errors.filter(e => e.severity === 'error');
  if (errors.length > 0) {
    console.error("\n❌ Compilation errors:");
    errors.forEach(error => console.error(error.formattedMessage));
    process.exit(1);
  }

  // Show warnings
  const warnings = output.errors.filter(e => e.severity === 'warning');
  if (warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    warnings.forEach(warning => console.log(warning.formattedMessage));
  }
}

// Save artifacts
const contract = output.contracts['HederaTipSplitter.sol']['HederaTipSplitter'];

const artifactsDir = path.join(__dirname, '../artifacts/contracts/HederaTipSplitter.sol');
fs.mkdirSync(artifactsDir, { recursive: true });

const artifact = {
  _format: "hh-sol-artifact-1",
  contractName: "HederaTipSplitter",
  sourceName: "contracts/HederaTipSplitter.sol",
  abi: contract.abi,
  bytecode: contract.evm.bytecode.object,
  deployedBytecode: contract.evm.bytecode.object,
  linkReferences: {},
  deployedLinkReferences: {}
};

fs.writeFileSync(
  path.join(artifactsDir, 'HederaTipSplitter.json'),
  JSON.stringify(artifact, null, 2)
);

console.log("✅ Contract compiled successfully!");
console.log(`📁 Artifact saved to: ${artifactsDir}/HederaTipSplitter.json\n`);

// Show bytecode size
const bytecodeSize = contract.evm.bytecode.object.length / 2;
console.log(`📊 Bytecode size: ${bytecodeSize} bytes`);
console.log(`📊 Contract size: ${(bytecodeSize / 1024).toFixed(2)} KB\n`);
