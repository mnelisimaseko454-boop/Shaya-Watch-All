// ✅ FIXED: Use callApi directly - Telegraf sendInvoice drops title
await bot.telegram.callApi('sendInvoice', {
  chat_id: parseInt(user_id),
  title: `Shaya Watch ${planClean}`,
  description: `${planClean} - 30 Days - ${perAdText}/ad - 20/day - $20 Min Withdraw`,
  payload: payload,
  provider_token: '',
  currency: 'XTR',
  prices: [{ label: `${planClean} - 30 Days`, amount: stars }],
  start_parameter: `vip_${planClean}`
});


Here is your FULLY FIXED index.js to paste — with that fix already inside:

javascript
// ===== SHAYA WATCH - FULL BACKEND - index.js =====
// Giga Ad 9114 + Giga Offerwall 9114 + OnclickA 472254
// VIP with Telegram Stars ⭐ - 250 / 500 / 1000 Stars - Auto-Activate

const express = require('express');
const path = require('path');
const { Telegraf } = require('telegraf');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://shaya-watch-all.onrender.com';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const ADMIN_ID = parseInt(process.env.ADMIN_ID || '0');
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

// ===== SUPABASE CLIENT (optional) =====
let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase connected');
  } else {
    console.log('Supabase NOT set - using memory storage');
  }
} catch (e) { console.log('Supabase init failed, using memory', e.message); }

// ===== MEMORY STORAGE =====
const users = new Map();
const withdrawals = [];
const vipRequests = [];
const offerwallRewards = [];
const tasksList = [
  { id: 1, title: 'Join Shaya Watch Channel', link: 'https://t.me/ShayaWatchAllBot', reward_cash: 0.05, reward_coins: 20 },
  { id: 2, title: 'Invite 3 Friends', link: 'https://t.me/ShayaWatchAllBot', reward_cash: 0.10, reward_coins: 50 },
  { id: 3, title: 'Watch 5 Ads Today', link: 'https://t.me/ShayaWatchAllBot', reward_cash: 0.05, reward_coins: 20 },
  { id: 4, title: 'Share Shaya Watch on WhatsApp', link: 'https://t.me/ShayaWatchAllBot', reward_cash: 0.05, reward_coins: 10 },
];

// ===== CONFIG =====
let USDT_TO_ZAR = 16.59;
let lastRateFetch = 0;

// VIP STARS - 1 USD = 50 Stars
const VIP_STARS_MAP = { 'VIP': 250, 'VIP PRO': 500, 'VIP ELITE': 1000 };

async function refreshRate() {
  const now = Date.now();
  if (now - lastRateFetch < 30 * 60 * 1000) return USDT_TO_ZAR;
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const d = await res.json();
    if (d && d.rates && d.rates.ZAR) {
      USDT_TO_ZAR = parseFloat(d.rates.ZAR);
      lastRateFetch = now;
      console.log('Rate updated: 1 USDT = R' + USDT_TO_ZAR);
    }
  } catch (e) { console.log('Rate fetch failed, using cached', USDT_TO_ZAR); }
  return USDT_TO_ZAR;
}
refreshRate();
setInterval(refreshRate, 30 * 60 * 1000);

// VIP PLANS - 30 DAYS
function getVipPlans(region) {
  const isSA = region === 'SA';
  const cur = isSA ? 'R' : '$';
  return {
    'VIP': {
      name: 'VIP', priceUSD: 5, price: isSA ? 5 * USDT_TO_ZAR : 5,
      currency: cur, perAdUSD: 0.025, perAdCash: isSA ? 0.025 * USDT_TO_ZAR : 0.025,
      perAdCoins: 10, dailyLimit: 20, minWithdrawUSDT: 20, days: 30, stars: 250
    },
    'VIP PRO': {
      name: 'VIP PRO', priceUSD: 10, price: isSA ? 10 * USDT_TO_ZAR : 10,
      currency: cur, perAdUSD: 0.05, perAdCash: isSA ? 0.05 * USDT_TO_ZAR : 0.05,
      perAdCoins: 20, dailyLimit: 20, minWithdrawUSDT: 20, days: 30, stars: 500
    },
    'VIP ELITE': {
      name: 'VIP ELITE', priceUSD: 20, price: isSA ? 20 * USDT_TO_ZAR : 20,
      currency: cur, perAdUSD: 0.10, perAdCash: isSA ? 0.10 * USDT_TO_ZAR : 0.10,
      perAdCoins: 40, dailyLimit: 20, minWithdrawUSDT: 20, days: 30, stars: 1000
    }
  };
}

function getPerAd(user) {
  const region = user.region || 'SA';
  const isSA = region === 'SA';
  if (!user.vip_level || user.vip_level === 'FREE') {
    return { cash: isSA ? 0.01 * USDT_TO_ZAR : 0.01, coins: 5, usd: 0.01, dailyLimit: 10, minWithdrawUSDT: 50 };
  }
  const plans = getVipPlans(region);
  const p = plans[user.vip_level] || plans['VIP'];
  return { cash: p.perAdCash, coins: p.perAdCoins, usd: p.perAdUSD, dailyLimit: p.dailyLimit, minWithdrawUSDT: p.minWithdrawUSDT };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ===== SUPABASE HELPERS =====
async function sbGetUser(user_id) {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from('users').select('*').eq('user_id', user_id).single();
    return data || null;
  } catch (e) { return null; }
}
async function sbUpsertUser(u) {
  if (!supabase) return;
  try { await supabase.from('users').upsert(u, { onConflict: 'user_id' }); } catch (e) { console.log('sb upsert user failed', e.message); }
}
async function sbInsert(table, row) {
  if (!supabase) return;
  try { await supabase.from(table).insert(row); } catch (e) { console.log('sb insert', table, 'failed', e.message); }
}

// ===== USER LOGIC =====
async function getUser(user_id) {
  user_id = parseInt(user_id);
  if (users.has(user_id)) return users.get(user_id);
  const sb = await sbGetUser(user_id);
  if (sb) {
    const mapped = {
      user_id: sb.user_id, username: sb.username || '', first_name: sb.first_name || '',
      region: sb.region || 'SA', currency: sb.region === 'USA' ? '$' : 'R',
      balance: parseFloat(sb.balance || 0), coins: parseInt(sb.coins || 0),
      total_ads: parseInt(sb.total_ads || 0), referrals: parseInt(sb.referrals || 0),
      streak: parseInt(sb.streak || 0), vip_level: sb.vip_level || 'FREE', vip_until: sb.vip_until || null,
      total_earned: parseFloat(sb.total_earned || 0),
      dailyAds: 0, dailyDate: todayStr(), lastDaily: sb.last_daily || null, referred_by: sb.referred_by || null
    };
    users.set(user_id, mapped);
    return mapped;
  }
  return null;
}

async function createUser(user_id, data = {}) {
  user_id = parseInt(user_id);
  const region = data.region || 'SA';
  const u = {
    user_id, username: data.username || '', first_name: data.first_name || '',
    region, currency: region === 'USA' ? '$' : 'R',
    balance: 0, coins: 0, total_ads: 0, referrals: 0, streak: 0,
    vip_level: 'FREE', vip_until: null, total_earned: 0,
    dailyAds: 0, dailyDate: todayStr(), lastDaily: null,
    referred_by: data.referred_by || null
  };
  users.set(user_id, u);
  await sbUpsertUser({
    user_id: u.user_id, username: u.username, first_name: u.first_name,
    region: u.region, balance: u.balance, coins: u.coins,
    total_ads: u.total_ads, referrals: u.referrals, streak: u.streak,
    vip_level: u.vip_level, vip_until: u.vip_until, total_earned: u.total_earned,
    referred_by: u.referred_by
  });
  if (data.referred_by && parseInt(data.referred_by) !== user_id) {
    const refId = parseInt(data.referred_by);
    let ref = await getUser(refId);
    if (!ref) ref = await createUser(refId, {});
    const isSA = ref.region === 'SA';
    const bonusCash = isSA ? 0.50 * USDT_TO_ZAR : 0.10;
    const bonusCoins = isSA ? 50 : 10;
    ref.balance += bonusCash;
    ref.coins += bonusCoins;
    ref.referrals += 1;
    ref.total_earned += bonusCash;
    await updateUser(refId, { balance: ref.balance, coins: ref.coins, referrals: ref.referrals, total_earned: ref.total_earned });
    console.log(`Referral: ${refId} +${bonusCash} from ${user_id}`);
  }
  return u;
}

async function updateUser(user_id, patch) {
  user_id = parseInt(user_id);
  let u = users.get(user_id);
  if (!u) u = await getUser(user_id);
  if (!u) return null;
  Object.assign(u, patch);
  users.set(user_id, u);
  await sbUpsertUser({
    user_id: u.user_id, username: u.username, first_name: u.first_name,
    region: u.region, balance: u.balance, coins: u.coins,
    total_ads: u.total_ads, referrals: u.referrals, streak: u.streak,
    vip_level: u.vip_level, vip_until: u.vip_until, total_earned: u.total_earned,
    referred_by: u.referred_by, last_daily: u.lastDaily
  });
  return u;
}

function formatUserForFrontend(u) {
  if (u.dailyDate !== todayStr()) {
    u.dailyAds = 0;
    u.dailyDate = todayStr();
  }
  if (u.vip_level !== 'FREE' && u.vip_until) {
    const until = new Date(u.vip_until);
    if (until < new Date()) {
      u.vip_level = 'FREE';
      u.vip_until = null;
    }
  }
  const perAd = getPerAd(u);
  const dailyLimit = perAd.dailyLimit;
  const dailyAds = u.dailyAds || 0;
  const dailyLeft = Math.max(0, dailyLimit - dailyAds);
  const usdtBal = u.region === 'SA' ? (u.balance / USDT_TO_ZAR) : u.balance;
  return {
    ...u,
    perAd,
    dailyLimit, dailyAds, dailyLeft,
    minWithdrawUSDT: perAd.minWithdrawUSDT,
    usdtToZar: USDT_TO_ZAR,
    usdtBalance: parseFloat(usdtBal.toFixed(4))
  };
}

// ===== API ROUTES =====
app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/api/rate', async (req, res) => {
  const rate = await refreshRate();
  res.json({ usdtToZar: rate, usdt: 1, zar: rate });
});
app.get('/api/convert-usdt', async (req, res) => {
  const usdt = parseFloat(req.query.usdt || 0);
  const rate = await refreshRate();
  res.json({ usdt, zar: (usdt * rate).toFixed(2), rate });
});
app.get('/api/user/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  let u = await getUser(id);
  if (!u) return res.json({ error: 'user not found - send /start in bot first' });
  res.json(formatUserForFrontend(u));
});
app.post('/api/sync', async (req, res) => {
  const { user_id, balance, coins, total_ads, referrals, streak, region, vip_level, total_earned } = req.body;
  let u = await getUser(parseInt(user_id));
  if (!u) u = await createUser(parseInt(user_id), { region: region || 'SA' });
  const patch = {};
  if (balance !== undefined) patch.balance = parseFloat(balance);
  if (coins !== undefined) patch.coins = parseInt(coins);
  if (total_ads !== undefined) patch.total_ads = parseInt(total_ads);
  if (referrals !== undefined) patch.referrals = parseInt(referrals);
  if (streak !== undefined) patch.streak = parseInt(streak);
  if (total_earned !== undefined) patch.total_earned = parseFloat(total_earned);
  if (region) { patch.region = region; patch.currency = region === 'USA' ? '$' : 'R'; }
  if (vip_level) patch.vip_level = vip_level;
  const updated = await updateUser(parseInt(user_id), patch);
  res.json({ success: true, user: formatUserForFrontend(updated) });
});
app.post('/api/set-region', async (req, res) => {
  const { user_id, region } = req.body;
  if (!['SA', 'USA'].includes(region)) return res.json({ error: 'Invalid region' });
  let u = await getUser(parseInt(user_id));
  if (!u) return res.json({ error: 'user not found' });
  if (u.region === region) return res.json({ success: true, user: formatUserForFrontend(u), message: 'Already ' + region });
  const rate = await refreshRate();
  const oldRegion = u.region;
  const oldBalance = u.balance;
  let newBalance = oldBalance;
  if (oldRegion === 'SA' && region === 'USA') {
    newBalance = oldBalance / rate;
  } else if (oldRegion === 'USA' && region === 'SA') {
    newBalance = oldBalance * rate;
  }
  const updated = await updateUser(parseInt(user_id), {
    region, currency: region === 'USA' ? '$' : 'R', balance: parseFloat(newBalance.toFixed(2))
  });
  console.log(`Region: ${user_id} ${oldRegion} ${oldBalance} -> ${region} ${updated.currency}${newBalance.toFixed(2)}`);
  res.json({ success: true, user: formatUserForFrontend(updated) });
});
app.post('/api/watch', async (req, res) => {
  const { user_id } = req.body;
  let u = await getUser(parseInt(user_id));
  if (!u) return res.json({ error: 'user not found' });
  if (u.dailyDate !== todayStr()) { u.dailyAds = 0; u.dailyDate = todayStr(); }
  const perAd = getPerAd(u);
  if ((u.dailyAds || 0) >= perAd.dailyLimit) {
    return res.json({ error: `Daily limit reached! ${u.vip_level} = ${perAd.dailyLimit}/day. Upgrade to VIP for 20/day.`, dailyAds: u.dailyAds, dailyLimit: perAd.dailyLimit });
  }
  const earnedCash = perAd.cash;
  const earnedCoins = perAd.coins;
  const earnedUSD = perAd.usd;
  const updated = await updateUser(parseInt(user_id), {
    balance: parseFloat((u.balance + earnedCash).toFixed(2)),
    coins: u.coins + earnedCoins,
    total_ads: (u.total_ads || 0) + 1,
    total_earned: parseFloat(((u.total_earned || 0) + earnedCash).toFixed(2)),
    dailyAds: (u.dailyAds || 0) + 1,
    dailyDate: todayStr()
  });
  res.json({
    success: true,
    earnedCash: parseFloat(earnedCash.toFixed(2)),
    earnedCoins, earnedUSD,
    dailyAds: updated.dailyAds, dailyLimit: perAd.dailyLimit,
    dailyLeft: perAd.dailyLimit - updated.dailyAds,
    balance: updated.balance
  });
});
app.post('/api/daily', async (req, res) => {
  const { user_id } = req.body;
  let u = await getUser(parseInt(user_id));
  if (!u) return res.json({ error: 'user not found' });
  if (u.lastDaily === todayStr()) return res.json({ error: 'Already claimed today! Come back tomorrow.' });
  const isSA = u.region === 'SA';
  const bonusCash = isSA ? 0.05 * USDT_TO_ZAR : 0.05;
  const bonusCoins = 20;
  const newStreak = (u.streak || 0) + 1;
  const updated = await updateUser(parseInt(user_id), {
    balance: parseFloat((u.balance + bonusCash).toFixed(2)),
    coins: u.coins + bonusCoins,
    streak: newStreak,
    lastDaily: todayStr()
  });
  res.json({ success: true, bonusCash: parseFloat(bonusCash.toFixed(2)), bonusCoins, streak: newStreak, balance: updated.balance });
});
app.post('/api/convert', async (req, res) => {
  const { user_id } = req.body;
  let u = await getUser(parseInt(user_id));
  if (!u) return res.json({ error: 'user not found' });
  if ((u.coins || 0) < 1000) return res.json({ error: `Need 1000 Coins to convert. You have ${u.coins}.` });
  const thousands = Math.floor(u.coins / 1000);
  const usdValue = thousands * 1;
  const cashValue = u.region === 'SA' ? usdValue * USDT_TO_ZAR : usdValue;
  const remainingCoins = u.coins - (thousands * 1000);
  const updated = await updateUser(parseInt(user_id), {
    balance: parseFloat((u.balance + cashValue).toFixed(2)),
    coins: remainingCoins,
    total_earned: parseFloat(((u.total_earned || 0) + cashValue).toFixed(2))
  });
  res.json({ success: true, converted: parseFloat(cashValue.toFixed(2)), coinsUsed: thousands * 1000, remainingCoins, balance: updated.balance });
});
app.post('/api/withdraw', async (req, res) => {
  const { user_id, method, wallet } = req.body;
  let u = await getUser(parseInt(user_id));
  if (!u) return res.json({ error: 'user not found' });
  const perAd = getPerAd(u);
  const minUSDT = perAd.minWithdrawUSDT;
  const minCash = u.region === 'SA' ? minUSDT * USDT_TO_ZAR : minUSDT;
  if (u.balance < minCash) {
    return res.json({ error: `Min withdraw is $${minUSDT} USDT (${u.currency}${minCash.toFixed(2)}). You have ${u.currency}${u.balance.toFixed(2)}.` });
  }
  if (!wallet || wallet.length < 4) return res.json({ error: 'Enter your wallet / bank details' });
  const usdtAmount = u.region === 'SA' ? (u.balance / USDT_TO_ZAR) : u.balance;
  const zarAmount = u.region === 'SA' ? u.balance : u.balance * USDT_TO_ZAR;
  const w = {
    id: withdrawals.length + 1, user_id: parseInt(user_id),
    username: u.username, first_name: u.first_name,
    method: method || 'USDT TRC20', wallet,
    amountCash: parseFloat(u.balance.toFixed(2)), usdtAmount: parseFloat(usdtAmount.toFixed(2)), zarAmount: parseFloat(zarAmount.toFixed(2)),
    region: u.region, vip_level: u.vip_level,
    status: 'pending', created_at: new Date().toISOString()
  };
  withdrawals.push(w);
  await sbInsert('withdrawals', w);
  await updateUser(parseInt(user_id), { balance: 0 });
  try {
    if (bot && ADMIN_ID) {
      bot.telegram.sendMessage(ADMIN_ID, `💸 NEW WITHDRAW\nUser: ${u.first_name} (@${u.username}) ID: ${u.user_id}\nAmount: ${u.currency}${w.amountCash} = $${w.usdtAmount} USDT = R${w.zarAmount}\nMethod: ${w.method}\nWallet: ${wallet}\nRegion: ${u.region} | VIP: ${u.vip_level}`);
    }
  } catch (e) {}
  res.json({ success: true, usdtAmount: w.usdtAmount, zarAmount: w.zarAmount, message: 'Request sent! Admin pays in 24h.' });
});
app.get('/api/vip-plans', async (req, res) => {
  const region = req.query.region || 'SA';
  res.json(getVipPlans(region));
});
app.post('/api/request-vip', async (req, res) => {
  const { user_id, plan, method, proof } = req.body;
  let u = await getUser(parseInt(user_id));
  if (!u) return res.json({ error: 'user not found' });
  const plans = getVipPlans(u.region);
  const p = plans;
  if (!p) return res.json({ error: 'Invalid plan' });
  const reqObj = {
    id: vipRequests.length + 1, user_id: parseInt(user_id),
    username: u.username, first_name: u.first_name,
    plan, price: p.price, priceUSD: p.priceUSD, region: u.region,
    method: method || 'Stars', proof: proof || '',
    status: 'pending', created_at: new Date().toISOString()
  };
  vipRequests.push(reqObj);
  await sbInsert('vip_requests', reqObj);
  try {
    if (bot && ADMIN_ID) {
      bot.telegram.sendMessage(ADMIN_ID, `👑 NEW VIP REQUEST\nUser: ${u.first_name} (@${u.username}) ID: ${u.user_id}\nPlan: ${plan}\nPrice: ${u.currency}${p.price.toFixed(2)} ($${p.priceUSD})\nMethod: ${method}\nProof: ${proof}\nRegion: ${u.region}\n\nApprove with:\n/approvevip ${u.user_id} ${plan}`);
    }
  } catch (e) {}
  res.json({ success: true, price: p.price, plan });
});
app.get('/api/tasks', (req, res) => res.json(tasksList));
app.get('/api/leaderboard', async (req, res) => {
  const all = Array.from(users.values())
    .sort((a, b) => (b.balance + (b.coins / 1000) * (b.region === 'SA' ? USDT_TO_ZAR : 1)) - (a.balance + (a.coins / 1000) * (a.region === 'SA' ? USDT_TO_ZAR : 1)))
    .slice(0, 20)
    .map(u => ({ user_id: u.user_id, username: u.username, first_name: u.first_name, region: u.region, vip_level: u.vip_level, balance: u.balance, coins: u.coins }));
  res.json(all);
});
app.post('/api/offerwall-credit', async (req, res) => {
  const { user_id, amount, source } = req.body;
  let u = await getUser(parseInt(user_id));
  if (!u) return res.json({ error: 'user not found' });
  const coinsToAdd = Math.floor(parseFloat(amount) || 0);
  if (coinsToAdd <= 0) return res.json({ error: 'Invalid amount' });
  const updated = await updateUser(parseInt(user_id), {
    coins: (u.coins || 0) + coinsToAdd,
    total_earned: (u.total_earned || 0) + (coinsToAdd / 1000)
  });
  const log = { user_id: parseInt(user_id), amount: coinsToAdd, source: source || 'giga-offerwall-9114', created_at: new Date().toISOString() };
  offerwallRewards.push(log);
  await sbInsert('offerwall_rewards', log);
  console.log(`Offerwall: ${user_id} +${coinsToAdd} Coins from ${source}`);
  res.json({ success: true, coinsAdded: coinsToAdd, user: formatUserForFrontend(updated) });
});
async function fetchYouTube(query, region, maxResults = 12) {
  if (!YOUTUBE_API_KEY) return [];
  try {
    const regionCode = region === 'SA' ? 'ZA' : 'US';
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(query)}&regionCode=${regionCode}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    const d = await res.json();
    if (!d.items) return [];
    return d.items.map(it => ({
      id: it.id.videoId,
      title: it.snippet.title,
      channel: it.snippet.channelTitle,
      thumb: it.snippet.thumbnails?.medium?.url || '',
      views: 'Trending',
      url: `https://www.youtube.com/watch?v=${it.id.videoId}`
    }));
  } catch (e) { console.log('YT fetch failed', e.message); return []; }
}
app.get('/api/videos/trending', async (req, res) => {
  const region = req.query.region || 'SA';
  const q = region === 'SA' ? 'Amapiano trending South Africa 2026' : 'Trending USA Hip Hop 2026';
  const vids = await fetchYouTube(q, region);
  res.json(vids);
});
app.get('/api/videos/music', async (req, res) => {
  const region = req.query.region || 'SA';
  const q = region === 'SA' ? 'Amapiano Kabza De Small DJ Maphorisa' : 'Hip Hop Music Videos 2026';
  const vids = await fetchYouTube(q, region);
  res.json(vids);
});
app.get('/api/videos/search', async (req, res) => {
  const q = req.query.q || 'Amapiano';
  const region = req.query.region || 'SA';
  const vids = await fetchYouTube(q, region);
  res.json(vids);
});
app.get('/api/admin/pending', (req, res) => {
  res.json({ withdrawals: withdrawals.filter(w => w.status === 'pending'), vipRequests: vipRequests.filter(v => v.status === 'pending'), offerwallRewards: offerwallRewards.slice(-20) });
});

// ===== TELEGRAM BOT =====
let bot = null;
if (BOT_TOKEN) {
  bot = new Telegraf(BOT_TOKEN);

  bot.start(async (ctx) => {
    const user_id = ctx.from.id;
    const payload = ctx.startPayload || '';
    let referred_by = null;
    if (payload.startsWith('ref_')) referred_by = payload.replace('ref_', '');
    let u = await getUser(user_id);
    if (!u) {
      u = await createUser(user_id, {
        username: ctx.from.username || '',
        first_name: ctx.from.first_name || '',
        referred_by: referred_by ? parseInt(referred_by) : null
      });
    }
    const rate = await refreshRate();
    const welcome = `👋 Welcome to *SHAYA WATCH* ${u.first_name}!\n\n` +
      `🔥 *EARN PLANS*\n` +
      `• FREE: $0.01/ad • 10/day • $50 Min\n` +
      `• VIP: $0.025/ad • 20/day • $20 Min • 250 ⭐\n` +
      `• VIP PRO: $0.05/ad • 20/day • $20 Min • 500 ⭐\n` +
      `• VIP ELITE: $0.10/ad • 20/day • $20 Min • 1000 ⭐\n\n` +
      `💱 1 USDT = R${rate.toFixed(2)} LIVE\n` +
      `🎁 Daily Bonus + Offers + Invite = More Coins\n\n` +
      `Tap below to open the app 👇`;
    await ctx.replyWithMarkdown(welcome, {
      reply_markup: {
        inline_keyboard: [[{ text: '🚀 OPEN SHAYA WATCH', web_app: { url: WEBAPP_URL } }]]
      }
    });
  });

  bot.command('balance', async (ctx) => {
    let u = await getUser(ctx.from.id);
    if (!u) return ctx.reply('Send /start first');
    const f = formatUserForFrontend(u);
    ctx.reply(`💰 Balance: ${f.currency}${f.balance.toFixed(2)} = $${f.usdtBalance} USDT\n🪙 Coins: ${f.coins} ($${(f.coins / 1000).toFixed(2)})\n📺 Ads Today: ${f.dailyAds}/${f.dailyLimit}\n👑 VIP: ${f.vip_level}`);
  });

  bot.command('approvevip', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply('Admin only');
    const parts = ctx.message.text.split(' ');
    const targetId = parseInt(parts[1]);
    const planName = parts.slice(2).join(' ') || 'VIP';
    let u = await getUser(targetId);
    if (!u) return ctx.reply('User not found');
    const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await updateUser(targetId, { vip_level: planName, vip_until: until });
    const vr = vipRequests.find(v => v.user_id === targetId && v.plan === planName);
    if (vr) vr.status = 'approved';
    ctx.reply(`✅ Approved ${planName} for ${u.first_name} (${targetId}) until ${until}`);
    try { await ctx.telegram.sendMessage(targetId, `🎉 Your ${planName} is ACTIVE until ${until}! You now earn more per ad + $20 Min withdraw.`); } catch (e) {}
  });

  bot.command('paywithdraw', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply('Admin only');
    const id = parseInt(ctx.message.text.split(' ')[1]);
    const w = withdrawals.find(x => x.id === id);
    if (!w) return ctx.reply('Withdraw not found');
    w.status = 'paid';
    ctx.reply(`✅ Marked withdraw #${id} as PAID`);
    try { await ctx.telegram.sendMessage(w.user_id, `✅ Your withdraw of $${w.usdtAmount} USDT has been PAID! Check your ${w.method}: ${w.wallet}`); } catch (e) {}
  });

  bot.command('stats', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const totalUsers = users.size;
    const totalPaid = withdrawals.filter(w => w.status === 'paid').length;
    const pending = withdrawals.filter(w => w.status === 'pending').length;
    ctx.reply(`📊 STATS\nUsers: ${totalUsers}\nWithdraws Paid: ${totalPaid}\nPending: ${pending}\nVIP Requests: ${vipRequests.filter(v => v.status === 'pending').length}\nRate: 1 USDT = R${USDT_TO_ZAR.toFixed(2)}`);
  });

  // ===== VIP WITH TELEGRAM STARS ⭐ - FIXED with callApi =====
  app.post('/api/vip-stars-invoice', async (req, res) => {
    const { user_id, plan } = req.body;
    let u = await getUser(parseInt(user_id));
    if (!u) return res.json({ error: 'user not found - send /start in bot first' });
    const stars = parseInt(VIP_STARS_MAP || 250);
    if (!bot) return res.json({ error: 'Bot not connected' });
    try {
      const planClean = (plan || 'VIP').trim();
      const perAdText = planClean === 'VIP' ? '$0.025' : planClean === 'VIP PRO' ? '$0.05' : '$0.10';
      const payload = `vip_${planClean}_${user_id}_${Date.now()}`;

      // ✅ FIXED: Use callApi directly - Telegraf sendInvoice drops title
      await bot.telegram.callApi('sendInvoice', {
        chat_id: parseInt(user_id),
        title: `Shaya Watch ${planClean}`,
        description: `${planClean} - 30 Days - ${perAdText}/ad - 20/day - $20 Min Withdraw`,
        payload: payload,
        provider_token: '',
        currency: 'XTR',
        prices: [{ label: `${planClean} - 30 Days`, amount: stars }],
        start_parameter: `vip_${planClean}`
      });
      console.log(`Stars invoice sent: ${user_id} ${planClean} ${stars} ⭐`);
      res.json({ success: true, stars, plan: planClean });
    } catch (e) {
      console.log('Stars invoice failed', e.message);
      res.json({ error: 'Could not send invoice. Make sure you pressed /start in @ShayaWatchAllBot first. Error: ' + e.message });
    }
  });

  bot.on('pre_checkout_query', async (ctx) => {
    try { await ctx.answerPreCheckoutQuery(true); } catch (e) { console.log('pre_checkout failed', e.message); }
  });

  bot.on('successful_payment', async (ctx) => {
    const pay = ctx.message.successful_payment;
    const payload = pay.invoice_payload || '';
    let plan = 'VIP';
    if (payload.includes('VIP PRO')) plan = 'VIP PRO';
    else if (payload.includes('VIP ELITE')) plan = 'VIP ELITE';
    else if (payload.includes('VIP')) plan = 'VIP';

    const user_id = ctx.from.id;
    const starsPaid = pay.total_amount;
    const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let u = await getUser(user_id);
    if (!u) u = await createUser(user_id, { username: ctx.from.username || '', first_name: ctx.from.first_name || '' });

    await updateUser(user_id, { vip_level: plan, vip_until: until });
    console.log(`⭐ STARS PAID: ${user_id} ${plan} ${starsPaid} Stars - Activated until ${until}`);

    await ctx.reply(`🎉 VIP ACTIVATED!\n\n👑 Plan: ${plan}\n⭐ Paid: ${starsPaid} Stars\n📅 Until: ${until}\n\nYou now earn more per ad + $20 Min Withdraw!\nGo back to the app and refresh!`, {
      reply_markup: { inline_keyboard: [[{ text: '🚀 OPEN SHAYA WATCH', web_app: { url: WEBAPP_URL } }]] }
    });

    if (ADMIN_ID) {
      try {
        await ctx.telegram.sendMessage(ADMIN_ID, `⭐ STARS RECEIVED!\nUser: ${ctx.from.first_name} (@${ctx.from.username}) ID: ${user_id}\nPlan: ${plan}\nStars: ${starsPaid} ⭐\nUntil: ${until}\n\nStars are in your Bot balance. Transfer them in BotFather > Your Bot > Payments > Transfer Stars.`);
      } catch (e) {}
    }
  });

  bot.launch().then(() => console.log('Bot launched @ShayaWatchAllBot')).catch(e => console.log('Bot launch failed', e.message));
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
} else {
  console.log('⚠️ BOT_TOKEN not set - bot disabled, API still works');
}

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`✅ Shaya Watch running on port ${PORT}`);
  console.log(`WebApp: ${WEBAPP_URL}`);
  console.log(`Giga Ad: 9114 | Offerwall: 9114 | OnclickA: 472254 | VIP Stars: 250/500/1000`);
});

