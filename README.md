# Agent Payment Gateway

A smart-contract system and web app for autonomous AI agent micropayments on Arc mainnet, using USDC as the payment token.

Built with [Arc Studio](https://studio.arc.io)

---

## What it does

Admins deposit USDC into an on-chain vault and register AI agent wallets. Each agent is given a per-transaction cap and a total allowance. The agent can call `executePayment(recipient, amount)` to send USDC autonomously — but the contract automatically reverts if either limit is exceeded, providing enforceable least-privilege spending controls for AI agents.

**Admin Dashboard** — deposit USDC, register/revoke agents, configure spend limits, withdraw from the vault.  
**Agent Simulator** — test the contract by executing a payment as the registered agent wallet, with live remaining-allowance tracking.

---

## Tech Stack

- Solidity 0.8.28, OpenZeppelin 5.6.1 (AccessControl, SafeERC20)
- Foundry (forge build, forge test)
- React 18, TypeScript, Vite
- wagmi v2, viem, ConnectKit
- Tailwind CSS (Arc Dark theme)
- Arc mainnet — USDC as gas token (chain ID 5042)

---

## Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- A Circle developer account with mainnet access: https://console.circle.com

### Install

```bash
bun install
```

### Run dev server

```bash
bun run dev
```

### Build contracts

```bash
bun run contracts:build
```

### Test contracts

```bash
bun run contracts:test
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_GATEWAY_ADDRESS` | Deployed AgentPaymentGateway contract address on Arc mainnet |
| `CIRCLE_API_KEY` | Circle mainnet developer-controlled wallets API key (for deploy only) |
| `CIRCLE_ENTITY_SECRET` | Circle entity secret (for deploy only — provisioned once per account) |
| `RPC_PROXY_BASE_URL` | Arc Studio RPC proxy base URL (optional outside Arc Studio) |
| `RPC_PROXY_TOKEN` | Arc Studio RPC proxy auth token (optional outside Arc Studio) |
| `RPC_PROXY_CHAINS` | Comma-separated proxy chain keys (optional outside Arc Studio) |

After deploying the contract, add `VITE_GATEWAY_ADDRESS` to `.env` and restart the dev server.

---

## Deploying to Arc Mainnet

> Arc mainnet deployment uses real funds. Review the contract and test on Arc Testnet first.

### Prerequisites

1. **Upgrade your Circle account to mainnet** at https://console.circle.com (complete mainnet signup/enablement).
2. **Create a mainnet API key** in the Circle Console and paste it into `.env` as `CIRCLE_API_KEY`.
3. **Ensure your entity secret is registered** (one-time per Circle account). If not already done, run the entity secret registration flow in Arc Studio.
4. **Fund a deployer wallet** with USDC on Arc mainnet — you need USDC for gas. Send USDC to the wallet address the Compass script prints.

### Deploy

```bash
# Step 1: Build the artifact
bun run contracts:build

# Step 2: Deploy via Compass (fork-then-live — rehearses on a fork first)
bun run compass:deploy AgentPaymentGateway \
  '["0x3600000000000000000000000000000000000000","$DEPLOYER"]' \
  --blockchain ARC \
  --compass-chain Arc \
  --wallet-id <your-dcw-wallet-id> \
  --wallet-address <your-dcw-wallet-address> \
  --skip-funding
```

`$DEPLOYER` is substituted by the script with the deployer wallet address, which becomes the Admin.

After a successful deploy, the script prints the contract address. Add it to `.env`:

```
VITE_GATEWAY_ADDRESS=0x<deployed_address>
```

Then restart the dev server.

---

## Contract: AgentPaymentGateway

| Function | Role | Description |
|---|---|---|
| `depositUsdc(amount)` | Admin | Transfer USDC from your wallet into the vault (requires prior ERC-20 approve) |
| `registerAgent(agent)` | Admin | Grant AGENT_ROLE to an address |
| `revokeAgent(agent)` | Admin | Revoke AGENT_ROLE |
| `setSpendLimits(agent, maxPerTx, total)` | Admin | Set per-tx and total allowance for an agent |
| `withdrawUsdc(amount)` | Admin | Withdraw USDC from the vault |
| `executePayment(recipient, amount)` | Agent | Send USDC; reverts if amount > maxSpendPerTx or totalAllowance exhausted |
| `remainingAllowance(agent)` | View | Returns totalAllowance minus spentTotal |
