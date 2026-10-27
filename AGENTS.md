# AGENTS.md

## Project: Agent Payment Gateway (Arc Mainnet)

### Contract: AgentPaymentGateway
- Source: `contracts/AgentPaymentGateway.sol`
- Network: Arc Mainnet (chain ID 5042)
- Status: Not yet deployed — follow deploy instructions below.
- Deployed address: (add after deploy as VITE_GATEWAY_ADDRESS)

### Architecture
- `DEFAULT_ADMIN_ROLE` = Admin (initialOwner passed at deploy via `"$DEPLOYER"`)
- `AGENT_ROLE` = keccak256("AGENT_ROLE") — granted per agent via registerAgent()
- USDC address on Arc mainnet: 0x3600000000000000000000000000000000000000

### Deploy path: Mode 2 / Compass engine (Arc mainnet)
Constructor args: `[USDC_ADDRESS, DEPLOYER_ADDRESS]`  
Use `"$DEPLOYER"` placeholder for the owner arg — the Compass script substitutes the real wallet.

Command (after credentials are set up in .env):
```
bun run compass:deploy AgentPaymentGateway '["0x3600000000000000000000000000000000000000","$DEPLOYER"]' --blockchain ARC --compass-chain Arc --wallet-id <id> --wallet-address <addr> --skip-funding
```

After deploy, add to .env:
```
VITE_GATEWAY_ADDRESS=0x<deployed_address>
```

### Security review result
Both auditors (rule-corpus + functional) returned zero findings. Slither returned zero findings. Contract is clean.

### Decisions
- `msg.sender` is NOT used for ownership in the constructor — Create2Factory is the deployer, so ownership must be passed as `initialOwner`.
- `setSpendLimits` does NOT reset `spentTotal` — limits are forward-only. Resetting total allowance is the admin's responsibility by calling setSpendLimits again with a new totalAllowance greater than current spentTotal.
- Admin who is also granted AGENT_ROLE at construction can execute payments; intended for testing — revoke AGENT_ROLE from admin for production use.
