export const TENOR_SETTLEMENT_ABI = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "payable",
  },
  {
    type: "receive",
    stateMutability: "payable",
  },

  // ── Read functions ──────────────────────────────────────
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "HOLD_BUFFER",
    inputs: [],
    outputs: [{ name: "", type: "uint64", internalType: "uint64" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MIN_HBAR_PER_REPO",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "SCHEDULE_GAS",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "repos",
    inputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      { name: "lender", type: "address", internalType: "address" },
      { name: "borrower", type: "address", internalType: "address" },
      { name: "security", type: "address", internalType: "address" },
      { name: "partition", type: "bytes32", internalType: "bytes32" },
      { name: "collateralQty", type: "uint256", internalType: "uint256" },
      { name: "cash", type: "address", internalType: "address" },
      { name: "principal", type: "uint256", internalType: "uint256" },
      { name: "repurchase", type: "uint256", internalType: "uint256" },
      { name: "maturity", type: "uint64", internalType: "uint64" },
      { name: "haircutBps", type: "uint256", internalType: "uint256" },
      { name: "closeHoldId", type: "uint256", internalType: "uint256" },
      { name: "scheduleAddress", type: "address", internalType: "address" },
      {
        name: "status",
        type: "uint8",
        internalType: "enum TenorSettlement.Status",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "quoteCancelled",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "eip712Domain",
    inputs: [],
    outputs: [
      { name: "fields", type: "bytes1", internalType: "bytes1" },
      { name: "name", type: "string", internalType: "string" },
      { name: "version", type: "string", internalType: "string" },
      { name: "chainId", type: "uint256", internalType: "uint256" },
      {
        name: "verifyingContract",
        type: "address",
        internalType: "address",
      },
      { name: "salt", type: "bytes32", internalType: "bytes32" },
      { name: "extensions", type: "uint256[]", internalType: "uint256[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hashQuote",
    inputs: [
      {
        name: "q",
        type: "tuple",
        internalType: "struct TenorSettlement.Quote",
        components: [
          { name: "requestId", type: "bytes32", internalType: "bytes32" },
          { name: "lender", type: "address", internalType: "address" },
          { name: "borrower", type: "address", internalType: "address" },
          { name: "security", type: "address", internalType: "address" },
          { name: "partition", type: "bytes32", internalType: "bytes32" },
          {
            name: "collateralQty",
            type: "uint256",
            internalType: "uint256",
          },
          { name: "cash", type: "address", internalType: "address" },
          { name: "principal", type: "uint256", internalType: "uint256" },
          { name: "repurchase", type: "uint256", internalType: "uint256" },
          { name: "maturity", type: "uint64", internalType: "uint64" },
          { name: "quoteExpiry", type: "uint64", internalType: "uint64" },
          { name: "haircutBps", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },

  // ── Write functions ─────────────────────────────────────
  {
    type: "function",
    name: "openRepo",
    inputs: [
      {
        name: "q",
        type: "tuple",
        internalType: "struct TenorSettlement.Quote",
        components: [
          { name: "requestId", type: "bytes32", internalType: "bytes32" },
          { name: "lender", type: "address", internalType: "address" },
          { name: "borrower", type: "address", internalType: "address" },
          { name: "security", type: "address", internalType: "address" },
          { name: "partition", type: "bytes32", internalType: "bytes32" },
          {
            name: "collateralQty",
            type: "uint256",
            internalType: "uint256",
          },
          { name: "cash", type: "address", internalType: "address" },
          { name: "principal", type: "uint256", internalType: "uint256" },
          { name: "repurchase", type: "uint256", internalType: "uint256" },
          { name: "maturity", type: "uint64", internalType: "uint64" },
          { name: "quoteExpiry", type: "uint64", internalType: "uint64" },
          { name: "haircutBps", type: "uint256", internalType: "uint256" },
        ],
      },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "closeRepo",
    inputs: [{ name: "id", type: "bytes32", internalType: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "repayEarly",
    inputs: [{ name: "id", type: "bytes32", internalType: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelQuote",
    inputs: [
      { name: "requestId", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sweep",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },

  // ── Events ──────────────────────────────────────────────
  {
    type: "event",
    name: "EIP712DomainChanged",
    inputs: [],
    anonymous: false,
  },
  {
    type: "event",
    name: "Funded",
    inputs: [
      { name: "from", type: "address", indexed: true, internalType: "address" },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "QuoteCancelled",
    inputs: [
      {
        name: "lender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "requestId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RepoClosed",
    inputs: [
      {
        name: "id",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "repurchasePaid",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "collateralReturned",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RepoDefaulted",
    inputs: [
      {
        name: "id",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "reason",
        type: "string",
        indexed: false,
        internalType: "string",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RepoOpened",
    inputs: [
      {
        name: "id",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "lender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "borrower",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "security",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "collateralQty",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "cash",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "principal",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "repurchase",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "maturity",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "scheduleAddress",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RepoRepaidEarly",
    inputs: [
      {
        name: "id",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "repaidAt",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "scheduledMaturity",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ScheduleStepped",
    inputs: [
      {
        name: "id",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "requested",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "actual",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },

  // ── Errors ──────────────────────────────────────────────
  {
    type: "error",
    name: "AlreadyExists",
    inputs: [{ name: "id", type: "bytes32", internalType: "bytes32" }],
  },
  {
    type: "error",
    name: "BadSignature",
    inputs: [
      { name: "recovered", type: "address", internalType: "address" },
      { name: "expected", type: "address", internalType: "address" },
    ],
  },
  { type: "error", name: "CashLegFailed", inputs: [] },
  { type: "error", name: "ECDSAInvalidSignature", inputs: [] },
  {
    type: "error",
    name: "ECDSAInvalidSignatureLength",
    inputs: [{ name: "length", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "error",
    name: "ECDSAInvalidSignatureS",
    inputs: [{ name: "s", type: "bytes32", internalType: "bytes32" }],
  },
  {
    type: "error",
    name: "InsufficientHbarForUnwind",
    inputs: [
      { name: "have", type: "uint256", internalType: "uint256" },
      { name: "need", type: "uint256", internalType: "uint256" },
    ],
  },
  { type: "error", name: "InvalidShortString", inputs: [] },
  { type: "error", name: "MaturityInPast", inputs: [] },
  {
    type: "error",
    name: "NoScheduleCapacity",
    inputs: [{ name: "maturity", type: "uint64", internalType: "uint64" }],
  },
  {
    type: "error",
    name: "NotBorrower",
    inputs: [
      { name: "expected", type: "address", internalType: "address" },
      { name: "actual", type: "address", internalType: "address" },
    ],
  },
  {
    type: "error",
    name: "NotOpen",
    inputs: [{ name: "id", type: "bytes32", internalType: "bytes32" }],
  },
  { type: "error", name: "NotOwner", inputs: [] },
  {
    type: "error",
    name: "QuoteExpired",
    inputs: [
      { name: "quoteExpiry", type: "uint64", internalType: "uint64" },
    ],
  },
  {
    type: "error",
    name: "QuoteWasCancelled",
    inputs: [
      { name: "requestId", type: "bytes32", internalType: "bytes32" },
    ],
  },
  {
    type: "error",
    name: "ScheduleFailed",
    inputs: [
      { name: "responseCode", type: "int64", internalType: "int64" },
    ],
  },
  {
    type: "error",
    name: "StringTooLong",
    inputs: [{ name: "str", type: "string", internalType: "string" }],
  },
] as const;

export const TENOR_SETTLEMENT_ADDRESS = process.env
  .NEXT_PUBLIC_TENOR_SETTLEMENT_ADDRESS as `0x${string}`;
