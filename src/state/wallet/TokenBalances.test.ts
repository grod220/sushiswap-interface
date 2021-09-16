import { TokenBalances } from './TokenBalances'
import { CurrencyAmount, Token } from '@sushiswap/sdk'

describe('TokenBalances', () => {
  describe('#serializes', () => {
    const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
    const ADDRESS_ONE = '0x0000000000000000000000000000000000000001'
    const ADDRESS_TWO = '0x0000000000000000000000000000000000000002'

    it('properly serializes mapping with one address', () => {
      const token = new Token(1, ADDRESS_ONE, 0)
      const amount = CurrencyAmount.fromRawAmount(token, 100)
      const tokenBalances = new TokenBalances(
        {
          [ADDRESS_ZERO]: amount,
        },
        true
      )
      expect(tokenBalances.serialize()).toEqual(`[${ADDRESS_ONE} - 100]`)
    })

    it('properly serializes mapping with many addresses', () => {
      const tokenBalances = new TokenBalances(
        {
          [ADDRESS_ZERO]: CurrencyAmount.fromRawAmount(new Token(1, ADDRESS_ZERO, 0), 100),
          [ADDRESS_ONE]: CurrencyAmount.fromRawAmount(new Token(1, ADDRESS_ONE, 1), 1234),
          [ADDRESS_TWO]: CurrencyAmount.fromRawAmount(new Token(1, ADDRESS_TWO, 10), 795),
        },
        false
      )
      expect(tokenBalances.serialize()).toEqual(
        `[${ADDRESS_ZERO} - 100],[${ADDRESS_ONE} - 123.4],[${ADDRESS_TWO} - 0.0000000795]`
      )
    })

    it('works with empty map', () => {
      const tokenBalances = new TokenBalances({}, false)
      expect(tokenBalances.serialize()).toEqual('')
    })
  })
})
