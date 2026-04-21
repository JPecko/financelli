export interface BankOption {
  code: string
  name: string
  logoDomain: string
  logoPath: string   // local fallback
}

const LOGO_DEV_TOKEN = import.meta.env.VITE_LOGO_DEV_TOKEN as string | undefined

export function bankLogoUrl(domain: string): string {
  return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN ?? ''}&size=64&retina=true`
}

export const BANK_OPTIONS: BankOption[] = [
  { code: 'millennium', name: 'Millennium BCP', logoDomain: 'millenniumbcp.pt', logoPath: '/banks/millennium.svg' },
  { code: 'novobanco',  name: 'Novo Banco',     logoDomain: 'novobanco.pt',     logoPath: '/banks/novobanco.svg' },
  { code: 'cgd',        name: 'Caixa Geral',    logoDomain: 'cgd.pt',           logoPath: '/banks/cgd.svg' },
  { code: 'santander',  name: 'Santander',      logoDomain: 'santander.pt',     logoPath: '/banks/santander.svg' },
  { code: 'bpi',        name: 'BPI',            logoDomain: 'bancobpi.pt',      logoPath: '/banks/bpi.svg' },
  { code: 'moey',       name: 'Moey!',          logoDomain: 'moey.pt',          logoPath: '/banks/moey.svg' },
  { code: 'activo',     name: 'ActivoBank',     logoDomain: 'activobank.pt',    logoPath: '/banks/activo.svg' },
  { code: 'degiro',     name: 'DEGIRO',         logoDomain: 'degiro.pt',        logoPath: '/banks/degiro.svg' },
  { code: 'xtb',        name: 'XTB',            logoDomain: 'xtb.com',          logoPath: '/banks/xtb.svg' },
  { code: 'trading212', name: 'Trading 212',    logoDomain: 'trading212.com',   logoPath: '/banks/trading212.svg' },
  { code: 'etoro',      name: 'eToro',          logoDomain: 'etoro.com',        logoPath: '/banks/etoro.svg' },
  { code: 'ibkr',       name: 'Interactive Brokers', logoDomain: 'interactivebrokers.com', logoPath: '/banks/ibkr.svg' },
  { code: 'revolut',    name: 'Revolut',        logoDomain: 'revolut.com',      logoPath: '/banks/revolut.svg' },
  { code: 'n26',        name: 'N26',            logoDomain: 'n26.com',          logoPath: '/banks/n26.svg' },
  { code: 'wise',       name: 'Wise',           logoDomain: 'wise.com',         logoPath: '/banks/wise.svg' },
  { code: 'traderepublic', name: 'Trade Republic', logoDomain: 'traderepublic.com', logoPath: '/banks/traderepublic.svg' },
  // Meal cards
  { code: 'edenred',   name: 'Edenred',   logoDomain: 'edenred.pt',    logoPath: '/banks/edenred.svg' },
  { code: 'pluxee',    name: 'Pluxee',    logoDomain: 'pluxee.com',    logoPath: '/banks/pluxee.svg' },
  { code: 'coverflex', name: 'Coverflex', logoDomain: 'coverflex.com', logoPath: '/banks/coverflex.svg' },
  { code: 'nect',      name: 'Nect',      logoDomain: 'nect.pt',       logoPath: '/banks/nect.svg' },
]
