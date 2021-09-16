import { Currency, CurrencyAmount, Ether, JSBI, Token } from '@sushiswap/sdk'
import { useMultipleContractSingleData, useSingleContractMultipleData } from '../multicall/hooks'

import ERC20_ABI from '../../constants/abis/erc20.json'
import { Interface } from '@ethersproject/abi'
import { SUSHI } from './../../config/tokens'
import { isAddress } from '../../functions/validate'
import { useActiveWeb3React } from '../../hooks/useActiveWeb3React'
import { useAllTokens } from '../../hooks/Tokens'
import { useMemo } from 'react'
import { useMulticall2Contract } from '../../hooks/useContract'
import { TokenBalances } from './TokenBalances'

/**
 * Returns a map of the given addresses to their eventually consistent ETH balances.
 */
export function useETHBalances(uncheckedAddresses?: (string | undefined)[]): {
  [address: string]: CurrencyAmount<Currency> | undefined
} {
  const { chainId } = useActiveWeb3React()
  const multicallContract = useMulticall2Contract()

  const addresses: string[] = useMemo(
    () =>
      uncheckedAddresses
        ? uncheckedAddresses
            .map(isAddress)
            .filter((a): a is string => a !== false)
            .sort()
        : [],
    [uncheckedAddresses]
  )

  const results = useSingleContractMultipleData(
    multicallContract,
    'getEthBalance',
    addresses.map((address) => [address])
  )

  return useMemo(
    () =>
      addresses.reduce<{ [address: string]: CurrencyAmount<Currency> }>((memo, address, i) => {
        const value = results?.[i]?.result?.[0]
        if (value && chainId)
          memo[address] = CurrencyAmount.fromRawAmount(Ether.onChain(chainId), JSBI.BigInt(value.toString()))
        return memo
      }, {}),
    [addresses, chainId, results]
  )
}

/**
 * Returns a map of token addresses to their eventually consistent token balances for a single account.
 * Also includes serialization and loading state.
 * @return TokenBalances
 */
export function useTokenBalances(address?: string, tokens?: (Token | undefined)[]): TokenBalances {
  const validatedTokens: Token[] = useMemo(
    () => tokens?.filter((t?: Token): t is Token => isAddress(t?.address) !== false) ?? [],
    [tokens]
  )

  const validatedTokenAddresses = useMemo(() => validatedTokens.map((vt) => vt.address), [validatedTokens])
  const ERC20Interface = new Interface(ERC20_ABI)
  const balances = useMultipleContractSingleData(
    validatedTokenAddresses,
    ERC20Interface,
    'balanceOf',
    [address],
    undefined,
    100_000
  )

  const anyLoading: boolean = useMemo(() => balances.some((callState) => callState.loading), [balances])
  const mapping = useMemo(
    () =>
      address && validatedTokens.length > 0
        ? validatedTokens.reduce<{ [tokenAddress: string]: CurrencyAmount<Token> }>((memo, token, i) => {
            const value = balances?.[i]?.result?.[0]
            const amount = value ? JSBI.BigInt(value.toString()) : undefined
            if (amount) {
              memo[token.address] = CurrencyAmount.fromRawAmount(token, amount)
            }
            return memo
          }, {})
        : {},
    [address, validatedTokens, balances]
  )
  return useMemo(() => new TokenBalances(mapping, anyLoading), [anyLoading, mapping])
}

// get the balance for a single token/account combo
export function useTokenBalance(account?: string, token?: Token): CurrencyAmount<Token> | undefined {
  const { mapping } = useTokenBalances(account, [token])
  if (!token) return undefined
  return mapping[token.address]
}

export function useCurrencyBalances(
  account?: string,
  currencies?: (Currency | undefined)[]
): (CurrencyAmount<Currency> | undefined)[] {
  const tokens = useMemo(
    () => currencies?.filter((currency): currency is Token => currency?.isToken ?? false) ?? [],
    [currencies]
  )

  const tokenBalances = useTokenBalances(account, tokens)
  const containsETH: boolean = useMemo(() => currencies?.some((currency) => currency?.isNative) ?? false, [currencies])
  const ethBalance = useETHBalances(containsETH ? [account] : [])

  return useMemo(
    () =>
      currencies?.map((currency) => {
        if (!account || !currency) return undefined
        if (currency.isToken) return tokenBalances.mapping[currency.address]
        if (currency.isNative) return ethBalance[account]
        return undefined
      }) ?? [],
    [account, currencies, ethBalance, tokenBalances.serialize()]
  )
}

export function useCurrencyBalance(account?: string, currency?: Currency): CurrencyAmount<Currency> | undefined {
  return useCurrencyBalances(account, [currency])[0]
}

// mimics useAllBalances
export function useAllTokenBalances(): {
  [tokenAddress: string]: CurrencyAmount<Token>
} {
  const { account } = useActiveWeb3React()
  const allTokens = useAllTokens()
  const allTokensArray = useMemo(() => Object.values(allTokens ?? {}), [allTokens])
  const { mapping } = useTokenBalances(account ?? undefined, allTokensArray)
  return mapping
}

// TODO: Replace
// get the total owned, unclaimed, and unharvested UNI for account
// export function useAggregateUniBalance(): CurrencyAmount<Token> | undefined {
//   const { account, chainId } = useActiveWeb3React();

//   const uni = chainId ? UNI[chainId] : undefined;

//   const uniBalance: CurrencyAmount<Token> | undefined = useTokenBalance(
//     account ?? undefined,
//     uni
//   );
//   const uniUnclaimed: CurrencyAmount<Token> | undefined =
//     useUserUnclaimedAmount(account);
//   const uniUnHarvested: CurrencyAmount<Token> | undefined = useTotalUniEarned();

//   if (!uni) return undefined;

//   return CurrencyAmount.fromRawAmount(
//     uni,
//     JSBI.add(
//       JSBI.add(
//         uniBalance?.quotient ?? JSBI.BigInt(0),
//         uniUnclaimed?.quotient ?? JSBI.BigInt(0)
//       ),
//       uniUnHarvested?.quotient ?? JSBI.BigInt(0)
//     )
//   );
// }
