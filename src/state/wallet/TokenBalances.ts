import { CurrencyAmount, Token } from '@sushiswap/sdk'

const serialize = (currencyAmount: CurrencyAmount<Token>): string => {
  return `[${currencyAmount.currency.wrapped.address} - ${currencyAmount.toExact()}]`
}

type TokenAddress = string

export class TokenBalances {
  public mapping: Record<TokenAddress, CurrencyAmount<Token>>
  public isLoading: boolean

  constructor(balances: Record<TokenAddress, CurrencyAmount<Token>>, isLoading: boolean) {
    this.mapping = balances
    this.isLoading = isLoading
  }

  public serialize(): string {
    return Object.entries(this.mapping)
      .map(([address, currencyAmount]) => (currencyAmount ? serialize(currencyAmount) : address))
      .join()
  }
}
