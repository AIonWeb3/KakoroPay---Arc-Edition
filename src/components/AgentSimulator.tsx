import { useState } from 'react'
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useSwitchChain,
} from 'wagmi'
import { isAddress } from 'viem'
import { toast } from 'sonner'
import { Bot, Zap, ExternalLink } from 'lucide-react'
import { arcMainnet } from '../config'
import { GATEWAY_ADDRESS, GATEWAY_ABI } from '../contractConfig'
import { getUsdc } from '../onchain-facts'
import { parseAmount, Amount } from '../onchain-money'
import { buildTxExplorerUrl } from '../onchain-facts'

const CHAIN_ID = arcMainnet.id
const usdcFact = getUsdc(CHAIN_ID)

function parseOnchainError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled.'
  if (msg.includes('exceedspertxlimit') || msg.includes('exceedspertx')) return 'Amount exceeds the per-transaction limit.'
  if (msg.includes('exceedsallowance')) return 'Amount exceeds the remaining total allowance.'
  if (msg.includes('limitsnotconfigured')) return 'Spend limits have not been set for this agent.'
  if (msg.includes('zeroaddress')) return 'Recipient address cannot be zero.'
  if (msg.includes('zeroamount')) return 'Amount must be greater than zero.'
  if (msg.includes('reverted')) return 'Transaction reverted. Check role and limits.'
  return 'Transaction failed. Please try again.'
}

export default function AgentSimulator() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  // Snapshot of remaining allowance captured at payment success time
  const [snapshotRemaining, setSnapshotRemaining] = useState<bigint | undefined>()

  const isWrongChain = chainId !== CHAIN_ID

  const { data: agentConfig, refetch: refetchConfig } = useReadContract({
    address: GATEWAY_ADDRESS,
    abi: GATEWAY_ABI,
    functionName: 'agentConfigs',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  })

  const { data: remaining, refetch: refetchRemaining } = useReadContract({
    address: GATEWAY_ADDRESS,
    abi: GATEWAY_ABI,
    functionName: 'remainingAllowance',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  })

  const fmtUsdc = (raw: bigint | undefined) =>
    raw !== undefined && usdcFact ? Amount.fromRaw(raw, usdcFact.decimals).toFixed(2) : '—'

  const { writeContract: executePayment, data: txHash, isPending, reset } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const handleExecute = () => {
    if (isWrongChain) { switchChain({ chainId: CHAIN_ID }); return }
    if (!address) { toast.error('Connect your wallet first.'); return }
    if (!isAddress(recipient)) { toast.error('Enter a valid recipient address.'); return }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Enter a valid payment amount.')
      return
    }
    try {
      const parsed = parseAmount(CHAIN_ID, amount)
      // Capture pre-send remaining for the receipt snapshot
      const preRemaining = remaining
      executePayment(
        {
          address: GATEWAY_ADDRESS,
          abi: GATEWAY_ABI,
          functionName: 'executePayment',
          args: [recipient, parsed.raw],
          chainId: CHAIN_ID,
        },
        {
          onSuccess: () => {
            setSnapshotRemaining(preRemaining)
            void refetchConfig()
            void refetchRemaining()
            toast.success('Payment executed successfully')
            setAmount('')
          },
          onError: (e) => { toast.error(parseOnchainError(e)); reset() },
        },
      )
    } catch {
      toast.error('Invalid amount.')
    }
  }

  const maxPerTx = agentConfig?.[0]
  const totalAllowance = agentConfig?.[1]

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-strong)] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/15 flex items-center justify-center">
            <Bot size={18} className="text-[var(--accent)]" />
          </div>
          <div>
            <p className="display font-semibold text-[var(--ink)] text-sm">Agent Simulator</p>
            <p className="text-xs text-[var(--subtle)]">Execute payments as the registered agent</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Max Per Tx', value: fmtUsdc(maxPerTx) },
            { label: 'Total Allowance', value: fmtUsdc(totalAllowance) },
            { label: 'Remaining', value: fmtUsdc(remaining) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[var(--surface-muted)] rounded-xl px-3 py-2.5">
              <p className="text-xs text-[var(--subtle)] uppercase tracking-widest mb-1">{label}</p>
              <p className="display font-bold text-[var(--ink)] tabular-nums text-base">{value}</p>
              <p className="text-xs text-[var(--subtle)]">USDC</p>
            </div>
          ))}
        </div>
      </div>

      {isWrongChain && (
        <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)] flex items-center justify-between gap-3">
          <span>Switch to Arc mainnet to execute payments.</span>
          <button
            onClick={() => switchChain({ chainId: CHAIN_ID })}
            className="text-xs font-semibold underline shrink-0"
          >
            Switch network
          </button>
        </div>
      )}

      {/* Payment form */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--subtle)] uppercase tracking-widest">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x…"
            className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5
              text-sm text-[var(--ink)] placeholder:text-[var(--subtle)] focus:outline-none focus:border-[var(--accent)]
              transition-colors mono"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--subtle)] uppercase tracking-widest">
            Payment Amount (USDC)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1.00"
            className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5
              text-sm text-[var(--ink)] placeholder:text-[var(--subtle)] focus:outline-none focus:border-[var(--accent)]
              transition-colors mono"
          />
        </div>
        <button
          onClick={handleExecute}
          disabled={isPending || isConfirming || !address}
          className="w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
            transition-all bg-[var(--accent)] text-[#0d1b2f] hover:bg-[var(--accent-hover)]
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Zap size={15} />
          {isConfirming ? 'Confirming…' : isPending ? 'Confirm in wallet…' : 'Execute Payment'}
        </button>
        {!address && (
          <p className="text-xs text-center text-[var(--subtle)]">Connect your wallet to execute payments.</p>
        )}
      </div>

      {/* Receipt after success */}
      {isSuccess && txHash && (
        <div className="rounded-2xl border border-[var(--success)]/40 bg-[var(--success)]/8 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
            <p className="text-sm font-semibold text-[var(--success)]">Payment Executed</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--subtle)]">Remaining Allowance (updated)</span>
              <span className="mono text-sm font-semibold text-[var(--ink)] tabular-nums">
                {fmtUsdc(snapshotRemaining)} USDC
              </span>
            </div>
            <a
              href={buildTxExplorerUrl(CHAIN_ID, txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline"
            >
              <ExternalLink size={12} />
              View on Arc Explorer
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
