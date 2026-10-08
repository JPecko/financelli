export type BrokerKey = 'xtb' | 'degiro' | 'traderepublic'

export interface BrokerTemplate {
  label: string
  // ordered steps to export a transaction history file from this broker's app
  exportSteps: string[]
  separator: string
  // if true, skip rows until a row whose first cell matches `headerFirstCell`
  skipToHeader?: boolean
  headerFirstCell?: string
  // column names in the CSV header row — a string, or a list of accepted
  // aliases (e.g. DEGIRO exports headers in the account's display language)
  columns: {
    date: string | string[]
    name: string | string[]
    ticker?: string | string[]
    isin?: string | string[]
    quantity: string | string[]
    price: string | string[]
    // if set, qty+price are parsed from this column via regex
    commentCol?: string
    commentRegex?: string   // capture groups: 1=qty, 2=price
    // if set, buy/sell is determined by the sign of this numeric column
    amountSignCol?: string | string[]
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
    exportSteps: [
      'Profile → Trade history',
      'Cash operations',
      'Export → New report',
      'Select period',
      'Generate report',
      'Download',
    ],
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
      // ticker is optional: newer exports write "OPEN BUY VUAA.DE 0.7363 @ 134.44"
      commentRegex: 'OPEN BUY (?:\\S+ )?([\\d.]+)(?:/[\\d.]+)? @ ([\\d.]+)',
      typeCol:      'Type',
      buyValue:     'Stock purchase',
    },
    dateFormat:       'yyyy-MM-dd HH:mm:ss',
    decimalSeparator: '.',
  },

  degiro: {
    label: 'DEGIRO',
    exportSteps: [
      'Bottom menu → Inbox',
      'Transactions',
      'Select date range',
      'Export → CSV',
    ],
    separator: ',',
    columns: {
      date:           ['Data', 'Date'],
      name:           ['Produto', 'Product'],
      isin:           'ISIN',
      quantity:       ['Quantidade', 'Quantity'],
      price:          ['Preços', 'Price'],
      amountSignCol:  ['Valor EUR', 'Value EUR'],
    },
    dateFormat:       'dd-MM-yyyy',
    decimalSeparator: ',',
  },

  traderepublic: {
    label: 'Trade Republic',
    exportSteps: [
      'Profile → Statements',
      'Transaction export',
      'Create',
      'Select period',
      'Export',
    ],
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
