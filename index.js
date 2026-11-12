// index.js - Shaya Watch - PROFITABLE + Supabase + Giga + OnclickA
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');

const TOKEN = process.env.BOT_TOKEN || "PUT_YOUR_TOKEN";
const ADMIN_ID = 1159481047;
const BOT_USERNAME = "ShayaWatchAllBot";
const WEBAPP_URL = "https://shaya-watch-all.onrender.com";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

let USDT_TO_ZAR = 16.59;
let LAST_RATE_UPDATE = 0;
let ZAR_TO_USDT = 1 / USDT_TO_ZAR;
async function updateUsdtRate(){
  try{
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if(data?.rates?.ZAR){ USDT_TO_ZAR = data.rates.ZAR; ZAR_TO_USDT = 1/USDT_TO_ZAR; LAST_RATE_UPDATE = Date.now(); console.log(`💱 Live: 1 USDT = R${USDT_TO_ZAR.toFixed(2)}`); return; }
    throw new Error('No ZAR');
  }catch(e){
    try{ const r2 = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDTZAR'); const d2 = await r2.json(); if(d2?.price){ USDT_TO_ZAR = parseFloat(d2.price); ZAR_TO_USDT = 1/USDT_TO_ZAR; LAST_RATE_UPDATE = Date.now(); } }catch(e2){}
  }
}
updateUsdtRate(); setInterval(updateUsdtRate, 30*60*1000);

const bot = new Telegraf(TOKEN);
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ===== SUPABASE =====
function sbHeaders(){ return { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }; }
async function sbGet(table, query){ const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }); return await res.json(); }
async function sbInsert(table, body){ const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method:'POST', headers: sbHeaders(), body: JSON.stringify(body) }); return await res.json(); }
async function sbUpdate(table, query, body){ const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { method:'PATCH', headers: sbHeaders(), body: JSON.stringify(body) }); return await res.json(); }

async function getUser(id, username, firstName){
  if(!id) return null;
  let rows = await sbGet('users', `user_id=eq.${id}&select=*`);
  let u = Array.isArray(rows) ? rows[0] : null;
  if(!u){
    const now = new Date().toISOString();
    const inserted = await sbInsert('users', { user_id: parseInt(id), username: username||'', first_name: firstName||'', updated_at: now });
    u = Array.isArray(inserted) ? inserted[0] : { user_id: parseInt(id), username: username||'', first_name: firstName||'', region:'SA', currency:'R', balance:0, coins:0, referrals:0, total_ads:0, daily_ads:0, last_ad_date:null, vip_level:'FREE', vip_until:null, last_daily:null, streak:0, referred_by:null, wallet:null, total_earned:0, updated_at: now };
  }
  if(u.vip_level && u.vip_level !== 'FREE' && u.vip_until){
    if(new Date(u.vip_until) < new Date()){ await sbUpdate('users', `user_id=eq.${id}`, { vip_level:'FREE', vip_until:null }); u.vip_level='FREE'; u.vip_until=null; }
  }
  return u;
}
async function updateUser(id, patch){ await sbUpdate('users', `user_id=eq.${id}`, { ...patch, updated_at: new Date().toISOString() }); return await getUser(id); }

const RATES = {
  SA: { currency:'R', perAdCoins:10, coinValue:1000, referralCashUSD:0.50, referralCoins:50, referralNeedAds:10 },
  USA: { currency:'$', perAdCoins:10, coinValue:1000, referralCashUSD:0.10, referralCoins:10, referralNeedAds:5 }
};

// ===== PROFITABLE VIP PLANS =====
const VIP_PLANS = {
  'FREE': { mult:1, perAdUSD:0.01, coins:5, priceUSD:0, days:0, dailyLimit:10, minWithdrawUSDT:50 },
  'VIP': { mult:1, perAdUSD:0.025, coins:10, priceUSD:10, days:30, dailyLimit:20, minWithdrawUSDT:20 },
  'VIP PRO': { mult:1, perAdUSD:0.05, coins:20, priceUSD:25, days:30, dailyLimit:20, minWithdrawUSDT:20 },
  'VIP ELITE': { mult:1, perAdUSD:0.10, coins:40, priceUSD:50, days:30, dailyLimit:20, minWithdrawUSDT:20 }
};
function getPerAd(u){ const p = VIP_PLANS[u.vip_level] || VIP_PLANS['FREE']; const cash = u.region==='SA' ? p.perAdUSD * USDT_TO_ZAR : p.perAdUSD; return { cash, coins: p.coins, usd: p.perAdUSD, mult:1, dailyLimit: p.dailyLimit, minWithdrawUSDT: p.minWithdrawUSDT }; }
function getVipPrice(planName, region){ const p = VIP_PLANS[planName]; if(!p) return 0; return region==='SA' ? p.priceUSD * USDT_TO_ZAR : p.priceUSD; }
function getDailyLimit(u){ return (VIP_PLANS[u.vip_level] || VIP_PLANS['FREE']).dailyLimit; }
function getMinWithdraw(u){ const p = VIP_PLANS[u.vip_level] || VIP_PLANS['FREE']; return p.minWithdrawUSDT; }

async function getYouTubeVideos(type='trending', query='', region='SA'){
  if(!YOUTUBE_API_KEY) return [];
  const regionCode = region==='USA' ? 'US' : 'ZA';
  let url='';
  if(type==='trending') url=`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&maxResults=12&regionCode=${regionCode}&key=${YOUTUBE_API_KEY}`;
  else if(type==='search') url=`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query)}&type=video&regionCode=${regionCode}&key=${YOUTUBE_API_KEY}`;
  else if(type==='music') url=`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&maxResults=12&regionCode=${regionCode}&videoCategoryId=10&key=${YOUTUBE_API_KEY}`;
  try{ const res = await fetch(url); const data = await res.json(); if(!data.items) return []; return data.items.map(v=>({ id: v.id.videoId||v.id, title: v.snippet.title, channel: v.snippet.channelTitle, thumb: v.snippet.thumbnails.medium.url, views: v.statistics?.viewCount||0, url:`https://www.youtube.com/watch?v=${v.id.videoId||v.id}` })); }catch(e){ return []; }
}

// ===== API =====
app.get('/api/user/:id', async (req,res)=>{
  const u = await getUser(parseInt(req.params.id)); if(!u) return res.json({error:'not found'});
  const perAd = getPerAd(u); const today = new Date().toISOString().slice(0,10);
  const dailyAds = u.last_ad_date===today ? (u.daily_ads||0) : 0;
  const dailyLimit = getDailyLimit(u); const minWithdrawUSDT = getMinWithdraw(u);
  res.json({ ...u, rate: RATES[u.region], perAd, vipPlans: VIP_PLANS, usdtToZar: USDT_TO_ZAR, zarToUsdt: ZAR_TO_USDT, dailyAds, dailyLimit, dailyLeft: Math.max(0, dailyLimit - dailyAds), minWithdrawUSDT });
});
app.get('/api/rate', (req,res)=> res.json({ usdtToZar: USDT_TO_ZAR, zarToUsdt: ZAR_TO_USDT, lastUpdate: new Date(LAST_RATE_UPDATE).toISOString() }));
app.get('/api/vip-plans', (req,res)=>{ const region = req.query.region||'SA'; const out={}; for(const k in VIP_PLANS){ out[k]={ ...VIP_PLANS[k], price: getVipPrice(k, region), currency: region==='SA'?'R':'$' }; } res.json(out); });
app.get('/api/convert-usdt', async (req,res)=>{ if(Date.now()-LAST_RATE_UPDATE > 30*60*1000) await updateUsdtRate(); const usdt = parseFloat(req.query.usdt||0); const zar = parseFloat(req.query.zar||0); if(usdt) return res.json({ usdt, zar:(usdt*USDT_TO_ZAR).toFixed(2), rate:USDT_TO_ZAR, live:true }); if(zar) return res.json({ zar, usdt:(zar*ZAR_TO_USDT).toFixed(4), rate:USDT_TO_ZAR, live:true }); res.json({ rate:USDT_TO_ZAR, example:{ usdt_20:(20*USDT_TO_ZAR).toFixed(2) }, live:true }); });
app.post('/api/watch', async (req,res)=>{
  const { user_id } = req.body;
  let u = await getUser(user_id); if(!u) return res.json({error:'user not found'});
  const today = new Date().toISOString().slice(0,10);
  let dailyAds = u.last_ad_date===today ? (u.daily_ads||0) : 0;
  const perAd = getPerAd(u); const DAILY_LIMIT = perAd.dailyLimit;
  if(dailyAds >= DAILY_LIMIT) return res.json({error:`Daily limit reached! ${u.vip_level} = ${DAILY_LIMIT} ads/day. Upgrade to VIP for 20/day.`, dailyAds, dailyLimit: DAILY_LIMIT});
  dailyAds += 1;
  await updateUser(user_id, { balance: (u.balance||0)+perAd.cash, coins: (u.coins||0)+perAd.coins, total_ads: (u.total_ads||0)+1, daily_ads: dailyAds, last_ad_date: today, total_earned: (u.total_earned||0)+perAd.cash });
  u = await getUser(user_id);
  if(u.referred_by && u.total_ads === RATES[u.region].referralNeedAds){
    const ref = await getUser(u.referred_by);
    if(ref){ const refCashUSD = RATES[ref.region].referralCashUSD; const refCash = ref.region==='SA' ? refCashUSD*USDT_TO_ZAR : refCashUSD; await updateUser(ref.user_id, { balance:(ref.balance||0)+refCash, coins:(ref.coins||0)+RATES[ref.region].referralCoins, referrals:(ref.referrals||0)+1 }); }
  }
  res.json({ success:true, earnedCash:perAd.cash, earnedCoins:perAd.coins, earnedUSD:perAd.usd, dailyAds, dailyLeft: DAILY_LIMIT - dailyAds, dailyLimit: DAILY_LIMIT, user:u });
});
app.post('/api/daily', async (req,res)=>{
  const { user_id } = req.body; let u = await getUser(user_id); if(!u) return res.json({error:'user not found'});
  const today = new Date().toISOString().slice(0,10); if(u.last_daily===today) return res.json({error:'Already claimed today'});
  const perAd = getPerAd(u); const streak = u.last_daily ? (u.streak||0)+1 : 1;
  const bonusCash = perAd.cash*3 + (streak * (u.region==='SA' ? 0.01*USDT_TO_ZAR : 0.01));
  const bonusCoins = (10+streak);
  await updateUser(user_id, { balance:(u.balance||0)+bonusCash, coins:(u.coins||0)+bonusCoins, last_daily: today, streak });
  res.json({ success:true, bonusCash, bonusCoins, streak });
});
app.post('/api/convert', async (req,res)=>{
  const { user_id } = req.body; let u = await getUser(user_id); if(!u) return res.json({error:'user not found'});
  const r = RATES[u.region]; if((u.coins||0) < r.coinValue) return res.json({error:`Need ${r.coinValue} coins`});
  const val = u.coins / r.coinValue; const cashVal = u.region==='SA' ? val * USDT_TO_ZAR : val;
  await updateUser(user_id, { balance:(u.balance||0)+cashVal, coins:0 }); res.json({ success:true, converted:cashVal });
});
app.post('/api/withdraw', async (req,res)=>{
  const { user_id, method, wallet } = req.body; let u = await getUser(user_id); if(!u) return res.json({error:'user not found'});
  const isUSDT = method.includes('USDT');
  const usdtBalance = u.region==='SA' ? u.balance * ZAR_TO_USDT : u.balance;
  const minUSDT = getMinWithdraw(u); const minCash = u.region==='SA' ? minUSDT*USDT_TO_ZAR : minUSDT;
  if(isUSDT){
    if(usdtBalance < minUSDT) return res.json({error:`Need $${minUSDT} USDT minimum for ${u.vip_level}. ${u.vip_level==='FREE' ? 'FREE needs $50. Upgrade to VIP for $20 min.' : ''} Your USDT: $${usdtBalance.toFixed(2)}`});
    const zarAmount = u.region==='SA' ? u.balance : usdtBalance*USDT_TO_ZAR;
    await sbInsert('withdrawals', { user_id, amount: u.balance, coins: u.coins, method, wallet, created_at: new Date().toISOString(), usdt_amount: usdtBalance, zar_amount: zarAmount });
    await updateUser(user_id, { balance:0, coins:0, wallet });
    bot.telegram.sendMessage(ADMIN_ID, `💸 WITHDRAWAL\nUser: ${user_id} @${u.username}\nPlan: ${u.vip_level}\nRegion: ${u.region}\nUSDT: $${usdtBalance.toFixed(2)} = R${zarAmount.toFixed(2)}\nMethod: ${method}\nWallet: ${wallet}`).catch(()=>{});
    return res.json({ success:true, usdtAmount:usdtBalance, zarAmount });
  } else {
    if(u.balance < minCash) return res.json({error:`Need ${u.currency}${minCash.toFixed(2)} minimum for ${u.vip_level}. Your balance: ${u.currency}${u.balance.toFixed(2)} (= $${usdtBalance.toFixed(2)} USDT)`});
    await sbInsert('withdrawals', { user_id, amount: u.balance, coins: u.coins, method, wallet, created_at: new Date().toISOString(), usdt_amount: usdtBalance, zar_amount: u.balance });
    await updateUser(user_id, { balance:0, coins:0, wallet });
    bot.telegram.sendMessage(ADMIN_ID, `💸 WITHDRAWAL\nUser: ${user_id} @${u.username}\nPlan: ${u.vip_level}\nAmount: ${u.currency}${u.balance} (= $${usdtBalance.toFixed(2)} USDT)\nMethod: ${method}\nWallet: ${wallet}`).catch(()=>{});
    return res.json({ success:true });
  }
});
app.get('/api/tasks', async (req,res)=>{ const rows = await sbGet('tasks', 'select=*'); res.json(Array.isArray(rows)?rows:[]); });
app.get('/api/leaderboard', async (req,res)=>{ const rows = await sbGet('users', 'select=username,first_name,balance,coins,total_ads,region,vip_level&order=total_earned.desc&limit=10'); res.json(Array.isArray(rows)?rows:[]); });
app.post('/api/sync', async (req,res)=>{ const { user_id, balance, coins, total_ads, referrals, streak, region, vip_level } = req.body; let u = await getUser(user_id); if(!u) return res.json({error:'not found'}); if((u.balance||0)===0 && (u.coins||0)===0 && (balance>0 || coins>0)){ u = await updateUser(user_id, { balance:balance||0, coins:coins||0, total_ads:total_ads||0, referrals:referrals||0, streak:streak||0, region:region||u.region, vip_level:vip_level||u.vip_level }); } res.json({success:true, user:u}); });
app.post('/api/set-region', async (req,res)=>{
  const { user_id, region } = req.body; if(!['SA','USA'].includes(region)) return res.json({error:'Invalid region'});
  let u = await getUser(user_id); if(!u) return res.json({error:'user not found'});
  const oldRegion = u.region; let newBalance = u.balance;
  if(oldRegion!==region){ if(oldRegion==='SA' && region==='USA') newBalance = u.balance * ZAR_TO_USDT; if(oldRegion==='USA' && region==='SA') newBalance = u.balance * USDT_TO_ZAR; }
  u = await updateUser(user_id, { region, currency: RATES[region].currency, balance: newBalance });
  res.json({success:true, user:u, rate:RATES[region], oldRegion, newBalance});
});
app.get('/ping', (req,res)=> res.send('OK'));
app.get('/api/videos/trending', async (req,res)=>{ res.json(await getYouTubeVideos('trending','',req.query.region||'SA')); });
app.get('/api/videos/music', async (req,res)=>{ res.json(await getYouTubeVideos('music','',req.query.region||'SA')); });
app.get('/api/videos/search', async (req,res)=>{ res.json(await getYouTubeVideos('search',req.query.q||'Amapiano',req.query.region||'SA')); });
app.post('/api/request-vip', async (req,res)=>{
  const { user_id, plan } = req.body; const u = await getUser(user_id); if(!u) return res.json({error:'user not found'});
  if(!VIP_PLANS || plan==='FREE') return res.json({error:'Invalid plan'});
  const price = getVipPrice(plan, u.region);
  await sbInsert('vip_requests', { user_id, plan, region: u.region, created_at: new Date().toISOString() });
  bot.telegram.sendMessage(ADMIN_ID, `👑 NEW VIP REQUEST\nUser: ${user_id} @${u.username}\nPlan: ${plan}\nRegion: ${u.region}\nPrice: ${u.currency}${price.toFixed(2)} ($${VIP_PLANS.priceUSD})\nDuration: 30 days\n\nApprove: /activate ${user_id} ${plan}`).catch(()=>{});
  res.json({success:true, plan, price, currency:u.currency});
});

// --- BOT ---
bot.start(async (ctx)=>{
  const user = ctx.from; const args = ctx.message.text.split(' ')[1];
  await getUser(user.id, user.username, user.first_name);
  if(args && args.startsWith('ref_')){ const refId = parseInt(args.replace('ref_','')); if(refId && refId!==user.id) await updateUser(user.id, { referred_by: refId }); }
  ctx.reply(`🔥 SHAYA WATCH - EARN PLANS\n\n🇿🇦 SA + 🇺🇸 USA\n💱 LIVE: 1 USDT = R${USDT_TO_ZAR.toFixed(2)}\n🆓 FREE: $0.01/ad | 10/day | $50 Min\n👑 VIP $10: $0.025/ad | 20/day | $20 Min\n💎 PRO $25: $0.05/ad | 20/day | $20 Min\n🔥 ELITE $50: $0.10/ad | 20/day | $20 Min\n\nTap below 👇`, Markup.inlineKeyboard([
    [Markup.button.webApp('🚀 OPEN SHAYA APP', `${WEBAPP_URL}?start=${user.id}`)],
    [Markup.button.callback('🇿🇦 SA MODE', 'set_SA'), Markup.button.callback('🇺🇸 USA MODE', 'set_USA')],
    [Markup.button.callback('👥 Referral Link', 'invite')],
    [Markup.button.callback('👑 VIP PLANS', 'vip_plans')],
  ]));
});
bot.action(/set_(SA|USA)/, async (ctx)=>{
  const region = ctx.match[1]; const u = await getUser(ctx.from.id); let newBalance = u ? u.balance : 0;
  if(u && u.region!==region){ if(u.region==='SA' && region==='USA') newBalance = u.balance * ZAR_TO_USDT; if(u.region==='USA' && region==='SA') newBalance = u.balance * USDT_TO_ZAR; await updateUser(ctx.from.id, { region, currency: RATES[region].currency, balance: newBalance }); }
  ctx.answerCbQuery(`Set to ${region}`); ctx.reply(`✅ Region: ${region}\nBalance converted: ${u?.currency}${u?.balance.toFixed(2)} → ${RATES[region].currency}${newBalance.toFixed(2)}`, Markup.inlineKeyboard([[Markup.button.webApp('🚀 OPEN APP', `${WEBAPP_URL}?start=${ctx.from.id}`)]]));
});
bot.action('invite', (ctx)=>{ ctx.reply(`👥 Your Link:\nhttps://t.me/${BOT_USERNAME}?start=ref_${ctx.from.id}`); });
bot.action('vip_plans', async (ctx)=>{
  const u = await getUser(ctx.from.id); const cur = u.region==='SA'?'R':'$';
  ctx.reply(`👑 VIP PLANS (30 Days) - PROFITABLE\n🆓 FREE: $0.01/ad • 10/day • $50 Min\n👑 VIP: $0.025/ad • 20/day • $20 Min • ${cur}${getVipPrice('VIP',u.region).toFixed(2)}\n💎 VIP PRO: $0.05/ad • 20/day • $20 Min • ${cur}${getVipPrice('VIP PRO',u.region).toFixed(2)}\n🔥 VIP ELITE: $0.10/ad • 20/day • $20 Min • ${cur}${getVipPrice('VIP ELITE',u.region).toFixed(2)}\n\nYour VIP: ${u.vip_level}${u.vip_until?' until '+u.vip_until:''}`, Markup.inlineKeyboard([[Markup.button.webApp('👑 BUY VIP IN APP', `${WEBAPP_URL}?start=${ctx.from.id}`)]]));
});
bot.command('trending', async (ctx)=>{ const u = await getUser(ctx.from.id, ctx.from.username, ctx.from.first_name); const videos = await getYouTubeVideos('trending','',u.region||'SA'); if(!videos.length) return ctx.reply('❌ YouTube API Key missing.'); let msg = `🔥 TRENDING IN ${u.region}:\n\n`; videos.slice(0,5).forEach((v,i)=>{ msg += `${i+1}. ${v.title}\n👤 ${v.channel} | 👁️ ${v.views}\n${v.url}\n\n`; }); ctx.reply(msg); });
bot.command('balance', async (ctx)=>{
  const u = await getUser(ctx.from.id, ctx.from.username, ctx.from.first_name); const usdtVal = u.region==='SA' ? (u.balance * ZAR_TO_USDT).toFixed(4) : u.balance.toFixed(4); const perAd = getPerAd(u); const today = new Date().toISOString().slice(0,10); const dailyAds = u.last_ad_date===today ? (u.daily_ads||0) : 0; const minUSDT = getMinWithdraw(u);
  ctx.reply(`💰 Balance: ${u.currency}${u.balance.toFixed(2)} (= $${usdtVal} USDT)\n🪙 Coins: ${u.coins}\n📺 Ads Today: ${dailyAds}/${perAd.dailyLimit} | Total: ${u.total_ads}\n👥 Referrals: ${u.referrals}\n👑 VIP: ${u.vip_level}${u.vip_until?' until '+u.vip_until:''} ($${perAd.usd}/ad)\n💸 Min Withdraw: $${minUSDT} USDT`);
});
bot.command('vip', async (ctx)=>{ const u = await getUser(ctx.from.id); const cur = u.region==='SA'?'R':'$'; ctx.reply(`👑 VIP PLANS (30 Days)\nFREE: $0.01/ad • 10/day • $50 Min\nVIP: $0.025/ad • 20/day • $20 Min - ${cur}${getVipPrice('VIP',u.region).toFixed(2)}\nVIP PRO: $0.05/ad • 20/day • $20 Min - ${cur}${getVipPrice('VIP PRO',u.region).toFixed(2)}\nVIP ELITE: $0.10/ad • 20/day • $20 Min - ${cur}${getVipPrice('VIP ELITE',u.region).toFixed(2)}\n\nYour VIP: ${u.vip_level}`); });
bot.command('activate', async (ctx)=>{
  if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
  const parts = ctx.message.text.split(' '); const targetId = parts[1]; const level = parts.slice(2).join(' ').toUpperCase(); if(!targetId || !level) return ctx.reply('Use: /activate 123456 VIP PRO');
  let lvl='FREE'; if(level.includes('ELITE')) lvl='VIP ELITE'; else if(level.includes('PRO')) lvl='VIP PRO'; else if(level.includes('VIP')) lvl='VIP';
  const days = VIP_PLANS[lvl]?.days||0; const until = days ? new Date(Date.now()+days*24*60*60*1000).toISOString().slice(0,10) : null;
  await updateUser(parseInt(targetId), { vip_level: lvl, vip_until: until });
  const reqs = await sbGet('vip_requests', `user_id=eq.${targetId}&plan=eq.${encodeURIComponent(lvl)}&status=eq.PENDING&select=*`); if(Array.isArray(reqs) && reqs[0]) await sbUpdate('vip_requests', `id=eq.${reqs[0].id}`, { status:'APPROVED' });
  ctx.reply(`✅ ${targetId} = ${lvl} until ${until||'N/A'}`); bot.telegram.sendMessage(parseInt(targetId), `🎉 You are now ${lvl}${until?' until '+until:''}!\nPer ad: $${VIP_PLANS[lvl].perAdUSD} | ${VIP_PLANS[lvl].dailyLimit}/day | Min $${VIP_PLANS[lvl].minWithdrawUSDT}`).catch(()=>{});
});
bot.command('stats', async (ctx)=>{ if(ctx.from.id!==ADMIN_ID) return; const all = await sbGet('users', 'select=user_id,region&limit=1000'); const total = Array.isArray(all)?all.length:0; const sa = Array.isArray(all)?all.filter(x=>x.region==='SA').length:0; const pend = await sbGet('withdrawals', 'select=id&status=eq.PENDING'); ctx.reply(`📊 STATS\nTotal: ${total} | SA: ${sa} | USA: ${total-sa}\nPending Withdrawals: ${Array.isArray(pend)?pend.length:0}\nRate: 1 USDT = R${USDT_TO_ZAR.toFixed(2)} | FREE $0.01/10/day/$50 Min | VIP $0.025-$0.10`); });
bot.command('approve', async (ctx)=>{ if(ctx.from.id!==ADMIN_ID) return; const id = ctx.message.text.split(' ')[1]; await sbUpdate('withdrawals', `id=eq.${id}`, { status:'PAID' }); ctx.reply(`✅ Withdrawal #${id} marked PAID`); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`🌐 WebApp on port ${PORT} | Supabase: ${SUPABASE_URL ? 'Connected' : 'MISSING!'}`));
bot.launch({ dropPendingUpdates:true }).then(()=> console.log('🤖 Bot running')).catch((e)=>{ console.log('⚠️ BOT FAILED', e.message); });
process.once('SIGINT', ()=> bot.stop('SIGINT')); process.once('SIGTERM', ()=> bot.stop('SIGTERM'));
