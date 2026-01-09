# VeTerex

A decentralized platform for tracking and verifying media consumption achievements using non-transferable NFTs.

## Project Structure

```
VeTerex/
├── frontend/          # Chrome Extension & Web App (React + TypeScript)
├── backend/           # API Server (TBD)
└── smart-contract/    # Solidity Smart Contracts (TBD)
```

## Deployed Contracts (liskchain)

- Implementation (VeTerex): 0xa08ddc973F7EdD3c7609AB89CDCB8634D462D904
- Proxy (ERC1967Proxy / VeTerex): 0xc0f194c7332fed0edB39550A66946d09c245B842

## Frontend (Chrome Extension)

The frontend is built as a Chrome Extension with modern web technologies:

- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Zustand** - State Management
- **Wepin SDK** - Web3 Wallet Integration

### Features

- 🎬 Track media consumption (Books, Movies, Anime, Manga, TV Shows)
- 🎖️ Mint soulbound NFTs as proof of completion
- 👥 Connect with users who share the same achievements
- 🔐 Secure wallet integration via Wepin
- 🌐 Works as Chrome Extension or Web App

### Getting Started

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Wepin credentials
   ```

3. **Development Mode (Web)**
   ```bash
   npm run dev
   ```

4. **Build Extension**
   ```bash
   npm run build:extension
   ```

5. **Load Extension in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist-extension` folder
  
YouTube : https://youtu.be/9SDwl_sKYJE



## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| State | Zustand |

| Extension | Chrome Extension Manifest V3 |

## NFT Features

- **Soulbound Tokens**: Non-transferable NFTs that prove genuine completion
- **Media Types**: Books, Movies, Anime, Manga, Comics, TV Shows
- **Rarity System**: Common, Uncommon, Rare, Epic, Legendary
- **Social Features**: Users with matching NFTs can discover each other

## Community

Join groups based on completed media and connect with others who share your interests!

## License

MIT


Business Models

SaaS for recruiters/studios: subscription access to searchable verified completions and candidate contact leads.
API / Data licensing: paid API access and aggregated analytics sold to studios, publishers, and brands.
Marketplace & commissions: marketplace for creators (services, promo deals) with platform take-rate on transactions.
Sponsored campaigns & placement: brands pay to run campaigns, pay creators with completion NFTs or fiat.
Premium features: charge for advanced filtering, batch export, CRM integrations, or token-gated job boards.
Verification & audits: paid verification services (proof-of-watch/learn audits) and KYC for enterprise customers.
Events & experiences: ticketed, NFT-gated events, workshops, or paid AMAs with creators.
Advertising & affiliate: targeted ads or affiliate revenue from driving subscriptions/merch to partners.
Royalties / Secondary sales: create paid drops, merch, or experiences tied to NFTs and collect royalties.

Ways Your Audience Can Earn (while minting stays free)

Bounties & paid tasks: brands/recruiters post paid tasks (review, create clips); users submit proof, earn fiat or tokens.
Referral rewards: refer users or partners and earn cash, platform credits, or tokens per onboarding/engagement.
Token rewards / points: issue a platform token or points for completions, redeemable for cash, perks, or listings.
Creator gigs & hiring: recruiters pay creators discovered via completion NFTs for writing, reviews, or paid sponsorships.
Curator incentives: users who curate high-quality completions (tags, reviews) earn fees or reputation-based payouts.
Affiliate conversions: users get affiliate commissions for driving sales/subscriptions from their completion pages.
NFT-gated revenue share: hold specific completion NFTs to unlock revenue-splitting streams (ad rev, sponsorships).
Leaderboard & prize pools: weekly/monthly contests with token/prize pools funded by sponsors.
Micro-tipping & tipping pools: viewers tip creators for notable reviews/discoveries; platform takes a small fee.
Paid certification & premium badges: offer paid verified certificates or pro badges that creators can sell or use to get jobs.

Mechanics to Keep Minting Free but Sustainable

Free minting, paid utility: charge for discovery, exports, recruiter contacts, or API calls rather than minting.
On-ramp monetization: make certain premium metadata updates, verifications, or commercial uses paid.
Tokenomics: distribute a small % of platform revenue to a staking pool for token holders (incentivizes early users).
Conditional fees: marketplace/listing fees only when creators monetize their completions (no upfront charge).
Sponsor-backed rewards: brands sponsor bounty pools that pay users for specific completion actions.

