import { startOAuthFlow } from "./oauth.js";

async function main() {
  console.log("==========================================");
  console.log("Starting Google Antigravity OAuth Login...");
  console.log("==========================================");
  
  const creds = await startOAuthFlow();
  
  if (creds) {
    console.log("");
    console.log("✅ Login successful! The token has been saved.");
    console.log("✅ You can now restart Pi or type /reload to auto-start the proxy.");
    process.exit(0);
  } else {
    console.error("❌ Login failed or timed out.");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Unexpected error during login:", err);
  process.exit(1);
});
