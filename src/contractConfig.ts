/**
 * AgentPaymentGateway contract configuration.
 * Built with Arc Studio — https://studio.arc.io
 *
 * CONTRACT_ADDRESS is read from VITE_GATEWAY_ADDRESS in .env.
 * After deploying, add that variable to .env and restart the dev server.
 */

export const GATEWAY_ADDRESS =
  (import.meta.env.VITE_GATEWAY_ADDRESS as `0x${string}` | undefined) ?? '0x0000000000000000000000000000000000000000'

export const GATEWAY_ABI = [
  // View
  {
    name: 'usdcToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'AGENT_ROLE',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'agentConfigs',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [
      { name: 'maxSpendPerTx', type: 'uint256' },
      { name: 'totalAllowance', type: 'uint256' },
      { name: 'spentTotal', type: 'uint256' },
    ],
  },
  {
    name: 'remainingAllowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'hasRole',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  // Admin write
  {
    name: 'depositUsdc',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'registerAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [],
  },
  {
    name: 'revokeAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [],
  },
  {
    name: 'setSpendLimits',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agent', type: 'address' },
      { name: 'maxSpendPerTx', type: 'uint256' },
      { name: 'totalAllowance', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'withdrawUsdc',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  // Agent write
  {
    name: 'executePayment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  // Events
  {
    name: 'UsdcDeposited',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'AgentRegistered',
    type: 'event',
    inputs: [{ name: 'agent', type: 'address', indexed: true }],
  },
  {
    name: 'AgentRevoked',
    type: 'event',
    inputs: [{ name: 'agent', type: 'address', indexed: true }],
  },
  {
    name: 'SpendLimitsSet',
    type: 'event',
    inputs: [
      { name: 'agent', type: 'address', indexed: true },
      { name: 'maxSpendPerTx', type: 'uint256', indexed: false },
      { name: 'totalAllowance', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'PaymentExecuted',
    type: 'event',
    inputs: [
      { name: 'agent', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'remainingAllowance', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'UsdcWithdrawn',
    type: 'event',
    inputs: [
      { name: 'to', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const
