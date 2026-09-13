<p align="center">
  <img src="public/logo.svg" alt="Tenor" width="280" />
</p>

<p align="center">
  <strong>Repurchase agreements, settled on Hedera.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.3.1-white?style=flat-square" alt="version" />
  <img src="https://img.shields.io/badge/hedera-testnet-8B5CF6?style=flat-square" alt="hedera testnet" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="license" />
</p>

---

Tenor moves repo settlement on-chain. Lenders sign quotes with EIP-712 typed data, borrowers post collateral and execute on the TenorSettlement smart contract, and every lifecycle event is recorded to an immutable audit trail on Hedera Consensus Service.

## How it works

```
Lender signs quote (off-chain, gasless)
        |
        v
Borrower calls openRepo (on-chain)
        |
  +-----------+-----------+
  |           |           |
USDC flows   Collateral   Scheduled
to borrower  escrowed     maturity set
        |
        v
At maturity: borrower repays, collateral returns
         or: borrower defaults, lender claims collateral
```

**1. Lender signs a quote** — defines terms (principal, repurchase price, maturity, haircut) and commits with an EIP-712 signature. No transaction, no gas.

**2. Borrower opens the repo** — reviews the signed quote, posts collateral, and calls `openRepo` on the smart contract. Principal transfers from lender to borrower atomically.

**3. Settlement at maturity** — the borrower repays the repurchase amount and recovers collateral. Early repayment is supported. If the borrower does not repay, the lender claims the collateral.

## Architecture

| Layer | Technology |
|-------|-----------|
| Smart contract | Solidity on Hedera EVM (fast finality, low fees, native scheduled transactions) |
| Security tokens | ATS-compliant ERC-1400 with transfer restrictions enforced at contract level |
| Signatures | EIP-712 typed data via wagmi/viem |
| Audit trail | Hedera Consensus Service (HCS) — tamper-proof, timestamped event log |
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Wallet | WalletConnect + Rabby/MetaMask via wagmi v3 |
| Database | SQLite (better-sqlite3) for quote/repo indexing |
| Deployment | Docker (standalone) on Railway |

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/sign-quote` | Lender creates and signs a repo quote |
| `/open-repo` | Borrower views and executes available quotes |
| `/dashboard` | View active repos, repay early, countdown to maturity |
| `/setup` | One-time ERC-20 approvals for USDC and security tokens |
| `/compliance-test` | Test ATS transfer restrictions |
| `/audit` | Browse HCS audit trail and publish messages |

## Quick start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Fill in the values (see Environment section below)

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Description | Build-time |
|----------|-------------|:----------:|
| `NEXT_PUBLIC_TENOR_SETTLEMENT_ADDRESS` | TenorSettlement contract (EVM address) | Yes |
| `NEXT_PUBLIC_HEDERA_RPC_URL` | Hedera JSON-RPC relay | Yes |
| `NEXT_PUBLIC_USDC_ADDRESS` | USDC token address on Hedera | Yes |
| `NEXT_PUBLIC_SECURITY_ADDRESS` | ATS security token (bond) address | Yes |
| `NEXT_PUBLIC_HCS_TOPIC_ID` | HCS topic for audit trail | Yes |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | Yes |
| `HEDERA_OPERATOR_ID` | Hedera account for HCS publishing | No |
| `HEDERA_OPERATOR_KEY` | ECDSA private key for HCS publishing | No |
| `DATABASE_PATH` | SQLite database file path | No |

> `NEXT_PUBLIC_*` variables are inlined at build time. Changing them requires a full rebuild, not just a restart.

## Docker

```bash
docker build -t tenor-app .
docker run -p 3000:3000 -v tenor-data:/data tenor-app
```

For Railway or similar platforms, set all `NEXT_PUBLIC_*` variables in the dashboard. They are passed as Docker build args automatically.

## Contract

The `TenorSettlement` contract exposes:

- `openRepo(quote, signature)` — verify EIP-712 signature, transfer principal, escrow collateral, schedule maturity
- `repayEarly(id)` — borrower repays before maturity
- `closeRepo(id)` — settlement at maturity
- `claimCollateral(id)` — lender claims after default
- `cancelQuote(requestId)` — lender invalidates an unused quote

All lifecycle events emit on-chain logs and are mirrored to HCS for an independent audit trail.

## License

MIT
