// Static GICS sector mapping for all tracked symbols
export const SECTOR_MAP = {
  // Technology
  AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology', GOOG: 'Technology',
  GOOGL: 'Technology', META: 'Technology', AVGO: 'Technology', ADBE: 'Technology',
  CRM: 'Technology', AMD: 'Technology', INTC: 'Technology', QCOM: 'Technology',
  TXN: 'Technology', AMAT: 'Technology', MU: 'Technology', LRCX: 'Technology',
  SNPS: 'Technology', CDNS: 'Technology', KLAC: 'Technology', MRVL: 'Technology',
  ADI: 'Technology', NXPI: 'Technology', FTNT: 'Technology', PANW: 'Technology',
  CRWD: 'Technology', ON: 'Technology', SMCI: 'Technology', MCHP: 'Technology',
  GEN: 'Technology', ORCL: 'Technology', IBM: 'Technology', ACN: 'Technology',
  CSCO: 'Technology', HPQ: 'Technology', HPE: 'Technology', DELL: 'Technology',
  PLTR: 'Technology', NOW: 'Technology', INTU: 'Technology', ADSK: 'Technology',
  ANSS: 'Technology', ASML: 'Technology', CDW: 'Technology', CTSH: 'Technology',
  DDOG: 'Technology', GFS: 'Technology', WDAY: 'Technology', ZS: 'Technology',
  TTD: 'Technology', MDB: 'Technology', TEAM: 'Technology', ARM: 'Technology',

  // Communication Services
  NFLX: 'Communication Services', DIS: 'Communication Services',
  CMCSA: 'Communication Services', TMUS: 'Communication Services',
  VZ: 'Communication Services', T: 'Communication Services',
  CHTR: 'Communication Services', EA: 'Communication Services',
  TTWO: 'Communication Services', WBD: 'Communication Services',

  // Consumer Discretionary
  AMZN: 'Consumer Discretionary', TSLA: 'Consumer Discretionary',
  HD: 'Consumer Discretionary', MCD: 'Consumer Discretionary',
  NKE: 'Consumer Discretionary', SBUX: 'Consumer Discretionary',
  LOW: 'Consumer Discretionary', TJX: 'Consumer Discretionary',
  BKNG: 'Consumer Discretionary', MAR: 'Consumer Discretionary',
  ORLY: 'Consumer Discretionary', ROST: 'Consumer Discretionary',
  DHI: 'Consumer Discretionary', GM: 'Consumer Discretionary',
  F: 'Consumer Discretionary', ABNB: 'Consumer Discretionary',
  CMG: 'Consumer Discretionary', YUM: 'Consumer Discretionary',
  LULU: 'Consumer Discretionary', DASH: 'Consumer Discretionary',
  MELI: 'Consumer Discretionary',

  // Consumer Staples
  PG: 'Consumer Staples', KO: 'Consumer Staples', PEP: 'Consumer Staples',
  COST: 'Consumer Staples', WMT: 'Consumer Staples', PM: 'Consumer Staples',
  MO: 'Consumer Staples', CL: 'Consumer Staples', MDLZ: 'Consumer Staples',
  KHC: 'Consumer Staples', GIS: 'Consumer Staples', KDP: 'Consumer Staples',
  MNST: 'Consumer Staples', CCEP: 'Consumer Staples',

  // Healthcare
  UNH: 'Healthcare', JNJ: 'Healthcare', LLY: 'Healthcare', PFE: 'Healthcare',
  ABBV: 'Healthcare', MRK: 'Healthcare', TMO: 'Healthcare', ABT: 'Healthcare',
  DHR: 'Healthcare', BMY: 'Healthcare', AMGN: 'Healthcare', GILD: 'Healthcare',
  ISRG: 'Healthcare', VRTX: 'Healthcare', REGN: 'Healthcare', MDT: 'Healthcare',
  SYK: 'Healthcare', BSX: 'Healthcare', ZTS: 'Healthcare', EW: 'Healthcare',
  MRNA: 'Healthcare', DXCM: 'Healthcare', BIIB: 'Healthcare', ILMN: 'Healthcare',
  IDXX: 'Healthcare', CI: 'Healthcare', GEHC: 'Healthcare', BDX: 'Healthcare',
  AZN: 'Healthcare',

  // Financials
  JPM: 'Financials', V: 'Financials', MA: 'Financials', BAC: 'Financials',
  WFC: 'Financials', GS: 'Financials', MS: 'Financials', BLK: 'Financials',
  SCHW: 'Financials', C: 'Financials', AXP: 'Financials', MMC: 'Financials',
  CB: 'Financials', PGR: 'Financials', AON: 'Financials', CME: 'Financials',
  ICE: 'Financials', MCO: 'Financials', SPGI: 'Financials', TRV: 'Financials',
  AIG: 'Financials', MET: 'Financials', PRU: 'Financials', 'BRK-B': 'Financials',
  PYPL: 'Financials', FI: 'Financials', COIN: 'Financials', HOOD: 'Financials',
  MSTR: 'Financials',

  // Industrials
  CAT: 'Industrials', HON: 'Industrials', UNP: 'Industrials', UPS: 'Industrials',
  BA: 'Industrials', RTX: 'Industrials', DE: 'Industrials', LMT: 'Industrials',
  GE: 'Industrials', MMM: 'Industrials', EMR: 'Industrials', ETN: 'Industrials',
  ITW: 'Industrials', WM: 'Industrials', RSG: 'Industrials', CSX: 'Industrials',
  NSC: 'Industrials', FDX: 'Industrials', ADP: 'Industrials', CTAS: 'Industrials',
  FAST: 'Industrials', ODFL: 'Industrials', PAYX: 'Industrials', PCAR: 'Industrials',
  ROP: 'Industrials', VRSK: 'Industrials', CSGP: 'Industrials',

  // Energy
  XOM: 'Energy', CVX: 'Energy', COP: 'Energy', EOG: 'Energy',
  SLB: 'Energy', MPC: 'Energy', PSX: 'Energy', VLO: 'Energy',
  OXY: 'Energy', HAL: 'Energy', BKR: 'Energy',

  // Utilities
  NEE: 'Utilities', DUK: 'Utilities', SO: 'Utilities', D: 'Utilities',
  AEP: 'Utilities', SRE: 'Utilities', EXC: 'Utilities', XEL: 'Utilities',
  CEG: 'Utilities',

  // Real Estate
  PLD: 'Real Estate', AMT: 'Real Estate', CCI: 'Real Estate',
  EQIX: 'Real Estate', SPG: 'Real Estate', O: 'Real Estate',
  PSA: 'Real Estate', WELL: 'Real Estate',

  // Materials
  LIN: 'Materials', APD: 'Materials', SHW: 'Materials', ECL: 'Materials',
  NEM: 'Materials', FCX: 'Materials', DOW: 'Materials', DD: 'Materials',
};
