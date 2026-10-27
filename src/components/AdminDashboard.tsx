import { useState } from 'react'
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useSwitchChain,
} from 'wagmi'
import { erc20Abi, isAddress } from 'viem'
import { toast } from 'sonner'
import { ShieldCheck, Wallet, UserPlus, UserMinus, SlidersHorizontal, ArrowDownToLine } from 'lucide-react'
import { arcMainnet } from '../config'
import { GATEWAY_ADDRESS, GATEWAY_ABI } from '../contractConfig'
import { getUsdc } from '../onchain-facts'
import { parseAmount, Amount } from '../onchain-money'
import { buildTxExplorerUrl } from '../onchain-facts'

const CHAIN_ID = arcMainnet.id
const usdcFact = getUsdc(CHAIN_ID)
const USDC_ADDRESS = (usdcFact?.address ?? '0x0000000000000000000000000000000000000000') as `0x${string}`

function parseOnchainError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled.'
  if (msg.includes('insufficient')) return 'Insufficient balance.'
  if (msg.includes('zeroaddress')) return 'Invalid address: cannot be zero.'
  if (msg.includes('zeroamount')) return 'Amount must be greater than zero.'
  if (msg.includes('reverted')) return 'Transaction reverted. Check your role and inputs.'
  return 'Transaction failed. Please try again.'
}

interface TxButtonProps {
  label: string
  loadingLabel: string
  isPending: boolean
  isConfirming: boolean
  disabled?: boolean
  onClick: () => void
}

function TxButton({ label, loadingLabel, isPending, isConfirming, disabled, onClick }: TxButtonProps) {
  const busy = isPending || isConfirming
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all
        bg-[var(--accent)] text-[#0d1b2f] hover:bg-[var(--accent-hover)]
        disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {busy ? loadingLabel : label}
    </button>
  )
}

interface SectionCardProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

function SectionCard({ icon, title, children }: SectionCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="text-[var(--accent)]">{icon}</div>
        <h3 className="display text-[var(--ink)] font-semibold text-sm tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function InputField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[var(--subtle)] uppercase tracking-widest">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5
          text-sm text-[var(--ink)] placeholder:text-[var(--subtle)] focus:outline-none focus:border-[var(--accent)]
          transition-colors mono"
      />
    </div>
  )
}

export default function AdminDashboard() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()

  const [depositAmt, setDepositAmt] = useState('')
  const [agentAddr, setAgentAddr] = useState('')
  const [revokeAddr, setRevokeAddr] = useState('')
  const [limitAgent, setLimitAgent] = useState('')
  const [maxPerTx, setMaxPerTx] = useState('')
  const [totalAllowance, setTotalAllowance] = useState('')
  const [withdrawAmt, setWithdrawAmt] = useState('')

  const isWrongChain = chainId !== CHAIN_ID

  // USDC balance of admin
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  })

  // Vault USDC balance
  const { data: vaultBalance, refetch: refetchVault } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [GATEWAY_ADDRESS],
    chainId: CHAIN_ID,
  })

  const fmtUsdc = (raw: bigint | undefined) =>
    raw !== undefined && usdcFact
      ? Amount.fromRaw(raw, usdcFact.decimals).toFixed(2)
      : '—'

  // ---- Approve USDC ----
  const {
    writeContract: approveUsdc,
    data: approveHash,
    isPending: approvePending,
    reset: resetApprove,
  } = useWriteContract()
  const { isLoading: approveConfirming, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  // ---- Deposit USDC ----
  const {
    writeContract: depositUsdc,
    data: depositHash,
    isPending: depositPending,
    reset: resetDeposit,
  } = useWriteContract()
  const { isLoading: depositConfirming, isSuccess: depositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  })

  // ---- Register agent ----
  const {
    writeContract: registerAgent,
    data: registerHash,
    isPending: registerPending,
    reset: resetRegister,
  } = useWriteContract()
  const { isLoading: registerConfirming } = useWaitForTransactionReceipt({ hash: registerHash })

  // ---- Revoke agent ----
  const {
    writeContract: revokeAgent,
    data: revokeHash,
    isPending: revokePending,
    reset: resetRevoke,
  } = useWriteContract()
  const { isLoading: revokeConfirming } = useWaitForTransactionReceipt({ hash: revokeHash })

  // ---- Set limits ----
  const {
    writeContract: setLimits,
    data: limitsHash,
    isPending: limitsPending,
    reset: resetLimits,
  } = useWriteContract()
  const { isLoading: limitsConfirming } = useWaitForTransactionReceipt({ hash: limitsHash })

  // ---- Withdraw ----
  const {
    writeContract: withdrawUsdc,
    data: withdrawHash,
    isPending: withdrawPending,
    reset: resetWithdraw,
  } = useWriteContract()
  const { isLoading: withdrawConfirming } = useWaitForTransactionReceipt({ hash: withdrawHash })

  const ensureChain = () => {
    if (isWrongChain) {
      switchChain({ chainId: CHAIN_ID })
      return false
    }
    return true
  }

  const handleApprove = () => {
    if (!ensureChain()) return
    if (!depositAmt || isNaN(Number(depositAmt)) || Number(depositAmt) <= 0) {
      toast.error('Enter a valid deposit amount first.')
      return
    }
    try {
      const parsed = parseAmount(CHAIN_ID, depositAmt)
      approveUsdc(
        {
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'approve',
          args: [GATEWAY_ADDRESS, parsed.raw],
          chainId: CHAIN_ID,
        },
        {
          onSuccess: (h) => toast.success('Approval submitted', { description: h.slice(0, 10) + '…' }),
          onError: (e) => { toast.error(parseOnchainError(e)); resetApprove() },
        },
      )
    } catch {
      toast.error('Invalid amount.')
    }
  }

  const handleDeposit = () => {
    if (!ensureChain()) return
    if (!depositAmt || Number(depositAmt) <= 0) { toast.error('Enter a valid amount.'); return }
    try {
      const parsed = parseAmount(CHAIN_ID, depositAmt)
      depositUsdc(
        {
          address: GATEWAY_ADDRESS,
          abi: GATEWAY_ABI,
          functionName: 'depositUsdc',
          args: [parsed.raw],
          chainId: CHAIN_ID,
        },
        {
          onSuccess: (h) => {
            toast.success('Deposit submitted', {
              description: (
                <a href={buildTxExplorerUrl(CHAIN_ID, h)} target="_blank" rel="noopener noreferrer" className="underline">
                  View on explorer
                </a>
              ) as unknown as string,
            })
            void refetchVault()
            setDepositAmt('')
          },
          onError: (e) => { toast.error(parseOnchainError(e)); resetDeposit() },
        },
      )
    } catch {
      toast.error('Invalid amount.')
    }
  }

  const handleRegister = () => {
    if (!ensureChain()) return
    if (!isAddress(agentAddr)) { toast.error('Enter a valid agent address.'); return }
    registerAgent(
      {
        address: GATEWAY_ADDRESS,
        abi: GATEWAY_ABI,
        functionName: 'registerAgent',
        args: [agentAddr],
        chainId: CHAIN_ID,
      },
      {
        onSuccess: (h) => {
          toast.success('Agent registered', { description: h.slice(0, 10) + '…' })
          setAgentAddr('')
        },
        onError: (e) => { toast.error(parseOnchainError(e)); resetRegister() },
      },
    )
  }

  const handleRevoke = () => {
    if (!ensureChain()) return
    if (!isAddress(revokeAddr)) { toast.error('Enter a valid agent address.'); return }
    revokeAgent(
      {
        address: GATEWAY_ADDRESS,
        abi: GATEWAY_ABI,
        functionName: 'revokeAgent',
        args: [revokeAddr],
        chainId: CHAIN_ID,
      },
      {
        onSuccess: (h) => {
          toast.success('Agent revoked', { description: h.slice(0, 10) + '…' })
          setRevokeAddr('')
        },
        onError: (e) => { toast.error(parseOnchainError(e)); resetRevoke() },
      },
    )
  }

  const handleSetLimits = () => {
    if (!ensureChain()) return
    if (!isAddress(limitAgent)) { toast.error('Enter a valid agent address.'); return }
    if (!maxPerTx || !totalAllowance || Number(maxPerTx) <= 0 || Number(totalAllowance) <= 0) {
      toast.error('Both limit values must be greater than zero.')
      return
    }
    try {
      const parsedMax = parseAmount(CHAIN_ID, maxPerTx)
      const parsedTotal = parseAmount(CHAIN_ID, totalAllowance)
      setLimits(
        {
          address: GATEWAY_ADDRESS,
          abi: GATEWAY_ABI,
          functionName: 'setSpendLimits',
          args: [limitAgent, parsedMax.raw, parsedTotal.raw],
          chainId: CHAIN_ID,
        },
        {
          onSuccess: (h) => {
            toast.success('Spend limits set', { description: h.slice(0, 10) + '…' })
            setLimitAgent(''); setMaxPerTx(''); setTotalAllowance('')
          },
          onError: (e) => { toast.error(parseOnchainError(e)); resetLimits() },
        },
      )
    } catch {
      toast.error('Invalid amount values.')
    }
  }

  const handleWithdraw = () => {
    if (!ensureChain()) return
    if (!withdrawAmt || Number(withdrawAmt) <= 0) { toast.error('Enter a valid amount.'); return }
    try {
      const parsed = parseAmount(CHAIN_ID, withdrawAmt)
      withdrawUsdc(
        {
          address: GATEWAY_ADDRESS,
          abi: GATEWAY_ABI,
          functionName: 'withdrawUsdc',
          args: [parsed.raw],
          chainId: CHAIN_ID,
        },
        {
          onSuccess: (h) => {
            toast.success('Withdrawal submitted', { description: h.slice(0, 10) + '…' })
            void refetchVault()
            setWithdrawAmt('')
          },
          onError: (e) => { toast.error(parseOnchainError(e)); resetWithdraw() },
        },
      )
    } catch {
      toast.error('Invalid amount.')
    }
  }

  if (!address) {
    return (
      <div className="text-center py-12 text-[var(--subtle)] text-sm">
        Connect your wallet to access the admin dashboard.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Vault balance header */}
      <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-strong)] p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-medium text-[var(--subtle)] uppercase tracking-widest mb-1">Vault Balance</p>
            <p className="display text-3xl font-bold text-[var(--ink)] tabular-nums">
              {fmtUsdc(vaultBalance)} <span className="text-[var(--muted)] text-lg font-medium">USDC</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-[var(--subtle)] uppercase tracking-widest mb-1">Your Balance</p>
            <p className="display text-xl font-semibold text-[var(--ink-2)] tabular-nums">
              {fmtUsdc(usdcBalance)} <span className="text-[var(--subtle)] text-sm">USDC</span>
            </p>
          </div>
        </div>
        {depositSuccess && depositHash && (
          <a
            href={buildTxExplorerUrl(CHAIN_ID, depositHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--accent)] hover:underline mt-2 block"
          >
            Last deposit confirmed — view on explorer
          </a>
        )}
      </div>

      {isWrongChain && (
        <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)] flex items-center justify-between gap-3">
          <span>Switch to Arc mainnet to interact with the gateway.</span>
          <button
            onClick={() => switchChain({ chainId: CHAIN_ID })}
            className="text-xs font-semibold underline shrink-0"
          >
            Switch network
          </button>
        </div>
      )}

      {/* Deposit USDC */}
      <SectionCard icon={<Wallet size={16} />} title="Deposit USDC to Vault">
        <InputField
          label="Amount (USDC)"
          placeholder="100.00"
          value={depositAmt}
          onChange={setDepositAmt}
          type="number"
        />
        <div className="grid grid-cols-2 gap-2">
          <TxButton
            label="1. Approve"
            loadingLabel={approveConfirming ? 'Confirming…' : 'Approving…'}
            isPending={approvePending}
            isConfirming={approveConfirming}
            onClick={handleApprove}
          />
          <TxButton
            label="2. Deposit"
            loadingLabel={depositConfirming ? 'Confirming…' : 'Depositing…'}
            isPending={depositPending}
            isConfirming={depositConfirming}
            disabled={!approveSuccess}
            onClick={handleDeposit}
          />
        </div>
        <p className="text-xs text-[var(--subtle)]">Step 1 approves USDC spending. Step 2 moves funds into the vault.</p>
      </SectionCard>

      {/* Register agent */}
      <SectionCard icon={<UserPlus size={16} />} title="Register Agent">
        <InputField
          label="Agent Wallet Address"
          placeholder="0x…"
          value={agentAddr}
          onChange={setAgentAddr}
        />
        <TxButton
          label="Register Agent"
          loadingLabel={registerConfirming ? 'Confirming…' : 'Registering…'}
          isPending={registerPending}
          isConfirming={registerConfirming}
          onClick={handleRegister}
        />
      </SectionCard>

      {/* Set spend limits */}
      <SectionCard icon={<SlidersHorizontal size={16} />} title="Set Spend Limits">
        <InputField
          label="Agent Address"
          placeholder="0x…"
          value={limitAgent}
          onChange={setLimitAgent}
        />
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Max per Transaction (USDC)"
            placeholder="10.00"
            value={maxPerTx}
            onChange={setMaxPerTx}
            type="number"
          />
          <InputField
            label="Total Allowance (USDC)"
            placeholder="500.00"
            value={totalAllowance}
            onChange={setTotalAllowance}
            type="number"
          />
        </div>
        <TxButton
          label="Set Limits"
          loadingLabel={limitsConfirming ? 'Confirming…' : 'Setting…'}
          isPending={limitsPending}
          isConfirming={limitsConfirming}
          onClick={handleSetLimits}
        />
      </SectionCard>

      {/* Revoke agent */}
      <SectionCard icon={<UserMinus size={16} />} title="Revoke Agent">
        <InputField
          label="Agent Wallet Address"
          placeholder="0x…"
          value={revokeAddr}
          onChange={setRevokeAddr}
        />
        <TxButton
          label="Revoke Agent"
          loadingLabel={revokeConfirming ? 'Confirming…' : 'Revoking…'}
          isPending={revokePending}
          isConfirming={revokeConfirming}
          onClick={handleRevoke}
        />
        <p className="text-xs text-[var(--danger)]">This immediately removes the agent's ability to execute payments.</p>
      </SectionCard>

      {/* Withdraw */}
      <SectionCard icon={<ArrowDownToLine size={16} />} title="Withdraw from Vault">
        <InputField
          label="Amount (USDC)"
          placeholder="50.00"
          value={withdrawAmt}
          onChange={setWithdrawAmt}
          type="number"
        />
        <TxButton
          label="Withdraw"
          loadingLabel={withdrawConfirming ? 'Confirming…' : 'Withdrawing…'}
          isPending={withdrawPending}
          isConfirming={withdrawConfirming}
          onClick={handleWithdraw}
        />
      </SectionCard>

      {/* Role indicator */}
      <div className="flex items-center gap-2 text-xs text-[var(--subtle)] px-1">
        <ShieldCheck size={13} className="text-[var(--success)]" />
        <span>Connected as: <span className="mono text-[var(--ink-2)]">{address.slice(0, 6)}…{address.slice(-4)}</span></span>
      </div>
    </div>
  )
}
