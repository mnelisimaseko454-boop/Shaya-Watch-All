// ===== SHAYA WATCH BOT - MERGED FINAL =====
// Name: Shaya Watch Bot | Bot: @ShayaWatchAllBot
// Keys: Giga Ad 9114 + Giga Offerwall 9114 + OnclickA 472254
// Earn: 20 VIP, Coins+Points+Stars, 30 Day Expiry, Topup Capitec 1893275807
// Withdraw: Capitec / Airtime / USDT (WALT) / GEM (WALT) / R5 1GB Data
// Supabase SQL - Run once:
/*
create table if not exists users (
  id text primary key, user_id bigint unique, username text, first_name text, name text,
  region text default 'SA', currency text default 'R',
  balance numeric default 0, coins int default 0, points int default 0, level int default 1,
  total_ads int default 0, referrals int default 0, streak int default 0,
  total_earned numeric default 0, vip_level text default 'FREE', vip_until text,
  daily_ads int default 0, daily_date text default '', last_daily text,
  last_quiz bigint default 0, last_ad bigint default 0, ads_today int default 0, last_ad_day text default '',
  tasks_done jsonb default '[]', pending_topup jsonb, device_id text,
  unlocked_levels jsonb default '[1]', level_expires_at bigint default 0,
  referred_by text, updated_at timestamptz default now()
);
create table if not exists withdrawals (id bigint generated always as identity primary key, user_id bigint, method text, wallet text, amount_cash numeric, usdt_amount numeric, zar_amount numeric, region text, status text default 'pending', created_at timestamptz default now());
create table if not exists vip_requests (id bigint generated always as identity primary key, user_id bigint, plan text, status text default 'pending', created_at timestamptz default now());
*/
const express = require('express');
const path = require('path');
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

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
const GROUP_URL = 'https://t.me/ShayaEarnNetwork';
const TOPUP_ACCOUNT = '1893275807'; // Capitec

let supabase = null;
try { if (SUPABASE_URL && SUPABASE_KEY) { supabase = createClient(SUPABASE_URL, SUPABASE_KEY); console.log('Supabase connected'); } } catch(e){ console.log('Supabase failed', e.message); }

// ===== CONFIG =====
let USDT_TO_ZAR = 16.59;
let lastRateFetch = 0;
async function refreshRate(){
  const now = Date.now();
  if(now - lastRateFetch < 30*60*1000) return USDT_TO_ZAR;
  try{ const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD'); const d = await r.json(); if(d?.rates?.ZAR){ USDT_TO_ZAR = parseFloat(d.rates.ZAR); lastRateFetch = now; } }catch(e){}
  return USDT_TO_ZAR;
}
refreshRate(); setInterval(refreshRate, 30*60*1000);
function todayStr(){ return new Date().toISOString().slice(0,10); }

// ===== 20 VIP LEVELS (Earn) + Watch All Stars =====
// Coins = Points. Stars scaled to Watch All style (250/500/1000 for top tiers, small for low tiers)
const LEVEL_NAMES = ['Free','Starter','Bronze','Bronze+','Silver','Silver+','Gold','Gold+','Platinum','Platinum+','Diamond','Diamond+','Ruby','Ruby+','Emerald','Emerald+','Sapphire','Sapphire+','Master','KING'];
const LEVEL_STARS = [0,10,20,35,50,75,100,130,170,210,260,320,380,450,550,650,800,1000,1300,1800];
const LEVEL_POINTS = [0,100,200,350,500,750,1000,1300,1700,2100,2600,3200,3800,4500,5500,6500,8000,10000,13000,18000];
const LEVEL_COINS = [...LEVEL_POINTS];
const LEVEL_AD_CASH_SA = [0.17,0.20,0.23,0.27,0.33,0.40,0.46,0.53,0.60,0.66,0.73,0.79,0.86,0.93,1.00,1.06,1.16,1.32,1.49,1.66]; // R per ad ~ $0.01 to $0.10
const LEVEL_AD_USD = [0.01,0.012,0.014,0.016,0.02,0.024,0.028,0.032,0.036,0.04,0.044,0.048,0.052,0.056,0.06,0.064,0.07,0.08,0.09,0.10];
const LEVEL_AD_COINS = [5,6,7,8,10,12,14,16,18,20,22,24,26,28,30,32,35,40,45,50];
const LEVEL_WITHDRAW = [3000,2800,2600,2400,2000,1800,1600,1400,1200,1000,900,800,700,650,600,550,500,450,400,300];
const LEVEL_QUIZ = [25,25,25,30,30,35,35,40,40,50,50,60,60,70,70,80,80,90,90,100];
const LEVELS = {};
for(let i=0;i<20;i++){ LEVELS[i+1] = { name: LEVEL_NAMES[i], starsCost: LEVEL_STARS[i], pointsCost: LEVEL_POINTS[i], coinsCost: LEVEL_COINS[i], adReward: LEVEL_AD_COINS[i], adCashSA: LEVEL_AD_CASH_SA[i], adUSD: LEVEL_AD_USD[i], withdrawMin: LEVEL_WITHDRAW[i], quizReward: LEVEL_QUIZ[i], adLimit: i===0?10:20, minWithdrawUSDT: i===0?50:20 }; }
function getLevel(u){ return LEVELS[u.level||1]; }
function getVipName(u){ return (LEVELS[u.level||1]?.name || 'FREE').toUpperCase(); }
const QUIZ_UNLOCK_ADS = 10;

const TOPUP_PACKAGES = [
  { id:'p29', coins:500, points:500, price:29, label:'R29 — 500 Coins + 500 Points' },
  { id:'p79', coins:1500, points:1500, price:79, label:'R79 — 1500 Coins + 1500 Points' },
  { id:'p179', coins:4000, points:4000, price:179, label:'R179 — 4000 Coins + 4000 Points' },
  { id:'p349', coins:9000, points:9000, price:349, label:'R349 — 9000 Coins + 9000 Points' },
  { id:'p699', coins:20000, points:20000, price:699, label:'R699 — 20000 Coins + 20000 Points' },
];
const QUIZ = [
  {q:'What is the capital of South Africa?', options:['Cape Town','Pretoria','Durban','Joburg'], answer:1},
  {q:'Which currency does SA use?', options:['Dollar','Rand','Naira','Kwacha'], answer:1},
  {q:'What is 15 + 27?', options:['40','42','45','32'], answer:1},
  {q:'Which province is Durban in?', options:['Gauteng','Limpopo','KwaZulu-Natal','Free State'], answer:2},
  {q:'What colour is in the SA flag?', options:['Red','Blue','Green','All of these'], answer:3},
];
const OFFERWALL = [
  {id:'join_group', title:'Join Shaya Earn Network', reward:20},
  {id:'invite_1', title:'Invite 1 Friend', reward:50},
  {id:'ads_10', title:'Watch 10 Ads', reward:30},
  {id:'ads_50', title:'Watch 50 Ads', reward:100},
];
const tasksList = [
  { id: 1, title: 'Join Shaya Watch Channel', link: 'https://t.me/ShayaWatchAllBot', reward_cash: 0.05, reward_coins: 20 },
  { id: 2, title: 'Invite 3 Friends', link: 'https://t.me/ShayaWatchAllBot', reward_cash: 0.10, reward_coins: 50 },
  { id: 3, title: 'Watch 5 Ads Today', link: 'https://t.me/ShayaWatchAllBot', reward_cash: 0.05, reward_coins: 20 },
  { id: 4, title: 'Share Shaya Watch on WhatsApp', link: 'https://t.me/ShayaWatchAllBot', reward_cash: 0.05, reward_coins: 10 },
];

// ===== STORAGE =====
const users = new Map();
const withdrawals = [];
const vipRequests = [];
const offerwallRewards = [];

async function sbGetUser(id){
  if(!supabase) return null;
  try{
    // Try by id (web_xxx / numeric) then by user_id
    let { data } = await supabase.from('users').select('*').eq('id', String(id)).single();
    if(data) return data;
    const n = parseInt(id); if(!isNaN(n)){ const r2 = await supabase.from('users').select('*').eq('user_id', n).single(); return r2.data || null; }
    return null;
  }catch(e){ return null; }
}
async function sbUpsertUser(u){
  if(!supabase) return;
  try{ await supabase.from('users').upsert({ id: String(u.id), user_id: parseInt(u.id) || null, username: u.username||'', first_name: u.first_name||u.name||'', name: u.name||u.first_name||'', region: u.region, currency: u.currency, balance: u.balance, coins: u.coins, points: u.points||0, level: u.level||1, total_ads: u.total_ads||0, referrals: u.referrals||0, streak: u.streak||0, total_earned: u.total_earned||0, vip_level: getVipName(u), vip_until: u.vip_until||null, daily_ads: u.dailyAds||0, daily_date: u.dailyDate||'', last_daily: u.lastDaily||null, last_quiz: u.lastQuiz||0, last_ad: u.lastAd||0, ads_today: u.adsToday||0, last_ad_day: u.lastAdDay||'', tasks_done: u.tasksDone||[], pending_topup: u.pendingTopup||null, device_id: u.device_id||null, unlocked_levels: u.unlockedLevels||[1], level_expires_at: u.levelExpiresAt||0, referred_by: u.referred_by||null }, { onConflict: 'id' }); }catch(e){ console.log('sb upsert failed', e.message); }
}
async function sbInsert(table, row){ if(!supabase) return; try{ await supabase.from(table).insert(row); }catch(e){} }

async function getUser(id){
  const key = String(id);
  if(users.has(key)) return users.get(key);
  const sb = await sbGetUser(key);
  if(sb){
    const u = { id: key, user_id: sb.user_id||parseInt(key)||null, username: sb.username||'', first_name: sb.first_name||sb.name||'friend', name: sb.first_name||sb.name||'friend', region: sb.region||'SA', currency: sb.region==='USA'?'$':'R', balance: parseFloat(sb.balance||0), coins: parseInt(sb.coins||0), points: parseInt(sb.points||0), level: parseInt(sb.level||1), total_ads: parseInt(sb.total_ads||0), referrals: parseInt(sb.referrals||0), streak: parseInt(sb.streak||0), total_earned: parseFloat(sb.total_earned||0), vip_level: sb.vip_level||'FREE', vip_until: sb.vip_until||null, dailyAds: parseInt(sb.daily_ads||0), dailyDate: sb.daily_date||todayStr(), lastDaily: sb.last_daily||null, lastQuiz: sb.last_quiz||0, lastAd: sb.last_ad||0, adsToday: sb.ads_today||0, lastAdDay: sb.last_ad_day||'', tasksDone: sb.tasks_done||[], pendingTopup: sb.pending_topup||null, device_id: sb.device_id||null, unlockedLevels: sb.unlocked_levels||[1], levelExpiresAt: sb.level_expires_at||0, referred_by: sb.referred_by||null };
    users.set(key, u); return u;
  }
  return null;
}
async function createUser(id, data={}){
  const key = String(id);
  const region = data.region||'SA';
  const u = { id: key, user_id: parseInt(id)||null, username: data.username||'', first_name: data.first_name||data.name||'friend', name: data.first_name||data.name||'friend', region, currency: region==='USA'?'$':'R', balance:0, coins:0, points:0, level:1, total_ads:0, referrals:0, streak:0, total_earned:0, vip_level:'FREE', vip_until:null, dailyAds:0, dailyDate:todayStr(), lastDaily:null, lastQuiz:0, lastAd:0, adsToday:0, lastAdDay:'', tasksDone:[], pendingTopup:null, device_id:data.device_id||null, unlockedLevels:[1], levelExpiresAt:0, referred_by: data.referred_by||null };
  users.set(key, u); await sbUpsertUser(u);
  // Referral bonus
  if(data.referred_by && String(data.referred_by)!==key){
    let ref = await getUser(data.referred_by);
    if(!ref) ref = await createUser(data.referred_by, {});
    const isSA = ref.region==='SA';
    const bonusCash = isSA ? 0.50*USDT_TO_ZAR : 0.10;
    const bonusCoins = isSA ? 50 : 10;
    ref.balance += bonusCash; ref.coins += bonusCoins; ref.referrals+=1; ref.total_earned+=bonusCash;
    await updateUser(ref.id, { balance: ref.balance, coins: ref.coins, referrals: ref.referrals, total_earned: ref.total_earned });
  }
  return u;
}
async function getUserAsync(id, name, extra={}){
  let u = await getUser(id);
  if(!u) u = await createUser(id, { first_name: name, name, device_id: extra.device_id, referred_by: extra.referred_by });
  if(name) { u.name = name; u.first_name = name; }
  if(extra.device_id) u.device_id = extra.device_id;
  // Expiry check - drop 1 level, unlocked stays unlocked
  if(u.level>1 && u.levelExpiresAt && Date.now()>u.levelExpiresAt){
    u.level = Math.max(1, u.level-1); u.levelExpiresAt = 0; u.vip_level = getVipName(u);
    await updateUser(u.id, { level: u.level, levelExpiresAt: 0, vip_level: u.vip_level });
  }
  // Daily reset
  if(u.dailyDate!==todayStr()){ u.dailyAds=0; u.dailyDate=todayStr(); }
  if(u.vip_level!=='FREE' && u.vip_until){ if(new Date(u.vip_until) < new Date()){ u.vip_level='FREE'; u.vip_until=null; } }
  return u;
}
async function updateUser(id, patch){
  let u = users.get(String(id)) || await getUser(id);
  if(!u) return null;
  Object.assign(u, patch); users.set(String(id), u); await sbUpsertUser(u); return u;
}
function formatUserForFrontend(u){
  if(u.dailyDate!==todayStr()){ u.dailyAds=0; u.dailyDate=todayStr(); }
  const lvl = getLevel(u);
  const perAd = { cash: u.region==='SA'? lvl.adCashSA : lvl.adUSD, coins: lvl.adReward, usd: lvl.adUSD, dailyLimit: lvl.adLimit, minWithdrawUSDT: lvl.minWithdrawUSDT };
  const dailyLimit = perAd.dailyLimit, dailyAds = u.dailyAds||0, dailyLeft = Math.max(0, dailyLimit-dailyAds);
  const usdtBal = u.region==='SA' ? (u.balance/USDT_TO_ZAR) : u.balance;
  return { ...u, user_id: u.user_id||u.id, vip_level: getVipName(u), vipBadge: getVipName(u), levelName: lvl.name, perAd, dailyLimit, dailyAds, dailyLeft, minWithdrawUSDT: perAd.minWithdrawUSDT, usdtToZar: USDT_TO_ZAR, usdtBalance: parseFloat(usdtBal.toFixed(4)), unlockedLevels: u.unlockedLevels||[1], levelExpiresAt: u.levelExpiresAt||0, expiresInDays: u.levelExpiresAt? Math.max(0, Math.ceil((u.levelExpiresAt-Date.now())/(1000*60*60*24))):0, withdrawMin: lvl.withdrawMin, quizUnlocked: (u.total_ads||0)>=QUIZ_UNLOCK_ADS, quizNeed: Math.max(0, QUIZ_UNLOCK_ADS-(u.total_ads||0)) };
}
function getPerAd(u){ const lvl=getLevel(u); return { cash: u.region==='SA'? lvl.adCashSA : lvl.adUSD, coins: lvl.adReward, usd: lvl.adUSD, dailyLimit: lvl.adLimit, minWithdrawUSDT: lvl.minWithdrawUSDT }; }

// ===== BOT =====
let bot = null;
if(BOT_TOKEN){ try{ bot = new Telegraf(BOT_TOKEN); console.log('Bot created - Shaya Watch Bot'); }catch(e){ console.log('Bot create failed', e.message); } }

// ===== API ROUTES =====
app.get('/health', (req,res)=>res.json({ok:true, bot:'Shaya Watch Bot', time:new Date().toISOString()}));
app.get('/api/version', (req,res)=>res.json({version:'shaya-watch-bot-merged-v1', giga:'9114', onclicka:'472254'}));
app.get('/', (req,res)=>res.sendFile(path.join(__dirname, 'index.html')));
app.get('/api/rate', async (req,res)=>{ const r = await refreshRate(); res.json({usdtToZar:r, usdt:1, zar:r}); });
app.get('/api/convert-usdt', async (req,res)=>{ const usdt=parseFloat(req.query.usdt||0); const r=await refreshRate(); res.json({usdt, zar:(usdt*r).toFixed(2), rate:r}); });
app.get('/api/vip-plans', async (req,res)=>{ const region=req.query.region||'SA'; const out={}; for(let i=1;i<=20;i++){ const l=LEVELS[i]; out[l.name]= { name:l.name, level:i, priceUSD: (l.pointsCost*0.058).toFixed(2), price: region==='SA'? l.pointsCost*0.058*USDT_TO_ZAR : l.pointsCost*0.058, perAdUSD:l.adUSD, perAdCash: region==='SA'? l.adCashSA:l.adUSD, perAdCoins:l.adReward, dailyLimit:l.adLimit, minWithdrawUSDT:l.minWithdrawUSDT, days:30, stars:l.starsCost, coinsCost:l.coinsCost, pointsCost:l.pointsCost }; } res.json(out); });

// Unified user - supports Telegram id, web_ device id, and old numeric id
app.get('/api/user/:id', async (req,res)=>{ const u = await getUserAsync(req.params.id, null); if(!u) return res.json({error:'user not found - send /start in bot first'}); res.json(formatUserForFrontend(u)); });
app.post('/api/sync', async (req,res)=>{ const {user_id, balance, coins, total_ads, referrals, streak, region, vip_level, total_earned} = req.body; let u = await getUserAsync(user_id, null); const patch={}; if(balance!==undefined) patch.balance=parseFloat(balance); if(coins!==undefined) patch.coins=parseInt(coins); if(total_ads!==undefined) patch.total_ads=parseInt(total_ads); if(referrals!==undefined) patch.referrals=parseInt(referrals); if(streak!==undefined) patch.streak=parseInt(streak); if(total_earned!==undefined) patch.total_earned=parseFloat(total_earned); if(region){ patch.region=region; patch.currency=region==='USA'?'$':'R'; } if(vip_level) patch.vip_level=vip_level; const updated = await updateUser(u.id, patch); res.json({success:true, user:formatUserForFrontend(updated)}); });
app.post('/api/set-region', async (req,res)=>{ const {user_id, region}=req.body; if(!['SA','USA'].includes(region)) return res.json({error:'Invalid region'}); let u = await getUserAsync(user_id, null); if(u.region===region) return res.json({success:true, user:formatUserForFrontend(u)}); const rate=await refreshRate(); const oldRegion=u.region, oldBalance=u.balance; let newBalance=oldBalance; if(oldRegion==='SA'&&region==='USA') newBalance=oldBalance/rate; else if(oldRegion==='USA'&&region==='SA') newBalance=oldBalance*rate; const updated=await updateUser(u.id, {region, currency:region==='USA'?'$':'R', balance:parseFloat(newBalance.toFixed(2))}); res.json({success:true, user:formatUserForFrontend(updated)}); });

// --- EARN: Watch Ad (Watch All logic + Earn coins) ---
app.post('/api/watch', async (req,res)=>{
  const {user_id}=req.body; let u=await getUserAsync(user_id, null);
  if(u.dailyDate!==todayStr()){ u.dailyAds=0; u.dailyDate=todayStr(); }
  const perAd=getPerAd(u);
  if((u.dailyAds||0)>=perAd.dailyLimit) return res.json({error:`Daily limit reached! ${getVipName(u)} = ${perAd.dailyLimit}/day.`, dailyAds:u.dailyAds, dailyLimit:perAd.dailyLimit});
  const updated=await updateUser(u.id, { balance: parseFloat((u.balance+perAd.cash).toFixed(2)), coins: u.coins+perAd.coins, total_ads:(u.total_ads||0)+1, total_earned: parseFloat(((u.total_earned||0)+perAd.cash).toFixed(2)), dailyAds:(u.dailyAds||0)+1, dailyDate:todayStr(), lastAd:Date.now(), adsToday:(u.adsToday||0)+1, lastAdDay:todayStr() });
  res.json({success:true, earnedCash:parseFloat(perAd.cash.toFixed(2)), earnedCoins:perAd.coins, earnedUSD:perAd.usd, dailyAds:updated.dailyAds, dailyLimit:perAd.dailyLimit, dailyLeft:perAd.dailyLimit-updated.dailyAds, balance:updated.balance});
});
// --- EARN: Legacy /api/earn (Earn bot compatibility) ---
app.post('/api/earn', async (req,res)=>{
  const {userId, user_id, name, action, taskId, score, device_id}=req.body;
  const id = userId||user_id;
  const u = await getUserAsync(id, name, {device_id});
  const lvl=getLevel(u);
  if(action==='balance') return res.json({coins:u.coins, totalEarned:u.total_earned, adsWatched:u.total_ads, level:u.level||1, levelName:lvl.name, points:u.points||0, tasks:OFFERWALL, tasksDone:u.tasksDone, quizUnlocked:(u.total_ads||0)>=QUIZ_UNLOCK_ADS, quizNeed:Math.max(0,QUIZ_UNLOCK_ADS-(u.total_ads||0)), withdrawMin:lvl.withdrawMin, unlockedLevels:u.unlockedLevels||[1], levelExpiresAt:u.levelExpiresAt||0, expiresInDays:u.levelExpiresAt?Math.max(0,Math.ceil((u.levelExpiresAt-Date.now())/(1000*60*60*24))):0});
  if(action==='ad'){
    if(u.dailyDate!==todayStr()){ u.dailyAds=0; u.dailyDate=todayStr(); }
    const perAd=getPerAd(u);
    if((u.dailyAds||0)>=perAd.dailyLimit) return res.json({coins:u.coins, msg:`Daily limit ${perAd.dailyLimit} reached. Go VIP!`});
    if(Date.now()-(u.lastAd||0)<10000) return res.json({coins:u.coins, msg:'Wait 10 sec'});
    const upd=await updateUser(u.id, {coins:u.coins+perAd.coins, balance:parseFloat((u.balance+perAd.cash).toFixed(2)), total_earned:parseFloat((u.total_earned+perAd.cash).toFixed(2)), total_ads:u.total_ads+1, dailyAds:u.dailyAds+1, dailyDate:todayStr(), lastAd:Date.now(), adsToday:(u.adsToday||0)+1, lastAdDay:todayStr()});
    return res.json({coins:upd.coins, msg:`+${perAd.coins} Coins + ${u.currency}${perAd.cash.toFixed(2)}! Balance: ${upd.coins} coins`});
  }
  if(action==='quiz'){
    if((u.total_ads||0)<QUIZ_UNLOCK_ADS) return res.json({coins:u.coins, msg:`🔒 Quiz Locked! Watch ${QUIZ_UNLOCK_ADS-(u.total_ads||0)} more ads.`, locked:true});
    if(Date.now()-(u.lastQuiz||0)<20*60*60*1000) return res.json({coins:u.coins, msg:'Already played today'});
    return res.json({coins:u.coins, quiz:QUIZ});
  }
  if(action==='quiz_done'){
    if((u.total_ads||0)<QUIZ_UNLOCK_ADS) return res.json({coins:u.coins, msg:'Quiz locked. Watch 10 ads first.'});
    if(Date.now()-(u.lastQuiz||0)<20*60*60*1000) return res.json({coins:u.coins, msg:'Already played today'});
    const upd = score>=3 ? await updateUser(u.id, {coins:u.coins+lvl.quizReward, total_earned:u.total_earned+lvl.quizReward, lastQuiz:Date.now()}) : await updateUser(u.id, {lastQuiz:Date.now()});
    return res.json({coins:upd.coins, msg: score>=3 ? `Score ${score}/5. +${lvl.quizReward} coins!` : `Score ${score}/5. Need 3+ to earn.`});
  }
  if(action==='offerwall'){
    const task=OFFERWALL.find(t=>t.id===taskId);
    if(!task) return res.json({coins:u.coins, msg:'Task not found'});
    if((u.tasksDone||[]).includes(taskId)) return res.json({coins:u.coins, msg:'Already claimed'});
    if(taskId==='ads_10' && (u.total_ads||0)<10) return res.json({coins:u.coins, msg:`Watch 10 ads first. You have ${u.total_ads}`});
    if(taskId==='ads_50' && (u.total_ads||0)<50) return res.json({coins:u.coins, msg:`Watch 50 ads first. You have ${u.total_ads}`});
    if(taskId==='invite_1' && (u.referrals||0)<1) return res.json({coins:u.coins, msg:'Invite 1 friend first'});
    const upd=await updateUser(u.id, {tasksDone:[...(u.tasksDone||[]), taskId], coins:u.coins+task.reward, total_earned:u.total_earned+task.reward});
    return res.json({coins:upd.coins, msg:`${task.title} +${task.reward} coins!`});
  }
  res.json({coins:u.coins});
});
app.post('/api/daily', async (req,res)=>{
  const {user_id}=req.body; let u=await getUserAsync(user_id, null);
  if(u.lastDaily===todayStr()) return res.json({error:'Already claimed today!'});
  const isSA=u.region==='SA'; const bonusCash=isSA?0.05*USDT_TO_ZAR:0.05;
  const updated=await updateUser(u.id, {balance:parseFloat((u.balance+bonusCash).toFixed(2)), coins:u.coins+20, streak:(u.streak||0)+1, lastDaily:todayStr()});
  res.json({success:true, bonusCash:parseFloat(bonusCash.toFixed(2)), bonusCoins:20, streak:updated.streak, balance:updated.balance});
});
app.post('/api/convert', async (req,res)=>{
  const {user_id}=req.body; let u=await getUserAsync(user_id, null);
  if((u.coins||0)<1000) return res.json({error:`Need 1000 Coins. You have ${u.coins}.`});
  const thousands=Math.floor(u.coins/1000); const cashValue=u.region==='SA'? thousands*USDT_TO_ZAR : thousands*1;
  const updated=await updateUser(u.id, {balance:parseFloat((u.balance+cashValue).toFixed(2)), coins:u.coins-(thousands*1000), total_earned:parseFloat(((u.total_earned||0)+cashValue).toFixed(2))});
  res.json({success:true, converted:parseFloat(cashValue.toFixed(2)), balance:updated.balance});
});

// --- VIP: 20 Levels - Coins / Points / Stars ---
app.post('/api/vip', async (req,res)=>{
  const {userId, user_id, name, action, targetLevel, packageId, proof, device_id, payWith}=req.body;
  const id=userId||user_id; const u=await getUserAsync(id, name, {device_id});
  if(action==='info') return res.json({level:u.level||1, levelName:getLevel(u).name, vip_level:getVipName(u), points:u.points||0, coins:u.coins, balance:u.balance, levels:LEVELS, packages:TOPUP_PACKAGES, unlockedLevels:u.unlockedLevels||[1], levelExpiresAt:u.levelExpiresAt||0, expiresInDays:u.levelExpiresAt?Math.max(0,Math.ceil((u.levelExpiresAt-Date.now())/(1000*60*60*24))):0, topupAccount:TOPUP_ACCOUNT});
  if(action==='levelup'){
    const target=Number(targetLevel); const lvl=LEVELS[target];
    if(!lvl) return res.json({msg:'Invalid level'});
    const unlocked=u.unlockedLevels||[1]; const isUnlocked=unlocked.includes(target); const isNext=target===(u.level||1)+1;
    if(!isNext && !isUnlocked) return res.json({msg:`Can't jump! Buy Level ${(u.level||1)+1} first. Unlocked: ${unlocked.join(', ')}`});
    if(target<=(u.level||1)) return res.json({msg:'Already this level or higher'});
    if(payWith==='coins'){ if((u.coins||0)<lvl.coinsCost) return res.json({msg:`Need ${lvl.coinsCost} Coins. You have ${u.coins||0}.`}); await updateUser(u.id, {coins:u.coins-lvl.coinsCost}); }
    else if(payWith==='points'){ if((u.points||0)<lvl.pointsCost) return res.json({msg:`Need ${lvl.pointsCost} Points. You have ${u.points||0}. Topup!`}); await updateUser(u.id, {points:u.points-lvl.pointsCost}); }
    else return res.json({msg:'Choose Coins or Points'});
    const newUnlocked=[...new Set([...(u.unlockedLevels||[1]), target, target<20?target+1:target])];
    const upd=await updateUser(u.id, {level:target, vip_level:lvl.name.toUpperCase(), vip_until:new Date(Date.now()+30*24*60*60*1000).toISOString().slice(0,10), levelExpiresAt:Date.now()+30*24*60*60*1000, unlockedLevels:newUnlocked});
    return res.json({msg:`🎉 LEVEL UP! You are now ${lvl.name}!\nExpires in 30 days. Next level ${target+1} unlocked!`, level:upd.level, points:upd.points, coins:upd.coins});
  }
  if(action==='topup_request'){
    const pkg=TOPUP_PACKAGES.find(p=>p.id===packageId); if(!pkg) return res.json({msg:'Package not found'});
    await updateUser(u.id, {pendingTopup:{packageId, coins:pkg.coins, points:pkg.points, price:pkg.price, proof:proof||'', date:new Date().toISOString()}});
    if(ADMIN_ID && bot) bot.telegram.sendMessage(ADMIN_ID, `🏦 BANK TOPUP → Capitec ${TOPUP_ACCOUNT}\nUser: ${u.name} ID:${u.id}\nPackage: ${pkg.label}\nProof: ${proof}\n\n/approve ${u.id} ${packageId}`).catch(()=>{});
    return res.json({msg:`Topup request sent! Admin will check Capitec ${TOPUP_ACCOUNT} and add ${pkg.coins} Coins + ${pkg.points} Points.`});
  }
  res.json({msg:'OK'});
});
app.post('/api/vip-stars-invoice', async (req,res)=>{
  const {user_id, plan, targetLevel, level}=req.body;
  let u=await getUserAsync(user_id, null);
  if(!u) return res.json({error:'user not found - send /start in bot first'});
  if(!BOT_TOKEN) return res.json({error:'Bot not connected'});
  try{
    let target = targetLevel||level;
    let planName = plan;
    if(target){ planName = LEVELS[Number(target)]?.name; }
    else if(planName){ const found = Object.values(LEVELS).find(l=>l.name.toLowerCase()===String(planName).toLowerCase()); if(found) target = Object.keys(LEVELS).find(k=>LEVELS[k].name===found.name); }
    if(!target) target = (u.level||1)+1;
    target = Number(target); const lvl = LEVELS[target];
    if(!lvl) return res.json({error:'Invalid level'});
    const stars = Math.floor(Number(lvl.starsCost||250));
    const payload = `vip_${lvl.name}_${u.id}_${Date.now()}`;
    const bodyToSend = { chat_id: parseInt(u.id) || u.user_id, title: `Shaya Watch ${lvl.name}`, description: `${lvl.name} - 30 Days - $${lvl.adUSD}/ad - ${lvl.adLimit}/day - $${lvl.minWithdrawUSDT} Min`, payload, provider_token:'', currency:'XTR', prices:[{label:`${lvl.name} - 30 Days`, amount:stars}], start_parameter:`vip_${lvl.name}` };
    // If web user (not numeric), can't send invoice - tell them to open Telegram
    if(!parseInt(u.id)) return res.json({error:'Stars only in Telegram. Open @ShayaWatchAllBot, type /vip, then pay with Stars.'});
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendInvoice`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(bodyToSend)});
    const tgData = await tgRes.json();
    if(!tgData.ok) return res.json({error:'Could not send invoice. Press /start in @ShayaWatchAllBot first. '+ (tgData.description||'')});
    res.json({success:true, stars, plan:lvl.name, level:target});
  }catch(e){ res.json({error:'Could not send invoice. '+e.message}); }
});
app.post('/api/request-vip', async (req,res)=>{
  const {user_id, plan, method, proof}=req.body; let u=await getUserAsync(user_id, null);
  const reqObj={id:vipRequests.length+1, user_id:parseInt(u.id)||u.id, username:u.username, first_name:u.first_name, plan, method:method||'Stars', proof:proof||'', status:'pending', created_at:new Date().toISOString()};
  vipRequests.push(reqObj); await sbInsert('vip_requests', reqObj); res.json({success:true, plan});
});

// --- WITHDRAW: WALT = Telegram Wallet ---
app.post('/api/withdraw', async (req,res)=>{
  const {user_id, userId, name, method, wallet, detail, network}=req.body;
  const id=user_id||userId; let u=await getUserAsync(id, name);
  let cleanMethod=(method||'').trim();
  if(cleanMethod.toLowerCase().includes('trc20') || cleanMethod.toLowerCase().includes('paypal')) return res.json({error:'❌ PayPal and USDT TRC20 are REMOVED. Use Dollars (USDT) - Walt.'});
  if(cleanMethod==='USDT (TON) - Telegram Wallet' || cleanMethod==='Telegram Wallet') cleanMethod='Dollars (USDT) - Walt';
  if(cleanMethod==='Gram Wallet (TON)' || cleanMethod==='Gram Wallet') cleanMethod='Gram - Walt';
  if(cleanMethod==='usdt') cleanMethod='Dollars (USDT) - Walt';
  if(cleanMethod==='gem') cleanMethod='Gram - Walt';
  if(!cleanMethod) cleanMethod='Dollars (USDT) - Walt';
  const walletVal=(wallet||detail||'').trim();
  if(!walletVal) return res.json({error:'Enter your wallet / account / number'});
  const lvl=getLevel(u);
  const isData = cleanMethod.toLowerCase().includes('data') || method==='data';
  // Two withdraw systems: Cash balance (Watch All $) OR Coins (Earn) - support both
  // If user has cash balance, use cash system. If they chose Data/Capitec via Earn, use coins system.
  const isEarnMethod = ['capitec','airtime','data'].includes(String(method).toLowerCase()) || cleanMethod==='Capitec / Bank' && walletVal.length<12;
  if(isEarnMethod || method==='data' || method==='capitec' || method==='airtime'){
    const need = isData ? Math.ceil(lvl.withdrawMin/2) : lvl.withdrawMin;
    const amountLabel = isData ? 'R5 1GB Data (24h)' : 'R10';
    if((u.coins||0)<need) return res.json({error:`Need ${need} coins for ${amountLabel}. Balance: ${u.coins} coins.`});
    await updateUser(u.id, {coins:u.coins-need});
    let methodLabel = method==='data'?'R5 1GB Data (24h)': method==='capitec'?'Capitec Bank':'Airtime';
    if(ADMIN_ID && bot) bot.telegram.sendMessage(ADMIN_ID, `💸 WITHDRAW REQUEST (Coins)\nUser: ${u.name} (@${u.username}) ID:${u.id}\nMethod: ${methodLabel} ${network?`(${network})`:''}\nDetail: ${walletVal}\nAmount: ${amountLabel}\nLevel: ${lvl.name} | Coins Left: ${u.coins-need}`).catch(()=>{});
    return res.json({success:true, msg:`✅ Withdraw request sent! ${amountLabel} via ${methodLabel} to ${walletVal}.`});
  }
  // Cash / USDT system (Watch All)
  const minUSDT=lvl.minWithdrawUSDT;
  const minCash=u.region==='SA'? minUSDT*USDT_TO_ZAR : minUSDT;
  if(u.balance<minCash) return res.json({error:`Min withdraw is $${minUSDT} USDT (${u.currency}${minCash.toFixed(2)}). You have ${u.currency}${u.balance.toFixed(2)}.`});
  if(cleanMethod==='Dollars (USDT) - Walt' || cleanMethod==='Gram - Walt'){
    if(!walletVal.startsWith('UQ')) return res.json({error:'❌ Wrong address! Walt addresses start with UQ... Go to Walt > Dollars > Deposit > Copy UQ...'});
    if(walletVal.startsWith('T')) return res.json({error:'❌ That is TRC20 (T...). Walt uses TON - must start with UQ...'});
  }
  const usdtAmount=u.region==='SA'?(u.balance/USDT_TO_ZAR):u.balance;
  const zarAmount=u.region==='SA'?u.balance:u.balance*USDT_TO_ZAR;
  const w={id:withdrawals.length+1, user_id:parseInt(u.id)||u.id, username:u.username, first_name:u.first_name, method:cleanMethod, wallet:walletVal, amountCash:parseFloat(u.balance.toFixed(2)), usdtAmount:parseFloat(usdtAmount.toFixed(2)), zarAmount:parseFloat(zarAmount.toFixed(2)), region:u.region, vip_level:getVipName(u), status:'pending', created_at:new Date().toISOString()};
  withdrawals.push(w); await sbInsert('withdrawals', w);
  await updateUser(u.id, {balance:0});
  if(bot && ADMIN_ID) bot.telegram.sendMessage(ADMIN_ID, `💸 NEW WITHDRAW - WALT\nUser: ${u.first_name} (@${u.username}) ID: ${u.id}\nAmount: ${u.currency}${w.amountCash} = $${w.usdtAmount} USDT = R${w.zarAmount}\nMethod: ${w.method}\nWallet: ${walletVal}\n⚠️ Send on TON only - UQ...`).catch(()=>{});
  res.json({success:true, usdtAmount:w.usdtAmount, zarAmount:w.zarAmount});
});
app.get('/api/tasks', (req,res)=>res.json(tasksList));
app.get('/api/leaderboard', async (req,res)=>{
  const all=Array.from(users.values()).sort((a,b)=>(b.balance+(b.coins/1000)*(b.region==='SA'?USDT_TO_ZAR:1))-(a.balance+(a.coins/1000)*(a.region==='SA'?USDT_TO_ZAR:1))).slice(0,20).map(u=>({user_id:u.user_id||u.id, username:u.username, first_name:u.first_name, region:u.region, vip_level:getVipName(u), balance:u.balance, coins:u.coins}));
  res.json(all);
});
app.post('/api/offerwall-credit', async (req,res)=>{
  const {user_id, amount, source}=req.body; let u=await getUserAsync(user_id, null);
  const coinsToAdd=Math.floor(parseFloat(amount)||0); if(coinsToAdd<=0) return res.json({error:'Invalid amount'});
  const updated=await updateUser(u.id, {coins:(u.coins||0)+coinsToAdd, total_earned:(u.total_earned||0)+(coinsToAdd/1000)});
  offerwallRewards.push({user_id:u.id, amount:coinsToAdd, source:source||'giga-offerwall-9114', created_at:new Date().toISOString()});
  res.json({success:true, coinsAdded:coinsToAdd, user:formatUserForFrontend(updated)});
});
async function fetchYouTube(query, region, maxResults=12){
  if(!YOUTUBE_API_KEY) return [];
  try{ const regionCode=region==='SA'?'ZA':'US'; const url=`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(query)}&regionCode=${regionCode}&key=${YOUTUBE_API_KEY}`; const r=await fetch(url); const d=await r.json(); if(!d.items) return []; return d.items.map(it=>({id:it.id.videoId, title:it.snippet.title, channel:it.snippet.channelTitle, thumb:it.snippet.thumbnails?.medium?.url||'', views:'Trending', url:`https://www.youtube.com/watch?v=${it.id.videoId}`})); }catch(e){ return []; }
}
app.get('/api/videos/trending', async (req,res)=>{ res.json(await fetchYouTube(req.query.region==='SA'?'Amapiano trending South Africa 2026':'Trending USA Hip Hop 2026', req.query.region||'SA')); });
app.get('/api/videos/music', async (req,res)=>{ res.json(await fetchYouTube(req.query.region==='SA'?'Amapiano Kabza De Small DJ Maphorisa':'Hip Hop Music Videos 2026', req.query.region||'SA')); });
app.get('/api/videos/search', async (req,res)=>{ res.json(await fetchYouTube(req.query.q||'Amapiano', req.query.region||'SA')); });
app.get('/api/admin/pending', (req,res)=>res.json({withdrawals:withdrawals.filter(w=>w.status==='pending'), vipRequests:vipRequests.filter(v=>v.status==='pending')}));

// ===== BOT =====
if(bot){
  bot.start(async (ctx)=>{
    const user_id=ctx.from.id; const payload=ctx.startPayload||''; let referred_by=null;
    if(payload.startsWith('ref_')) referred_by=payload.replace('ref_','');
    else if(payload && /^\d+$/.test(payload) || payload.startsWith('web_')) referred_by=payload;
    let u=await getUser(user_id); if(!u) u=await createUser(user_id, {username:ctx.from.username||'', first_name:ctx.from.first_name||'', referred_by:referred_by?String(referred_by):null});
    const rate=await refreshRate();
    await ctx.replyWithMarkdown(`👋 Welcome to *SHAYA WATCH BOT* ${u.first_name}!\n\n🔥 *EARN*\n📺 Watch Ad = Cash + Coins\n🧠 Quiz = +Coins (Unlock after 10 ads)\n🏦 Topup Capitec ${TOPUP_ACCOUNT} = Coins + Points\n🎁 Offerwall (Giga 9114) = Coins\n👥 Invite = +50 Coins\n\n👑 *VIP - 20 Levels, 30 Days*\nFREE: $0.01/ad • 10/day • $50 Min\nKING: $0.10/ad • 20/day • $20 Min\nBuy with Coins / Points / Stars\n\n💰 *Withdraw:* Capitec / Airtime / USDT (WALT) / GEM (WALT) / R5 1GB Data\n💱 1 USDT = R${rate.toFixed(2)} LIVE\n\nTap below 👇`, {reply_markup:{inline_keyboard:[[{text:'🚀 OPEN SHAYA WATCH BOT', web_app:{url:WEBAPP_URL}}],[{text:'👥 Join Shaya Earn Network', url:GROUP_URL}]]}});
  });
  bot.command('balance', async (ctx)=>{ let u=await getUser(ctx.from.id); if(!u) return ctx.reply('Send /start first'); const f=formatUserForFrontend(u); ctx.reply(`💰 Balance: ${f.currency}${f.balance.toFixed(2)} = $${f.usdtBalance} USDT\n🪙 Coins: ${f.coins} | Points: ${u.points||0}\n📺 Ads Today: ${f.dailyAds}/${f.dailyLimit}\n👑 VIP: ${f.vip_level} (${u.level}/20) ${u.levelExpiresAt?`Expires in ${f.expiresInDays} days`:''}\nUnlocked: ${(u.unlockedLevels||[1]).join(', ')}`); });
  bot.command('vip', async (ctx)=>{
    let u=await getUserAsync(ctx.from.id, ctx.from.first_name);
    const next=Math.min(20,(u.level||1)+1); const lvl=LEVELS[next];
    await ctx.reply(`👑 Your Level: ${getVipName(u)} (${u.level}/20)\nCoins: ${u.coins} | Points: ${u.points||0}\nExpires: ${u.levelExpiresAt? new Date(u.levelExpiresAt).toLocaleDateString() : 'Free - No Expiry'}\nUnlocked: ${(u.unlockedLevels||[1]).join(', ')}\n\nNext: Level ${next} ${lvl.name}\nCost: ${lvl.coinsCost} Coins OR ${lvl.pointsCost} Points OR ${lvl.starsCost} Stars\n\nOpen App to buy with Coins/Points, or tap below for Stars:`, {reply_markup:{inline_keyboard:[[{text:`⭐ Buy ${lvl.name} - ${lvl.starsCost} Stars`, callback_data:`buy_stars_${next}`}],[{text:'🚀 OPEN SHAYA WATCH BOT', web_app:{url:WEBAPP_URL}}]]}});
  });
  bot.command('vipall', async (ctx)=>{
    let u=await getUserAsync(ctx.from.id, ctx.from.first_name);
    let txt=`👑 ALL 20 VIP — 30 Day Expiry, Unlocked Stays Unlocked\nYour Unlocked: ${(u.unlockedLevels||[1]).join(', ')}\n\n`;
    for(let i=1;i<=20;i++){ txt+=`${i}. ${LEVELS[i].name} — ${LEVELS[i].coinsCost} Coins / ${LEVELS[i].pointsCost} Points / ${LEVELS[i].starsCost} Stars — $${LEVELS[i].adUSD}/ad — ${LEVELS[i].adLimit}/day — $${LEVELS[i].minWithdrawUSDT} Min — ${(u.unlockedLevels||[]).includes(i)?'✅ UNLOCKED':'🔒 LOCKED'}\n`; }
    await ctx.reply(txt);
  });
  bot.command('approve', async (ctx)=>{
    if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
    const parts=ctx.message.text.split(' '); const targetId=parts[1]; const pkgId=parts[2];
    let target=await getUser(targetId); const pkg=TOPUP_PACKAGES.find(p=>p.id===pkgId);
    if(!target||!pkg) return ctx.reply('User or package not found');
    await updateUser(target.id, {coins:target.coins+pkg.coins, total_earned:target.total_earned+pkg.coins, points:(target.points||0)+pkg.points, pendingTopup:null});
    ctx.reply(`✅ Approved! +${pkg.coins} Coins +${pkg.points} Points to ${target.name}`);
    try{ await ctx.telegram.sendMessage(parseInt(target.id)||target.id, `✅ TOPUP APPROVED! +${pkg.coins} Coins +${pkg.points} Points!\nCoins: ${target.coins+pkg.coins} (Can Withdraw!)\nPoints: ${(target.points||0)+pkg.points} (Can Buy VIP!)`); }catch(e){}
  });
  bot.command('approvevip', async (ctx)=>{
    if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
    const parts=ctx.message.text.split(' '); const targetId=parts[1]; const levelNum=parseInt(parts[2])||2;
    let u=await getUser(targetId); if(!u) return ctx.reply('User not found');
    const lvl=LEVELS[levelNum]; const until=new Date(Date.now()+30*24*60*60*1000).toISOString().slice(0,10);
    const newUnlocked=[...new Set([...(u.unlockedLevels||[1]), levelNum, levelNum<20?levelNum+1:levelNum])];
    await updateUser(u.id, {level:levelNum, vip_level:lvl.name.toUpperCase(), vip_until:until, levelExpiresAt:Date.now()+30*24*60*60*1000, unlockedLevels:newUnlocked});
    ctx.reply(`✅ Approved ${lvl.name} for ${u.name} (${targetId}) until ${until}`);
    try{ await ctx.telegram.sendMessage(parseInt(u.id)||u.id, `🎉 Your ${lvl.name} is ACTIVE until ${until}!`); }catch(e){}
  });
  bot.command('paywithdraw', async (ctx)=>{
    if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
    const id=parseInt(ctx.message.text.split(' ')[1]); const w=withdrawals.find(x=>x.id===id); if(!w) return ctx.reply('Withdraw not found');
    w.status='paid'; ctx.reply(`✅ Marked withdraw #${id} as PAID`);
    try{ await ctx.telegram.sendMessage(w.user_id, `✅ Your withdraw of $${w.usdtAmount} USDT has been PAID!`); }catch(e){}
  });
  bot.command('stats', async (ctx)=>{ if(ctx.from.id!==ADMIN_ID) return; ctx.reply(`📊 STATS\nUsers: ${users.size}\nWithdraws Paid: ${withdrawals.filter(w=>w.status==='paid').length}\nPending: ${withdrawals.filter(w=>w.status==='pending').length}\nRate: 1 USDT = R${USDT_TO_ZAR.toFixed(2)}`); });
  bot.on('pre_checkout_query', async (ctx)=>{ try{ await ctx.answerPreCheckoutQuery(true); }catch(e){} });
  bot.on('successful_payment', async (ctx)=>{
    const pay=ctx.message.successful_payment; const payload=pay.invoice_payload||'';
    let target=null;
    const m=payload.match(/vip_(.+)_(\d+)_/); if(m){ const name=m[1]; const found=Object.entries(LEVELS).find(([k,v])=>v.name===name); if(found) target=parseInt(found[0]); }
    if(!target){ const parts=payload.split('_'); target=parseInt(parts[1])||2; }
    const lvl=LEVELS[target]||LEVELS[2];
    const user_id=ctx.from.id; const starsPaid=pay.total_amount;
    const until=new Date(Date.now()+30*24*60*60*1000).toISOString().slice(0,10);
    let u=await getUser(user_id); if(!u) u=await createUser(user_id, {username:ctx.from.username||'', first_name:ctx.from.first_name||''});
    const newUnlocked=[...new Set([...(u.unlockedLevels||[1]), target, target<20?target+1:target])];
    await updateUser(u.id, {level:target, vip_level:lvl.name.toUpperCase(), vip_until:until, levelExpiresAt:Date.now()+30*24*60*60*1000, unlockedLevels:newUnlocked});
    await ctx.reply(`🎉 VIP ACTIVATED!\n\n👑 Plan: ${lvl.name} (Level ${target}/20)\n⭐ Paid: ${starsPaid} Stars\n📅 Until: ${until}\n\nGo back to app and refresh!`, {reply_markup:{inline_keyboard:[[{text:'🚀 OPEN SHAYA WATCH BOT', web_app:{url:WEBAPP_URL}}]]}});
    if(ADMIN_ID){ try{ await ctx.telegram.sendMessage(ADMIN_ID, `⭐ STARS RECEIVED!\nUser: ${ctx.from.first_name} (@${ctx.from.username}) ID: ${user_id}\nPlan: ${lvl.name}\nStars: ${starsPaid} ⭐\nUntil: ${until}`); }catch(e){} }
  });
  // Callback for Stars buttons
  bot.on('callback_query', async (ctx)=>{
    const data=ctx.callbackQuery.data||'';
    if(data.startsWith('buy_stars_')){
      const target=parseInt(data.split('_')[2]); const lvl=LEVELS[target];
      try{ await ctx.answerCbQuery(); }catch(e){}
      try{ await ctx.telegram.sendInvoice(ctx.from.id, `Shaya Watch ${lvl.name}`, `${lvl.name} - 30 Days - $${lvl.adUSD}/ad - ${lvl.adLimit}/day - $${lvl.minWithdrawUSDT} Min`, `vip_${lvl.name}_${ctx.from.id}_${Date.now()}`, '', 'XTR', [{label:`${lvl.name} - 30 Days`, amount:lvl.starsCost}]); }catch(e){ await ctx.reply('Stars failed: '+e.message); }
    }
  });
  bot.launch().then(()=>console.log('Bot launched @ShayaWatchAllBot - Shaya Watch Bot')).catch(e=>console.log('Bot launch failed', e.message));
  process.once('SIGINT', ()=>bot.stop('SIGINT')); process.once('SIGTERM', ()=>bot.stop('SIGTERM'));
} else console.log('⚠️ BOT_TOKEN not set - bot disabled, API still works');

app.listen(PORT, ()=>{ console.log(`✅ Shaya Watch Bot running on ${PORT}`); console.log(`WebApp: ${WEBAPP_URL}`); console.log(`Giga Ad: 9114 | Offerwall: 9114 | OnclickA: 472254`); });
