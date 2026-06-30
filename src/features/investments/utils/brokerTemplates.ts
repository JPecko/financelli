export type BrokerKey = 'xtb' | 'degiro' | 'traderepublic'

export interface BrokerTemplate {
  label: string
  separator: string
  // if true, skip rows until a row whose first cell matches `headerFirstCell`
  skipToHeader?: boolean
  headerFirstCell?: string
  // column names in the CSV header row
  columns: {
    date: string
    name: string
    ticker?: string
    isin?: string
    quantity: string
    price: string
    // if set, qty+price are parsed from this column via regex
    commentCol?: string
    commentRegex?: string   // capture groups: 1=qty, 2=price
    // if set, buy/sell is determined by the sign of this numeric column
    amountSignCol?: string
    // if set, buy/sell is determined by this column's value
    typeCol?: string
    buyValue?: string
    sellValue?: string
  }
  // date-fns format string for parsing the date column
  dateFormat: string
  // decimal separator used in numeric fields ('.' or ',')
  decimalSeparator: '.' | ','
}

export const BROKER_TEMPLATES: Record<BrokerKey, BrokerTemplate> = {
  xtb: {
    label: 'XTB',
    separator: '\t',
    skipToHeader: true,
    headerFirstCell: 'Type',
    columns: {
      date:         'Time',
      name:         'Instrument',
      ticker:       'Ticker',
      quantity:     '',            // derived from comment
      price:        '',            // derived from comment
      commentCol:   'Comment',
      commentRegex: 'OPEN BUY ([\\d.]+)(?:/[\\d.]+)? @ ([\\d.]+)',
      typeCol:      'Type',
      buyValue:     'Stock purchase',
    },
    dateFormat:       'yyyy-MM-dd HH:mm:ss',
    decimalSeparator: '.',
  },

  degiro: {
    label: 'DEGIRO',
    separator: ',',
    columns: {
      date:           'Data',
      name:           'Produto',
      isin:           'ISIN',
      quantity:       'Quantidade',
      price:          'Preços',
      amountSignCol:  'Valor EUR',
    },
    dateFormat:       'dd-MM-yyyy',
    decimalSeparator: ',',
  },

  traderepublic: {
    label: 'Trade Republic',
    separator: ',',
    columns: {
      date:     'date',
      name:     'name',
      isin:     'symbol',
      quantity: 'shares',
      price:    'price',
      typeCol:  'category',
      buyValue: 'TRADING',
    },
    dateFormat:       'yyyy-MM-dd',
    decimalSeparator: '.',
  },
}
