# 🎰 Gacha Game

A full-stack gacha game with banners, characters, coupons, and daily rewards.

## Tech Stack

- **Frontend**: React 19, styled-components, framer-motion
- **Backend**: Node.js, Express, Sequelize ORM
- **Database**: SQLite (local) / PostgreSQL (production)

## Local Development

### Backend

```bash
cd backend
npm install
# Create a .env file with: JWT_SECRET=your-secret-key
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend runs on `http://localhost:3000` and backend on `http://localhost:5000`.

---

## 🚀 Free Auto-Deployment with Render

This project is configured for **automatic deployment** on [Render.com](https://render.com) (free tier).

### One-Click Deploy

1. **Push to GitHub** - Create a repo and push your code
2. **Connect to Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com)
   - Click **"New +"** → **"Blueprint"**
   - Connect your GitHub repo
   - Render will auto-detect the `render.yaml` file

3. **Done!** 🎉 Render will automatically:
   - Create a PostgreSQL database (free)
   - Deploy the backend API
   - Deploy the frontend static site
   - Auto-redeploy on every `git push`

### What Gets Deployed

| Service | Type | URL |
|---------|------|-----|
| `gacha-api` | Web Service | `https://gacha-api.onrender.com` |
| `gacha-frontend` | Static Site | `https://gacha-frontend.onrender.com` |
| `gacha-db` | PostgreSQL | Internal connection |

### Environment Variables (Auto-Configured)

The `render.yaml` blueprint automatically sets:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Auto-generated secure secret
- `REACT_APP_API_URL` - Backend URL for frontend

### Optional Security Environment Variables

These are optional but recommended for production:

#### reCAPTCHA v3 (Bot Protection)
Get your keys from [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin):
- `RECAPTCHA_SECRET_KEY` - Backend secret key (required to enable reCAPTCHA)
- `RECAPTCHA_SITE_KEY` - Frontend site key (backend env var, sent to frontend)
- `REACT_APP_RECAPTCHA_SITE_KEY` - Frontend site key (build-time env var)

After adding these, enable reCAPTCHA in Admin > Security > Configuration by setting `RECAPTCHA_ENABLED` to `true`.

#### Google OAuth (Optional SSO)
- `REACT_APP_GOOGLE_CLIENT_ID` - Google OAuth client ID for login

### Manual Deployment (Alternative)

If you prefer manual setup:

#### Backend (Web Service)
1. Create a **Web Service** on Render
2. Connect your repo, set root directory to `backend`
3. Build: `npm install`
4. Start: `node app.js`
5. Add env vars: `JWT_SECRET`, `DATABASE_URL`

#### Frontend (Static Site)
1. Create a **Static Site** on Render
2. Connect your repo, set root directory to `frontend`
3. Build: `npm install && npm run build`
4. Publish directory: `build`
5. Add env var: `REACT_APP_API_URL=your-backend-url.onrender.com`

#### Database
1. Create a **PostgreSQL** database (free tier)
2. Copy the **External Database URL**
3. Add it as `DATABASE_URL` to your backend service

---

## Features

- 🎲 **Gacha Rolling** - Single & multi-pulls with pity system
- 🎫 **Banners** - Time-limited rate-up banners
- 👥 **Characters** - Collect characters of varying rarities
- 🎁 **Daily Rewards** - Claim free points every hour
- 🎟️ **Coupons** - Redeem codes for rewards
- 👤 **User System** - Auth with JWT tokens
- 🔧 **Admin Panel** - Manage banners, characters, coupons
- 🔒 **Security System** - Risk scoring, CAPTCHA, rate limiting

## Security Features

The application includes a comprehensive security system:

### Bot Protection (reCAPTCHA v3)
- **Invisible verification** - No user interaction required for most requests
- **Score-based detection** - Automatically blocks suspicious bots
- **Action-specific thresholds** - Different sensitivity for trades vs. login
- **Fallback challenges** - Math problems when reCAPTCHA unavailable

### Risk Score System
- **Automated scoring** - Detects suspicious patterns (multiple devices, banned account links)
- **Configurable thresholds** - Admin-adjustable via Security Config panel
- **Automatic enforcement** - Shadowbans, temporary bans at risk thresholds
- **Manual override** - Admins can adjust or reset user risk scores

### Admin Security Dashboard
Access via Admin Panel > Security tab:
- **Overview** - System-wide security metrics
- **High-Risk Users** - Users flagged for suspicious activity
- **Audit Log** - All security events with export
- **Appeals** - Review user restriction appeals
- **Configuration** - Adjust all security parameters at runtime

## Rarity Drop Rates

| Rarity | Standard | Multi-Pull | Banner |
|--------|----------|------------|--------|
| Common | 60% | 55% | 35% |
| Uncommon | 25% | 25% | 25% |
| Rare | 10% | 12% | 20% |
| Epic | 4% | 6% | 15% |
| Legendary | 1% | 2% | 5% |

---

## Free Hosting Limits (Render)

- ⏰ Free services spin down after 15 mins of inactivity
- 🚀 First request after sleep takes ~30 seconds
- 💾 750 free hours/month (enough for one always-on service)
- 🗄️ PostgreSQL: 256MB storage, 1GB bandwidth

Perfect for personal projects and small communities!

