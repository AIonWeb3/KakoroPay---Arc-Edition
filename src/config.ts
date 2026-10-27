/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'
import { requireChain } from './onchain-facts'

// Arc mainnet chain definition — chainId 5042
const arcMainnetFacts = requireChain(5042)
export const arcMainnet = {
  id: arcMainnetFacts.chainId as 5042,
  name: arcMainnetFacts.name,
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: arcMainnetFacts.nativeCurrency.decimals,
  },
  rpcUrls: {
    default: { http: arcMainnetFacts.rpcUrls as [string, ...string[]] },
    public: { http: arcMainnetFacts.rpcUrls as [string, ...string[]] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: arcMainnetFacts.explorerBase },
  },
} as const

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])
registerChain(arcMainnet.id, arcMainnet.rpcUrls.default.http[0])

export const config = createConfig({
  chains: [arcMainnet, arcTestnet, mainnet],
  connectors: [injected()],
  transports: {
    [arcMainnet.id]: http(arcMainnetFacts.rpcUrls[0]),
    [arcTestnet.id]: http(),
    [mainnet.id]: http(),
  },
})
