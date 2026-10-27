/**
 * Agent Payment Gateway — Arc Mainnet
 * Built with Arc Studio — https://studio.arc.io
 */

import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { ShieldCheck, Bot, Zap, ExternalLink } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import AdminDashboard from './components/AdminDashboard'
import AgentSimulator from './components/AgentSimulator'
import { GATEWAY_ADDRESS } from './contractConfig'
import { buildAddressExplorerUrl } from './onchain-facts'

const CHAIN_ID = 5042 // Arc mainnet

type Tab = 'admin' | 'agent'

function NotDeployedBanner() {
  const isPlaceholder = GATEWAY_ADDRESS === '0x0000000000000000000000000000000000000000'
  if (!isPlaceholder) return null
  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/8 px-4 py-3 text-sm text-amber-300 mb-4">
      <strong>Contract not yet deployed.</strong> Follow the deploy instructions in the README to deploy to Arc mainnet,
      then add <span className="mono text-amber-200">VITE_GATEWAY_ADDRESS</span> to{' '}
      <span className="mono text-amber-200">.env</span> and restart the dev server.
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('admin')
  const { address } = useAccount()

  const isDeployed = GATEWAY_ADDRESS !== '0x0000000000000000000000000000000000000000'

  return (
    <div
      className="min-h-dvh w-full"
      style={{ background: 'var(--bg-gradient)' }}
    >
      {/* Top nav */}
      <header className="border-b border-[var(--border)] backdrop-blur-sm sticky top-0 z-20 bg-[var(--bg)]/70">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center">
              <Zap size={16} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="display font-bold text-[var(--ink)] text-sm leading-tight tracking-tight">
                Agent Payment Gateway
              </p>
              <p className="text-[10px] text-[var(--subtle)] leading-tight">Arc Mainnet · USDC</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isDeployed && (
              <a
                href={buildAddressExplorerUrl(CHAIN_ID, GATEWAY_ADDRESS)}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--subtle)] hover:text-[var(--accent)] transition-colors"
              >
                <ExternalLink size={12} />
                <span className="mono">{GATEWAY_ADDRESS.slice(0, 6)}…{GATEWAY_ADDRESS.slice(-4)}</span>
              </a>
            )}
            <ConnectKitButton />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <NotDeployedBanner />

        {/* Hero stat row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Network', value: 'Arc Mainnet', sub: 'Chain ID 5042' },
            { label: 'Gas Token', value: 'USDC', sub: 'Native asset', icon: true },
            {
              label: 'Contract',
              value: isDeployed ? 'Deployed' : 'Not Deployed',
              sub: isDeployed ? GATEWAY_ADDRESS.slice(0, 8) + '…' : 'Deploy first',
              good: isDeployed,
            },
          ].map(({ label, value, sub, icon, good }) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 space-y-1"
            >
              <p className="text-[10px] font-medium text-[var(--subtle)] uppercase tracking-widest">{label}</p>
              <div className="flex items-center gap-1.5">
                {icon && <TokenUSDC variant="branded" size={16} />}
                <p
                  className="display font-bold text-sm"
                  style={{ color: good === false ? 'var(--danger)' : good === true ? 'var(--success)' : 'var(--ink)' }}
                >
                  {value}
                </p>
              </div>
              <p className="text-[10px] text-[var(--subtle)] mono truncate">{sub}</p>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1 gap-1">
          {([
            { id: 'admin', label: 'Admin Dashboard', icon: <ShieldCheck size={14} /> },
            { id: 'agent', label: 'Agent Simulator', icon: <Bot size={14} /> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all
                ${tab === id
                  ? 'bg-[var(--surface-strong)] text-[var(--ink)] shadow-sm'
                  : 'text-[var(--subtle)] hover:text-[var(--ink-2)]'
                }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        {tab === 'admin' ? (
          <AdminDashboard />
        ) : (
          <AgentSimulator />
        )}

        {/* Connected account indicator */}
        {address && (
          <div className="flex items-center justify-center gap-2 text-xs text-[var(--subtle)] pt-2 pb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
            <span className="mono">{address.slice(0, 6)}…{address.slice(-4)}</span>
            <span>connected</span>
          </div>
        )}
      </main>
    </div>
  )
}
