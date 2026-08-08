import type { SupportedEvmChain } from "./evm-chains";

const MORALIS_BASE_URL = "https://deep-index.moralis.io/api/v2.2";

type MoralisNativeBalanceResponse = {
  balance?: string;
};

type MoralisTokenBalance = {
  token_address?: string;
  address?: string;
  symbol?: string;
  name?: string;
  decimals?: number | string;
  balance?: string;
  balance_formatted?: string;
};

type MoralisTransaction = {
  hash?: string;
  transaction_hash?: string;
  block_number?: string | number;
  block_hash?: string;
  transaction_index?: string | number;
  from_address?: string;
  to_address?: string;
  value?: string;
  gas?: string;
  gas_price?: string;
  receipt_gas_used?: string;
  receipt_status?: string;
  block_timestamp?: string;
};

async function moralisFetch<T>(path: string, searchParams: Record<string, string>) {
  const apiKey = process.env.MORALIS_API_KEY;

  if (!apiKey) {
    throw new Error("MORALIS_API_KEY is not configured.");
  }

  const url = new URL(`${MORALIS_BASE_URL}${path}`);

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      "X-API-Key": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Moralis request failed with ${response.status}: ${body.slice(0, 300)}`,
    );
  }

  return response.json() as Promise<T>;
}

export async function getNativeBalance(address: string, chain: SupportedEvmChain) {
  const data = await moralisFetch<MoralisNativeBalanceResponse>(
    `/${address}/balance`,
    {
      chain: chain.moralisChain,
    },
  );

  const rawBalance = data.balance ?? null;
  const normalizedBalance =
    rawBalance === null ? null : Number(rawBalance) / 10 ** 18;

  return {
    rawBalance,
    normalizedBalance,
    rawProviderPayload: data,
  };
}

export async function getTokenBalances(address: string, chain: SupportedEvmChain) {
  const data = await moralisFetch<MoralisTokenBalance[]>(`/${address}/erc20`, {
    chain: chain.moralisChain,
  });

  return data.map((token) => {
    const rawBalance = token.balance ?? null;
    const decimals =
      typeof token.decimals === "string"
        ? Number(token.decimals)
        : token.decimals ?? null;

    const normalizedBalance =
      rawBalance !== null && decimals !== null
        ? Number(rawBalance) / 10 ** decimals
        : null;

    return {
      tokenContractAddress: token.token_address ?? token.address ?? null,
      tokenSymbol: token.symbol ?? null,
      tokenName: token.name ?? null,
      tokenDecimals: decimals,
      rawBalance,
      normalizedBalance,
      rawProviderPayload: token,
    };
  });
}

export async function getWalletTransactions(
  address: string,
  chain: SupportedEvmChain,
) {
  const data = await moralisFetch<{
    result?: MoralisTransaction[];
    cursor?: string | null;
  }>(`/${address}`, {
    chain: chain.moralisChain,
    limit: "100",
  });

  return {
    transactions: (data.result ?? []).map((transaction) => {
      const hash = transaction.hash ?? transaction.transaction_hash ?? null;
      const gasUsed = transaction.receipt_gas_used
        ? Number(transaction.receipt_gas_used)
        : null;
      const gasPrice = transaction.gas_price
        ? Number(transaction.gas_price)
        : null;

      return {
        txHash: hash,
        blockNumber: transaction.block_number
          ? Number(transaction.block_number)
          : null,
        blockHash: transaction.block_hash ?? null,
        transactionIndex: transaction.transaction_index
          ? Number(transaction.transaction_index)
          : null,
        fromAddress: transaction.from_address ?? null,
        toAddress: transaction.to_address ?? null,
        status:
          transaction.receipt_status === "1"
            ? "success"
            : transaction.receipt_status === "0"
              ? "failed"
              : "unknown",
        nativeValue: transaction.value
          ? Number(transaction.value) / 10 ** 18
          : null,
        gasUsed,
        gasPrice,
        transactionFee:
          gasUsed !== null && gasPrice !== null
            ? (gasUsed * gasPrice) / 10 ** 18
            : null,
        timestamp: transaction.block_timestamp ?? null,
        rawProviderPayload: transaction,
      };
    }),
    cursor: data.cursor ?? null,
  };
}
