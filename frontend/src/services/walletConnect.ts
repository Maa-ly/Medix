/**
 * WalletConnect Integration for Medix
 * Provides wallet connection functionality using WalletConnect v2
 */

import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { liskSepolia } from './wagmi'

// Get WalletConnect project ID from environment
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '24ce00f924387ed693d8da29604b0bcb'

// Metadata for the application
const metadata = {
  name: 'Medix',
  description: 'Decentralized Media Consumption Achievement Tracker',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://medix.io',
  icons: ['https://medix.io/icon.png']
}

// Create wagmi config with WalletConnect
export const wagmiConfig = defaultWagmiConfig({
  chains: [liskSepolia],
  projectId,
  metadata,
})

// Create Web3Modal
export const web3Modal = createWeb3Modal({
  wagmiConfig,
  projectId,
  enableAnalytics: true,
})

export { projectId, metadata }
