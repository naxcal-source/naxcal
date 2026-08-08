export type SupportedEvmChain = {
  chain: string;
  chainId: number;
  moralisChain: string;
  nativeSymbol: string;
};

export const SUPPORTED_EVM_CHAINS: SupportedEvmChain[] = [
  {
    chain: "Ethereum",
    chainId: 1,
    moralisChain: "eth",
    nativeSymbol: "ETH",
  },
  {
    chain: "BNB Smart Chain",
    chainId: 56,
    moralisChain: "bsc",
    nativeSymbol: "BNB",
  },
  {
    chain: "Polygon",
    chainId: 137,
    moralisChain: "polygon",
    nativeSymbol: "MATIC",
  },
  {
    chain: "Arbitrum",
    chainId: 42161,
    moralisChain: "arbitrum",
    nativeSymbol: "ETH",
  },
  {
    chain: "Optimism",
    chainId: 10,
    moralisChain: "optimism",
    nativeSymbol: "ETH",
  },
  {
    chain: "Base",
    chainId: 8453,
    moralisChain: "base",
    nativeSymbol: "ETH",
  },
  {
    chain: "Avalanche",
    chainId: 43114,
    moralisChain: "avalanche",
    nativeSymbol: "AVAX",
  },
];

export function isValidEvmAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
