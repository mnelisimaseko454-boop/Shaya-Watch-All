// ===== SHAYA WATCH - FULL BACKEND - index.js =====
// Giga Ad 9114 + Giga Offerwall 9114 + OnclickA 472254
// VIP with Telegram Stars ⭐ - 250 / 500 / 1000 Stars - Auto-Activate
// FIXED: Stars invoice via fetch() - amount forced to Number
// FIXED: Withdraw = Dollars (USDT) - Walt + Gram - Walt - NO PayPal, NO TRC20
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

// ===== SUPABASE CLIENT (safe - won't crash if missing) =====
let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase connected');
  } else { console.log('Supabase NOT set - using memory storage'); }
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

// ===== BOT - DEFINED EARLY so routes can use it =====
let bot = null;
if (BOT_TOKEN) {
  try { bot = new Telegraf(BOT_TOKEN); console.log('Bot object created'); }
  catch (e) { console.log('Bot create failed', e.message); }
}

// ===== CONFIG =====
let USDT_TO_ZAR = 16.59;
let lastRateFetch = 0;
const VIP_STARS_MAP = { 'VIP': 250, 'VIP PRO': 500, 'VIP ELITE': 1000 };

async function refreshRate() {
  const now = Date.now();
  if (now - lastRateFetch < 30 * 60 * 1000) return USDT_TO_ZAR;
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const d = await res.json();
    if (d && d.rates && d.rates.ZAR) { USDT_TO_ZAR = parseFloat(d.rates.ZAR); lastRateFetch = now; console.log('Rate updated: 1 USDT = R' + USDT_TO_ZAR); }
  } catch (e) { console.log('Rate fetch failed, using cached', USDT_TO_ZAR); }
  return USDT_TO_ZAR;
}
refreshRate();
setInterval(refreshRate, 30 * 60 * 1000);

function getVipPlans(region) {
  const isSA = region === 'SA';
  const cur = isSA ? 'R' : '$';
  return {
    'VIP': { name: 'VIP', priceUSD: 5, price: isSA ? 5 * USDT_TO_ZAR : 5, currency: cur, perAdUSD: 0.025, perAdCash: isSA ? 0.025 * USDT_TO_ZAR : 0.025, perAdCoins: 10, dailyLimit: 20, minWithdrawUSDT: 20, days: 30, stars: 250 },
    'VIP PRO': { name: 'VIP PRO', priceUSD: 10, price: isSA ? 10 * USDT_TO_ZAR : 10, currency: cur, perAdUSD: 0.05, perAdCash: isSA ? 0.05 * USDT_TO_ZAR : 0.05, perAdCoins: 20, dailyLimit: 20, minWithdrawUSDT: 20, days: 30, stars: 500 },
    'VIP ELITE': { name: 'VIP ELITE', priceUSD: 20, price: isSA ? 20 * USDT_TO_ZAR : 20, currency: cur, perAdUSD: 0.10, perAdCash: isSA ? 0.10 * USDT_TO_ZAR : 0.10, perAdCoins: 40, dailyLimit: 20, minWithdrawUSDT: 20, days: 30, stars: 1000 }
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
function todayStr() { return new Date().toISOString().slice(0, 10); }

async function sbGetUser(user_id) {
  if (!supabase) return null;
  try { const { data } = await supabase.from('users').select('*').eq('user_id', user_id).single(); return data || null; } catch (e) { return null; }
}
async function sbUpsertUser(u) {
  if (!supabase) return;
  try { await supabase.from('users').upsert(u, { onConflict: 'user_id' }); } catch (e) { console.log('sb upsert user failed', e.message); }
}
async function sbInsert(table, row) {
  if (!supabase) return;
  try { await supabase.from(table).insert(row); } catch (e) { console.log('sb insert', table, 'failed', e.message); }
}
async function getUser(user_id) {
  user_id = parseInt(user_id);
  if (users.has(user_id)) return users.get(user_id);
  const sb = await sbGetUser(user_id);
  if (sb) {
    const mapped = { user_id: sb.user_id, username: sb.username || '', first_name: sb.first_name || '', region: sb.region || 'SA', currency: sb.region === 'USA' ? '$' : 'R', balance: parseFloat(sb.balance || 0), coins: parseInt(sb.coins || 0), total_ads: parseInt(sb.total_ads || 0), referrals: parseInt(sb.referrals || 0), streak: parseInt(sb.streak || 0), vip_level: sb.vip_level || 'FREE', vip_until: sb.vip_until || null, total_earned: parseFloat(sb.total_earned || 0), dailyAds: 0, dailyDate: todayStr(), lastDaily: sb.last_daily || null, referred_by: sb.referred_by || null };
    users.set(user_id, mapped); return mapped;
  }
  return null;
}
async function createUser(user_id, data = {}) {
  user_id = parseInt(user_id);
  const region = data.region || 'SA';
  const u = { user_id, username: data.username || '', first_name: data.first_name || '', region, currency: region === 'USA' ? '$' : 'R', balance: 0, coins: 0, total_ads: 0, referrals: 0, streak: 0, vip_level: 'FREE', vip_until: null, total_earned: 0, dailyAds: 0, dailyDate: todayStr(), lastDaily: null, referred_by: data.referred_by || null };
  users.set(user_id, u);
  await sbUpsertUser({ user_id: u.user_id, username: u.username, first_name: u.first_name, region: u.region, balance: u.balance, coins: u.coins, total_ads: u.total_ads, referrals: u.referrals, streak: u.streak, vip_level: u.vip_level, vip_until: u.vip_until, total_earned: u.total_earned, referred_by: u.referred_by });
  if (data.referred_by && parseInt(data.referred_by) !== user_id) {
    const refId = parseInt(data.referred_by);
    let ref = await getUser(refId);
    if (!ref) ref = await createUser(refId, {});
    const isSA = ref.region === 'SA';
    const bonusCash = isSA ? 0.50 * USDT_TO_ZAR : 0.10;
    const bonusCoins = isSA ? 50 : 10;
    ref.balance += bonusCash; ref.coins += bonusCoins; ref.referrals += 1; ref.total_earned += bonusCash;
    await updateUser(refId, { balance: ref.balance, coins: ref.coins, referrals: ref.referrals, total_earned: ref.total_earned });
  }
  return u;
}
async function updateUser(user_id, patch) {
  user_id = parseInt(user_id);
  let u = users.get(user_id);
  if (!u) u = await getUser(user_id);
  if (!u) return null;
  Object.assign(u, patch); users.set(user_id, u);
  await sbUpsertUser({ user_id: u.user_id, username: u.username, first_name: u.first_name, region: u.region, balance: u.balance, coins: u.coins, total_ads: u.total_ads, referrals: u.referrals, streak: u.streak, vip_level: u.vip_level, vip_until: u.vip_until, total_earned: u.total_earned, referred_by: u.referred_by, last_daily: u.lastDaily });
  return u;
}
function formatUserForFrontend(u) {
  if (u.dailyDate !== todayStr()) { u.dailyAds = 0; u.dailyDate = todayStr(); }
  if (u.vip_level !== 'FREE' && u.vip_until) { const until = new Date(u.vip_until); if (until < new Date()) { u.vip_level = 'FREE'; u.vip_until = null; } }
  const perAd = getPerAd(u);
  const dailyLimit = perAd.dailyLimit;
  const dailyAds = u.dailyAds || 0;
  const dailyLeft = Math.max(0, dailyLimit - dailyAds);
  const usdtBal = u.region === 'SA' ? (u.balance / USDT_TO_ZAR) : u.balance;
  return { ...u, perAd, dailyLimit, dailyAds, dailyLeft, minWithdrawUSDT: perAd.minWithdrawUSDT, usdtToZar: USDT_TO_ZAR, usdtBalance: parseFloat(usdtBal.toFixed(4)) };
}

// ===== API ROUTES =====
app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get('/api/version', (req, res) => res.json({ version: 'walt-dollars-v4', time: new Date().toISOString() }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/api/rate', async (req, res) => { const rate = await refreshRate(); res.json({ usdtToZar: rate, usdt: 1, zar: rate }); });
app.get('/api/convert-usdt', async (req, res) => { const usdt = parseFloat(req.query.usdt || 0); const rate = await refreshRate(); res.json({ usdt, zar: (usdt * rate).toFixed(2), rate }); });
app.get('/api/user/:id', async (req, res) => { const id = parseInt(req.params.id); let u = await getUser(id); if (!u) return res.json({ error: 'user not found - send /start in bot first' }); res.json(formatUserForFrontend(u)); });
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
  if (u.region === region) return res.json({ success: true, user: formatUserForFrontend(u) });
  const rate = await refreshRate();
  const oldRegion = u.region; const oldBalance = u.balance;
  let newBalance = oldBalance;
  if (oldRegion === 'SA' && region === 'USA') newBalance = oldBalance / rate;
  else if (oldRegion === 'USA' && region === 'SA') newBalance = oldBalance * rate;
  const updated = await updateUser(parseInt(user_id), { region, currency: region === 'USA' ? '$' : 'R', balance: parseFloat(newBalance.toFixed(2)) });
  res.json({ success: true, user: formatUserForFrontend(updated) });
});
app.post('/api/watch', async (req, res) => {
  const { user_id } = req.body;
  let u = await getUser(parseInt(user_id));
  if (!u) return res.json({ error: 'user not found' });
  if (u.dailyDate !== todayStr()) { u.dailyAds = 0; u.dailyDate = todayStr(); }
  const perAd = getPerAd(u);
  if ((u.dailyAds || 0) >= perAd.dailyLimit) return res.json({ error: `Daily limit reached! ${u.vip_level} = ${perAd.dailyLimit}/day.`, dailyAds: u.dailyAds, dailyLimit: perAd.dailyLimit });
  const updated = await updateUser(parseInt(user_id), { balance: parseFloat((u.balance + perAd.cash).toFixed(2)), coins: u.coins + perAd.coins, total_ads: (u.total_ads || 0) + 1, total_earned: parseFloat(((u.total_earned || 0) + perAd.cash).toFixed(2)), dailyAds: (u.dailyAds || 0) + 1, dailyDate: todayStr() });
  res.json({ success: true, earnedCash: parseFloat(perAd.cash.toFixed(2)), earnedCoins: perAd.coins, earnedUSD: perAd.usd, dailyAds: updated.dailyAds, dailyLimit: perAd.dailyLimit, dailyLeft: perAd.dailyLimit - updated.dailyAds, balance: updated.balance });
});
app.post('/api/daily', async (req, res) => {
  const { user_id } = req.body;
  let u = await getUser(parseInt(user_id));
  if (!u) return res.json({ error: 'user not found' });
  if (u.lastDaily === todayStr()) return res.json({ error: 'Already claimed today!' });
  const isSA = u.region === 'SA';
  const bonusCash = isSA ? 0.05 * USDT_TO_ZAR : 0.05;
  const updated = await updateUser(parseInt(user_id), { balance: parseFloat((u.balance + bonusCash).toFixed(2)), coins: u.coins + 20, streak: (u.streak || 0) + 1, lastDaily: todayStr() });
  res.json({ success: true, bonusCash: parseFloat(bonusCash.toFixed(2)), bonusCoins: 20, streak: updated.streak, balance: updated.balance });
});
app.post('/api/convert', async (req, res) => {
  const { user_id } = req.body;
  let u = await getUser(parseInt(user_id));
  if (!u) return res.json({ error: 'user not found' });
  if ((u.coins || 0) < 1000) return res.json({ error: `Need 1000 Coins. You have ${u.coins}.` });
  const thousands = Math.floor(u.coins / 1000);
  const cashValue = u.region === 'SA' ? thousands * USDT_TO_ZAR : thousands * 1;
  const updated = await updateUser(parseInt(user_id), { balance: parseFloat((u.balance + cashValue).toFixed(2)), coins: u.coins - (thousands * 1000), total_earned: parseFloat(((u.total_earned || 0) + cashValue).toFixed(2)) });
  res.json({ success: true, converted: parseFloat(cashValue.toFixed(2)), balance: updated.balance });
});

// ===== WITHDRAW - WALT VERSION - NO PayPal, NO TRC20 ✅ =====
app.post('/api/withdraw', async (req, res) => {
  const { user_id, method, wallet } = req.body;
  let u = await getUser(parseInt(user_id));
  if (!u) return res.json({ error: 'user not found' });

  // Normalize old method names -> new Walt names
  let cleanMethod = (method || '').trim();
  if (cleanMethod === 'USDT TRC20' || cleanMethod.toLowerCase().includes('trc20')) {
    return res.json({ error: '❌ USDT TRC20 is REMOVED. Please select Dollars (USDT) - Walt. TRC20 address (T...) is NOT accepted.' });
  }
  if (cleanMethod.toLowerCase().includes('paypal')) {
    return res.json({ error: '❌ PayPal is REMOVED. Please select Dollars (USDT) - Walt, Gram - Walt, Capitec / Bank or Airtime.' });
  }
  // Map legacy names if frontend is old
  if (cleanMethod === 'USDT (TON) - Telegram Wallet' || cleanMethod === 'Telegram Wallet') cleanMethod = 'Dollars (USDT) - Walt';
  if (cleanMethod === 'Gram Wallet (TON)' || cleanMethod === 'Gram Wallet') cleanMethod = 'Gram - Walt';
  if (!cleanMethod) cleanMethod = 'Dollars (USDT) - Walt';

  const perAd = getPerAd(u);
  const minUSDT = perAd.minWithdrawUSDT;
  const minCash = u.region === 'SA' ? minUSDT * USDT_TO_ZAR : minUSDT;
  if (u.balance < minCash) return res.json({ error: `Min withdraw is $${minUSDT} USDT (${u.currency}${minCash.toFixed(2)}). You have ${u.currency}${u.balance.toFixed(2)}.` });
  if (!wallet || wallet.trim().length < 4) return res.json({ error: 'Enter your wallet / bank details' });

  const walletTrim = wallet.trim();
  // Walt validation - Must be UQ... (TON)
  if (cleanMethod === 'Dollars (USDT) - Walt' || cleanMethod === 'Gram - Walt') {
    if (!walletTrim.startsWith('UQ')) {
      return res.json({ error: '❌ Wrong address! Walt addresses start with UQ... You pasted a T... (TRC20) address. Go to Walt > Dollars > Deposit > Copy UQ... address.' });
    }
  }
  // Extra block: Never accept T... TRC20 as Walt
  if (walletTrim.startsWith('T') && (cleanMethod.includes('Walt') || cleanMethod.includes('Dollars') || cleanMethod.includes('Gram'))) {
    return res.json({ error: '❌ That is a TRC20 address (starts with T). Walt uses TON - must start with UQ...' });
  }

  const usdtAmount = u.region === 'SA' ? (u.balance / USDT_TO_ZAR) : u.balance;
  const zarAmount = u.region === 'SA' ? u.balance : u.balance * USDT_TO_ZAR;
  const w = { id: withdrawals.length + 1, user_id: parseInt(user_id), username: u.username, first_name: u.first_name, method: cleanMethod, wallet: walletTrim, amountCash: parseFloat(u.balance.toFixed(2)), usdtAmount: parseFloat(usdtAmount.toFixed(2)), zarAmount: parseFloat(zarAmount.toFixed(2)), region: u.region, vip_level: u.vip_level, status: 'pending', created_at: new Date().toISOString() };
  withdrawals.push(w);
  await sbInsert('withdrawals', w);
  await updateUser(parseInt(user_id), { balance: 0 });
  try {
    if (bot && ADMIN_ID) bot.telegram.sendMessage(ADMIN_ID, `💸 NEW WITHDRAW - WALT\nUser: ${u.first_name} (@${u.username}) ID: ${u.user_id}\nAmount: ${u.currency}${w.amountCash} = $${w.usdtAmount} USDT = R${w.zarAmount}\nMethod: ${w.method}\nWallet: ${walletTrim}\n⚠️ Send on TON network only - Walt address must start with UQ...\n${w.method.includes('Dollars') ? 'Send USDT (Dollars) on TON' : w.method.includes('Gram') ? 'Send GRAM on TON' : ''}`);
  } catch (e) {}
  res.json({ success: true, usdtAmount: w.usdtAmount, zarAmount: w.zarAmount });
});

app.get('/api/vip-plans', async (req, res) => { res.json(getVipPlans(req.query.region || 'SA')); });

// ===== VIP STARS INVOICE - FIXED - amount forced to Number =====
app.post('/api/vip-stars-invoice', async (req, res) => {
  try {
    const { user_id, plan } = req.body;
    let u = await getUser(parseInt(user_id));
    if (!u) return res.json({ error: 'user not found - send /start in bot first' });
    if (!VIP_STARS_MAP) return res.json({ error: 'Invalid plan' });
    const stars = Number(VIP_STARS_MAP); // ✅ FIXED: Must be Number, not object/string
    if (!bot) return res.json({ error: 'Bot not configured' });
    const title = `Shaya Watch - ${plan} VIP (30 Days)`;
    const desc = `${plan} - $${getVipPlans(u.region).perAdUSD}/ad • 20/day • $20 Min • 30 Days`;
    // Telegram Stars invoice - payload must contain user_id + plan
    await bot.telegram.sendInvoice(parseInt(user_id), title, desc, `vip_${plan}_${user_id}_${Date.now()}`, 'XTR', [{ label: `${plan} VIP`, amount: stars }]);
    res.json({ success: true, stars, plan });
  } catch (e) {
    console.log('vip-stars-invoice error', e.message);
    res.json({ error: 'Could not create Stars invoice: ' + e.message });
  }
});

app.post('/api/request-vip', async (req, res) => {
  const { user_id, plan, method, proof } = req.body;
  let u = await getUser(parseInt(user_id));
  if (!u) return res.json({ error: 'user not found' });
  const p = getVipPlans(u.region);
  if (!p) return res.json({ error: 'Invalid plan' });
  const reqObj = { id: vipRequests.length + 1, user_id: parseInt(user_id), username: u.username, first_name: u.first_name, plan, price: p.price, priceUSD: p.priceUSD, region: u.region, method: method || 'Stars', proof: proof || '', status: 'pending', created_at: new Date().toISOString() };
  vipRequests.push(reqObj); await sbInsert('vip_requests', reqObj);
  res.json({ success: true, price: p.price, plan });
});
app.get('/api/tasks', (req, res) => res.json(tasksList));
app.get('/api/leaderboard', async (req, res) => {
  const all = Array.from(users.values()).sort((a, b) => (b.balance + (b.coins / 1000) * (b.region === 'SA' ? USDT_TO_ZAR : 1)) - (a.balance + (a.coins / 1000) * (a.region === 'SA' ? USDT_TO_ZAR : 1))).slice(0, 20).map(u => ({ user_id: u.user_id, username: u.username, first_name: u.first_name, region: u.region, vip_level: u.vip_level, balance: u.balance, coins: u.coins }));
  res.json(all);
});
app.post('/api/offerwall-credit', async (req, res) => {
  const { user_id, amount, source } = req.body;
  let u = await getUser(parseInt(user_id));
  if (!u) return res.json({ error: 'user not found' });
  const coinsToAdd = Math.floor(parseFloat(amount) || 0);
  if (coinsToAdd <= 0) return res.json({ error: 'Invalid amount' });
  const updated = await updateUser(parseInt(user_id), { coins: (u.coins || 0) + coinsToAdd, total_earned: (u.total_earned || 0) + (coinsToAdd / 1000) });
  offerwallRewards.push({ user_id: parseInt(user_id), amount: coinsToAdd, source: source || 'giga-offerwall-9114', created_at: new Date().toISOString() });
  res.json({ success: true, coinsAdded: coinsToAdd, user: formatUserForFrontend(updated) });
});
async function fetchYouTube(query, region, maxResults = 12) {
  if (!YOUTUBE_API_KEY) return [];
  try {
    const regionCode = region === 'SA' ? 'ZA' : 'US';
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(query)}&regionCode=${regionCode}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url); const d = await res.json();
    if (!d.items) return [];
    return d.items.map(it => ({ id: it.id.videoId, title: it.snippet.title, channel: it.snippet.channelTitle, thumb: it.snippet.thumbnails?.medium?.url || '', views: 'Trending', url: `https://www.youtube.com/watch?v=${it.id.videoId}` }));
  } catch (e) { return []; }
}
app.get('/api/videos/trending', async (req, res) => { const region = req.query.region || 'SA'; res.json(await fetchYouTube(region === 'SA' ? 'Amapiano trending South Africa 2026' : 'Trending USA Hip Hop 2026', region)); });
app.get('/api/videos/music', async (req, res) => { const region = req.query.region || 'SA'; res.json(await fetchYouTube(region === 'SA' ? 'Amapiano Kabza De Small DJ Maphorisa' : 'Hip Hop Music Videos 2026', region)); });
app.get('/api/videos/search', async (req, res) => { res.json(await fetchYouTube(req.query.q || 'Amapiano', req.query.region || 'SA')); });
app.get('/api/admin/pending', (req, res) => { res.json({ withdrawals: withdrawals.filter(w => w.status === 'pending'), vipRequests: vipRequests.filter(v => v.status === 'pending') }); });

// ===== BOT HANDLERS =====
if (bot) {
  bot.start(async (ctx) => {
    try {
      const userId = ctx.from.id;
      const payload = ctx.startPayload || '';
      let referred_by = null;
      if (payload && payload.startsWith('ref_')) referred_by = payload.replace('ref_', '');
      let u = await getUser(userId);
      if (!u) u = await createUser(userId, { username: ctx.from.username || '', first_name: ctx.from.first_name || '', referred_by });
      else if (ctx.from.username) await updateUser(userId, { username: ctx.from.username, first_name: ctx.from.first_name || u.first_name });
      await ctx.reply(`👋 Welcome to *Shaya Watch*!\n\n💰 Earn $0.01 per ad (FREE) • $0.025-$0.10 VIP\n🎁 Daily Bonus • 👥 Invite = $0.50\n💸 Withdraw via *Walt - Dollars (USDT)*\n\nTap below to open the app:`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '▶️ OPEN SHAYA WATCH', web_app: { url: WEBAPP_URL } }]] }
      });
    } catch (e) { console.log('start error', e.message); }
  });

  bot.command('balance', async (ctx) => {
    const u = await getUser(ctx.from.id);
    if (!u) return ctx.reply('Send /start first');
    const f = formatUserForFrontend(u);
    ctx.reply(`💰 Balance: ${f.currency}${f.balance.toFixed(2)} = $${f.usdtBalance} USDT\n🪙 Coins: ${f.coins}\n👑 ${f.vip_level} • Ads Today: ${f.dailyAds}/${f.dailyLimit}`);
  });

  // Stars pre-checkout - MUST approve
  bot.on('pre_checkout_query', async (ctx) => {
    try { await ctx.answerPreCheckoutQuery(true); } catch (e) { console.log('pre_checkout error', e.message); }
  });

  // Stars successful payment - Auto-activate VIP
  bot.on('successful_payment', async (ctx) => {
    try {
      const payload = ctx.message.successful_payment.invoice_payload || '';
      // payload format: vip_PLAN_userId_timestamp
      const parts = payload.split('_');
      // vip_VIP_123_... or vip_VIP PRO_... - handle spaces
      let plan = 'VIP';
      if (payload.includes('VIP ELITE')) plan = 'VIP ELITE';
      else if (payload.includes('VIP PRO')) plan = 'VIP PRO';
      else if (payload.includes('VIP')) plan = 'VIP';
      const userId = ctx.from.id;
      let u = await getUser(userId);
      if (!u) u = await createUser(userId, { username: ctx.from.username || '', first_name: ctx.from.first_name || '' });
      const until = new Date(); until.setDate(until.getDate() + 30);
      await updateUser(userId, { vip_level: plan, vip_until: until.toISOString() });
      await ctx.reply(`🎉 *VIP ACTIVATED!*\n\n👑 Plan: ${plan}\n📅 Until: ${until.toDateString()}\n💰 Now earn $${getVipPlans(u.region).perAdUSD}/ad • 20/day • $20 Min Withdraw\n\nOpen the app to start earning more!`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '▶️ OPEN APP', web_app: { url: WEBAPP_URL } }]] }
      });
      if (ADMIN_ID) try { bot.telegram.sendMessage(ADMIN_ID, `⭐ NEW VIP SALE\nUser: ${u.first_name} (@${u.username}) ID: ${userId}\nPlan: ${plan} • Stars: ${VIP_STARS_MAP}`); } catch (e) {}
    } catch (e) { console.log('successful_payment error', e.message); }
  });

  // Launch bot - polling (Render) - ignore webhook conflicts
  bot.launch().then(() => console.log('🤖 Bot launched - @ShayaWatchAllBot')).catch(e => console.log('Bot launch failed (maybe webhook already running):', e.message));
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

app.listen(PORT, () => console.log(`🚀 Shaya Watch running on port ${PORT} - Walt Dollars version`));

