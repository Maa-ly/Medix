import { createConfig, http } from 'wagmi'
import { defineChain } from 'viem'

export const liskSepolia = defineChain({
  id: 4202,
  name: 'Lisk Sepolia Testnet',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.sepolia-api.lisk.com'] },
    public: { http: ['https://rpc.sepolia-api.lisk.com'] },
  },
  blockExplorers: {
    default: { name: 'Lisk Sepolia Explorer', url: 'https://sepolia-blockscout.lisk.com' },
  },
  testnet: true,
})

export const wagmiConfig = createConfig({
  chains: [liskSepolia],
  transports: {
    [liskSepolia.id]: http('https://rpc.sepolia-api.lisk.com'),
  },
})

