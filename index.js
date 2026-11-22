// ===== SHAYA WATCH BOT - FULL - FINAL - FIXED =====
// Bot: @ShayaWatchAllBot | Giga 9114 + Offerwall 9114 + OnclickA 472254
// RULES: Coins = Buy Coins ONLY, Ads R0.05 + 5 Coins, Coins = Cash or VIP. VIP = Coins / Stars ONLY. Data = ONLY R5 1GB TikTok 24h - 550 Coins
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
const TOPUP_ACCOUNT = '1893275807';
let supabase = null;
try { if (SUPABASE_URL && SUPABASE_KEY) { supabase = createClient(SUPABASE_URL, SUPABASE_KEY); console.log('Supabase connected'); } } catch(e){ console.log('Supabase failed', e.message); }
let USDT_TO_ZAR = 16.59;
let lastRateFetch = 0;
async function refreshRate(){
  const now = Date.now();
  if(now - lastRateFetch < 30*60*1000) return USDT_TO_ZAR;
  try{ const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD'); const d = await r.json(); if(d && d.rates && d.rates.ZAR){ USDT_TO_ZAR = parseFloat(d.rates.ZAR); lastRateFetch = now; } }catch(e){}
  return USDT_TO_ZAR;
}
refreshRate(); setInterval(refreshRate, 30*60*1000);
function todayStr(){ return new Date().toISOString().slice(0,10); }
function giveText(coins){ return coins ? '+'+coins+' Coins' : 'Nothing'; }
function giveLine(coins){ return coins ? coins+' Coins' : 'Nothing'; }
const MIN_WITHDRAW_SA = 350;
const MIN_WITHDRAW_USA = 20;
const LEVEL_NAMES = ['Free','Starter','Bronze','Bronze+','Silver','Silver+','Gold','Gold+','Platinum','Platinum+','Diamond','Diamond+','Ruby','Ruby+','Emerald','Emerald+','Sapphire','Sapphire+','Master','KING'];
const LEVEL_STARS = [0,10,20,35,50,75,100,130,170,210,260,320,380,450,550,650,800,1000,1300,2000];
const LEVEL_COINS = [0,100,200,350,500,750,1000,1300,1700,2100,2600,3200,3800,4500,5500,6500,8000,10000,13000,18000];
const LEVEL_AD_USD = [0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005];
const LEVEL_AD_CASH_SA = [0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05];
const LEVEL_AD_COINS = [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5];
const LEVEL_QUIZ = [25,25,25,30,30,35,35,40,40,50,50,60,60,70,70,80,80,90,90,100];
// ===== LEVELS ONLY - DO NOT CHANGE ANYTHING ELSE =====
function levelAds(level){ return 20 * Math.max(1, level||1); }
function levelMinCoins(level){ return Math.max(2000, 21000 - (Math.max(1,level||1)-1)*1000); }
function levelMinRand(level){ return Math.floor(levelMinCoins(level)/60); }
const LEVELS = {};
for(let i=0;i<20;i++){ const lvl=i+1; LEVELS[lvl] = { name: LEVEL_NAMES[i], starsCost: LEVEL_STARS[i], coinsCost: LEVEL_COINS[i], adReward: LEVEL_AD_COINS[i], adCashSA: LEVEL_AD_CASH_SA[i], adUSD: LEVEL_AD_USD[i], withdrawMin: levelMinCoins(lvl), quizReward: LEVEL_QUIZ[i], adLimit: levelAds(lvl), minWithdrawUSDT: 20, minWithdrawSA: levelMinRand(lvl), minWithdrawUSA: 20 }; }
function getLevel(u){ return LEVELS[u.level || 1]; }
function getVipName(u){ return (LEVELS[u.level || 1] && LEVELS[u.level || 1].name || 'FREE').toUpperCase(); }
function curFor(u){ return u && u.region==='USA' ? '$' : 'R'; }
function minLabelFor(u){ if(u && u.region==='USA') return '$20'; return 'R'+levelMinRand(u?.level||1); }
function perAdLabelFor(u){ return u && u.region==='USA' ? '$0.005' : 'R0.05'; }
const QUIZ_UNLOCK_ADS = 10;
const TOPUP_PACKAGES = [
  { id:'p29', coins:500, price:29, label:'R29 - 500 Coins ONLY' },
  { id:'p79', coins:1500, price:79, label:'R79 - 1500 Coins ONLY' },
  { id:'p179', coins:4000, price:179, label:'R179 - 4000 Coins ONLY' },
  { id:'p349', coins:9000, price:349, label:'R349 - 9000 Coins ONLY' },
  { id:'p699', coins:20000, price:699, label:'R699 - 20000 Coins ONLY' },
];
const BUY_COINS_PACKAGES = [
  { id:'c500', coins:500, price:20, label:'500 Coins - R20' },
  { id:'c1500', coins:1500, price:50, label:'1500 Coins - R50' },
  { id:'c5000', coins:5000, price:150, label:'5000 Coins - R150' },
  { id:'c15000', coins:15000, price:400, label:'15000 Coins - R400' },
];
const BUY_POINTS_PACKAGES = [];
const BUY_COINS_STARS = [];
const BUY_POINTS_STARS = [];
const ALL_BUY_PACKAGES = TOPUP_PACKAGES.concat(BUY_COINS_PACKAGES);
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
  { id: 1, title: 'Join Shaya Earn Network', link: GROUP_URL, reward_cash: 0.05, reward_coins: 20, type: 'join_group', desc: 'Join the group, then Claim' },
  { id: 2, title: 'Invite 3 Friends', link: 'https://t.me/ShayaWatchAllBot', reward_cash: 0.10, reward_coins: 50, type: 'invite_3', desc: 'Invite 3 friends with your link' },
  { id: 3, title: 'Share Shaya Watch on WhatsApp', link: 'https://t.me/ShayaWatchAllBot', reward_cash: 0.05, reward_coins: 10, type: 'share_whatsapp', desc: 'Share to WhatsApp, then Claim' },
];
const users = new Map();
const withdrawals = [];
const vipRequests = [];
const offerwallRewards = [];
function parseTopupCallback(data, prefix){
  const rest = data.replace(prefix, '');
  const lastUnd = rest.lastIndexOf('_');
  if(lastUnd === -1) return { userId: rest, packageId: '' };
  return { userId: rest.slice(0, lastUnd), packageId: rest.slice(lastUnd+1) };
}
async function sbGetUser(id){
  if(!supabase) return null;
  try{
    let res1 = await supabase.from('users').select('*').eq('id', String(id)).single();
    if(res1.data) return res1.data;
    const n = parseInt(id); if(!isNaN(n)){ const r2 = await supabase.from('users').select('*').eq('user_id', n).single(); return r2.data || null; }
    return null;
  }catch(e){ return null; }
}
async function sbUpsertUser(u){
  if(!supabase) return;
  try{ await supabase.from('users').upsert({ id: String(u.id), user_id: parseInt(u.id) || null, username: u.username || '', first_name: u.first_name || u.name || '', name: u.name || u.first_name || '', region: u.region, currency: u.currency, balance: u.balance, coins: u.coins, points: 0, level: u.level || 1, total_ads: u.total_ads || 0, referrals: u.referrals || 0, streak: u.streak || 0, total_earned: u.total_earned || 0, vip_level: getVipName(u), vip_until: u.vip_until || null, daily_ads: u.dailyAds || 0, daily_date: u.dailyDate || '', last_daily: u.lastDaily || null, last_quiz: u.lastQuiz || 0, last_ad: u.lastAd || 0, ads_today: u.adsToday || 0, last_ad_day: u.lastAdDay || '', tasks_done: u.tasksDone || [], completed_tasks: u.completedTasks || [], pending_topup: u.pendingTopup || null, pending_withdraw: u.pendingWithdraw || null, device_id: u.device_id || null, unlocked_levels: u.unlockedLevels || [1], level_expires_at: u.levelExpiresAt || 0, referred_by: u.referred_by || null }, { onConflict: 'id' }); }catch(e){ console.log('sb upsert failed', e.message); }
}
async function sbInsert(table, row){ if(!supabase) return; try{ await supabase.from(table).insert(row); }catch(e){} }
async function getUser(id){
  const key = String(id);
  if(users.has(key)) return users.get(key);
  const sb = await sbGetUser(key);
  if(sb){
    const u = { id: key, user_id: sb.user_id || parseInt(key) || null, username: sb.username || '', first_name: sb.first_name || sb.name || 'friend', name: sb.first_name || sb.name || 'friend', region: sb.region || 'SA', currency: sb.region==='USA'?'$':'R', balance: parseFloat(sb.balance || 0), coins: parseInt(sb.coins || 0), points: 0, level: parseInt(sb.level || 1), total_ads: parseInt(sb.total_ads || 0), referrals: parseInt(sb.referrals || 0), streak: parseInt(sb.streak || 0), total_earned: parseFloat(sb.total_earned || 0), vip_level: sb.vip_level || 'FREE', vip_until: sb.vip_until || null, dailyAds: parseInt(sb.daily_ads || 0), dailyDate: sb.daily_date || todayStr(), lastDaily: sb.last_daily || null, lastQuiz: sb.last_quiz || 0, lastAd: sb.last_ad || 0, adsToday: sb.ads_today || 0, lastAdDay: sb.last_ad_day || '', tasksDone: sb.tasks_done || [], completedTasks: sb.completed_tasks || sb.tasks_done || [], pendingTopup: sb.pending_topup || null, pendingWithdraw: sb.pending_withdraw || null, device_id: sb.device_id || null, unlockedLevels: sb.unlocked_levels || [1], levelExpiresAt: sb.level_expires_at || 0, referred_by: sb.referred_by || null };
    users.set(key, u); return u;
  }
  return null;
}
async function createUser(id, data){
  data = data || {};
  const key = String(id);
  const region = data.region || 'SA';
  const u = { id: key, user_id: parseInt(id) || null, username: data.username || '', first_name: data.first_name || data.name || 'friend', name: data.first_name || data.name || 'friend', region: region, currency: region==='USA'?'$':'R', balance:0, coins:0, points:0, level:1, total_ads:0, referrals:0, streak:0, total_earned:0, vip_level:'FREE', vip_until:null, dailyAds:0, dailyDate:todayStr(), lastDaily:null, lastQuiz:0, lastAd:0, adsToday:0, lastAdDay:'', tasksDone:[], completedTasks:[], pendingTopup:null, pendingWithdraw:null, device_id:data.device_id || null, unlockedLevels:[1], levelExpiresAt:0, referred_by: data.referred_by || null };
  users.set(key, u); await sbUpsertUser(u);
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
async function getUserAsync(id, name, extra){
  extra = extra || {};
  let u = await getUser(id);
  if(!u) u = await createUser(id, { first_name: name, name: name, device_id: extra.device_id, referred_by: extra.referred_by });
  if(name) { u.name = name; u.first_name = name; }
  if(extra.device_id) u.device_id = extra.device_id;
  if(u.level>1 && u.levelExpiresAt && Date.now()>u.levelExpiresAt){
    u.level = Math.max(1, u.level-1); u.levelExpiresAt = 0; u.vip_level = getVipName(u);
    await updateUser(u.id, { level: u.level, levelExpiresAt: 0, vip_level: u.vip_level });
  }
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
  const perAd = { cash: u.region==='SA'? lvl.adCashSA : lvl.adUSD, coins: lvl.adReward, usd: u.region==='SA'? lvl.adCashSA : lvl.adUSD, dailyLimit: lvl.adLimit, minWithdrawUSDT: 20 };
  const dailyLimit = perAd.dailyLimit, dailyAds = u.dailyAds || 0, dailyLeft = Math.max(0, dailyLimit-dailyAds);
  const usdtBal = u.region==='SA' ? (u.balance/USDT_TO_ZAR) : u.balance;
  const minCash = u.region==='SA' ? levelMinRand(u.level||1) : MIN_WITHDRAW_USA;
  return { id: u.id, user_id: u.user_id || u.id, username: u.username, first_name: u.first_name, name: u.name, region: u.region, currency: u.currency, balance: u.balance, coins: u.coins, points: 0, level: u.level, total_ads: u.total_ads, referrals: u.referrals, streak: u.streak, total_earned: u.total_earned, vip_level: getVipName(u), vipBadge: getVipName(u), vip_until: u.vip_until, levelName: lvl.name, perAd: perAd, dailyLimit: dailyLimit, dailyAds: dailyAds, dailyLeft: dailyLeft, minWithdrawUSDT: 20, minCash: minCash, minLabel: u.region==='SA'?'R'+levelMinRand(u.level||1):'$20', usdtToZar: USDT_TO_ZAR, usdtBalance: parseFloat(usdtBal.toFixed(4)), unlockedLevels: u.unlockedLevels || [1], levelExpiresAt: u.levelExpiresAt || 0, expiresInDays: u.levelExpiresAt? Math.max(0, Math.ceil((u.levelExpiresAt-Date.now())/(1000*60*60*24))):0, withdrawMin: lvl.withdrawMin, quizUnlocked: (u.total_ads||0)>=QUIZ_UNLOCK_ADS, quizNeed: Math.max(0, QUIZ_UNLOCK_ADS-(u.total_ads||0)) };
}
function getPerAd(u){ const lvl=getLevel(u); return { cash: u.region==='SA'? lvl.adCashSA : lvl.adUSD, coins: lvl.adReward, usd: u.region==='SA'? lvl.adCashSA : lvl.adUSD, dailyLimit: lvl.adLimit, minWithdrawUSDT: 20 }; }
let bot = null;
if(BOT_TOKEN){ try{ bot = new Telegraf(BOT_TOKEN); console.log('Bot created - Shaya Watch Bot'); }catch(e){ console.log('Bot create failed', e.message); } }
app.get('/health', function(req,res){ res.json({ok:true, bot:'Shaya Watch Bot', time:new Date().toISOString()}); });
app.get('/api/version', function(req,res){ res.json({version:'shaya-watch-bot-fixed-0.05-no-points', giga:'9114', onclicka:'472254', minSA:'Dynamic R350->R33', minUSA:'$20', airtime:'110 Coins=R1 NO LIMIT', data:'R5 1GB TikTok 24h ONLY - 550 Coins', perAdSA:'R0.05 per 2 ads + 5 Coins', perAdUSA:'$0.005 per 2 ads + 5 Coins', adMode:'2-in-1', coins:'Cash or VIP', vip:'Coins / Stars ONLY'}); });
app.get('/', function(req,res){ res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/api/rate', async function(req,res){ const r = await refreshRate(); res.json({usdtToZar:r, usdt:1, zar:r, usd:1}); });
app.get('/api/convert-usdt', async function(req,res){ const usdt=parseFloat(req.query.usdt || 0); const r=await refreshRate(); res.json({usdt:usdt, zar:(usdt*r).toFixed(2), usd:usdt.toFixed(2), rate:r, usdtToZar:r}); });
app.get('/api/vip-plans', async function(req,res){ const region=req.query.region || 'SA'; const out={}; for(let i=1;i<=20;i++){ const l=LEVELS[i]; out[l.name]= { name:l.name, level:i, perAdUSD:l.adUSD, perAdCash: region==='SA'? l.adCashSA:l.adUSD, perAdCoins:l.adReward, dailyLimit:l.adLimit, minWithdrawUSDT:20, days:30, stars:l.starsCost, coinsCost:l.coinsCost, withdrawMin:l.withdrawMin, minRand: levelMinRand(i) }; } res.json(out); });
app.get('/api/user/:id', async function(req,res){ const u = await getUserAsync(req.params.id, null); if(!u) return res.json({error:'user not found - send /start in bot first'}); res.json(formatUserForFrontend(u)); });
app.post('/api/sync', async function(req,res){ const b=req.body; let u = await getUserAsync(b.user_id, null); const patch={}; if(b.balance!==undefined) patch.balance=parseFloat(b.balance); if(b.coins!==undefined) patch.coins=parseInt(b.coins); if(b.total_ads!==undefined) patch.total_ads=parseInt(b.total_ads); if(b.referrals!==undefined) patch.referrals=parseInt(b.referrals); if(b.streak!==undefined) patch.streak=parseInt(b.streak); if(b.total_earned!==undefined) patch.total_earned=parseFloat(b.total_earned); if(b.region){ patch.region=b.region; patch.currency=b.region==='USA'?'$':'R'; } if(b.vip_level) patch.vip_level=b.vip_level; const updated = await updateUser(u.id, patch); res.json({success:true, user:formatUserForFrontend(updated)}); });
app.post('/api/set-region', async function(req,res){ const b=req.body; if(b.region!=='SA' && b.region!=='USA') return res.json({error:'Invalid region'}); let u = await getUserAsync(b.user_id, null); if(u.region===b.region) return res.json({success:true, user:formatUserForFrontend(u)}); const rate=await refreshRate(); const oldRegion=u.region, oldBalance=u.balance; let newBalance=oldBalance; if(oldRegion==='SA'&&b.region==='USA') newBalance=oldBalance/rate; else if(oldRegion==='USA'&&b.region==='SA') newBalance=oldBalance*rate; const updated=await updateUser(u.id, {region:b.region, currency:b.region==='USA'?'$':'R', balance:parseFloat(newBalance.toFixed(2))}); res.json({success:true, user:formatUserForFrontend(updated)}); });
app.post('/api/watch', async function(req,res){
  const u0=req.body; let u=await getUserAsync(u0.user_id, null);
  if(u0.adCount!==undefined && parseInt(u0.adCount)<2) return res.json({error:'Watch 2 ads first! 2 Ads = 1 Reward. You watched '+(u0.adCount||0)+'/2.'});
  if(u.dailyDate!==todayStr()){ u.dailyAds=0; u.dailyDate=todayStr(); }
  const perAd=getPerAd(u);
  if((u.dailyAds||0)>=perAd.dailyLimit) return res.json({error:'Daily limit reached! '+getVipName(u)+' = '+perAd.dailyLimit+'/day. Buy Level '+((u.level||1)+1)+' for '+levelAds((u.level||1)+1)+'/day!', dailyAds:u.dailyAds, dailyLimit:perAd.dailyLimit});
  const updated=await updateUser(u.id, { balance: parseFloat((u.balance+perAd.cash).toFixed(2)), coins: u.coins+perAd.coins, total_ads:(u.total_ads||0)+1, total_earned: parseFloat(((u.total_earned||0)+perAd.cash).toFixed(2)), dailyAds:(u.dailyAds||0)+1, dailyDate:todayStr(), lastAd:Date.now(), adsToday:(u.adsToday||0)+1, lastAdDay:todayStr() });
  res.json({success:true, earnedCash:parseFloat(perAd.cash.toFixed(2)), earnedCoins:perAd.coins, earnedUSD:perAd.usd, dailyAds:updated.dailyAds, dailyLimit:perAd.dailyLimit, dailyLeft:perAd.dailyLimit-updated.dailyAds, balance:updated.balance, adMode:'2-in-1'});
});
app.post('/api/earn', async function(req,res){
  const b=req.body;
  const id = b.userId || b.user_id;
  const u = await getUserAsync(id, b.name, {device_id:b.device_id});
  const lvl=getLevel(u);
  if(b.action==='balance') return res.json({coins:u.coins, totalEarned:u.total_earned, adsWatched:u.total_ads, level:u.level||1, levelName:lvl.name, points:0, tasks:OFFERWALL, tasksDone:u.tasksDone, quizUnlocked:(u.total_ads||0)>=QUIZ_UNLOCK_ADS, quizNeed:Math.max(0,QUIZ_UNLOCK_ADS-(u.total_ads||0)), withdrawMin:lvl.withdrawMin, unlockedLevels:u.unlockedLevels||[1], levelExpiresAt:u.levelExpiresAt||0, expiresInDays:u.levelExpiresAt?Math.max(0,Math.ceil((u.levelExpiresAt-Date.now())/(1000*60*60*24))):0});
  if(b.action==='ad'){
    if(b.adCount!==undefined && parseInt(b.adCount)<2) return res.json({coins:u.coins, msg:'Watch 2 ads first! 2 Ads = 1 Reward.'});
    if(u.dailyDate!==todayStr()){ u.dailyAds=0; u.dailyDate=todayStr(); }
    const perAd=getPerAd(u);
    if((u.dailyAds||0)>=perAd.dailyLimit) return res.json({coins:u.coins, msg:'Daily limit '+perAd.dailyLimit+' reached. Go VIP!'});
    if(Date.now()-(u.lastAd||0)<10000) return res.json({coins:u.coins, msg:'Wait 10 sec'});
    const upd=await updateUser(u.id, {coins:u.coins+perAd.coins, balance:parseFloat((u.balance+perAd.cash).toFixed(2)), total_earned:parseFloat((u.total_earned+perAd.cash).toFixed(2)), total_ads:u.total_ads+1, dailyAds:u.dailyAds+1, dailyDate:todayStr(), lastAd:Date.now(), adsToday:(u.adsToday||0)+1, lastAdDay:todayStr()});
    return res.json({coins:upd.coins, msg:'+'+perAd.coins+' Coins + '+u.currency+perAd.cash.toFixed(2)+'! Balance: '+upd.coins+' coins'});
  }
  if(b.action==='quiz'){
    if((u.total_ads||0)<QUIZ_UNLOCK_ADS) return res.json({coins:u.coins, msg:'Quiz Locked! Watch '+(QUIZ_UNLOCK_ADS-(u.total_ads||0))+' more ads.', locked:true});
    if(Date.now()-(u.lastQuiz||0)<20*60*60*1000) return res.json({coins:u.coins, msg:'Already played today'});
    return res.json({coins:u.coins, quiz:QUIZ});
  }
  if(b.action==='quiz_done'){
    if((u.total_ads||0)<QUIZ_UNLOCK_ADS) return res.json({coins:u.coins, msg:'Quiz locked. Watch 10 ads first.'});
    if(Date.now()-(u.lastQuiz||0)<20*60*60*1000) return res.json({coins:u.coins, msg:'Already played today'});
    const upd = b.score>=3 ? await updateUser(u.id, {coins:u.coins+lvl.quizReward, total_earned:u.total_earned+lvl.quizReward, lastQuiz:Date.now()}) : await updateUser(u.id, {lastQuiz:Date.now()});
    return res.json({coins:upd.coins, msg: b.score>=3 ? 'Score '+b.score+'/5. +'+lvl.quizReward+' coins!' : 'Score '+b.score+'/5. Need 3+ to earn.'});
  }
  if(b.action==='offerwall'){
    const task=OFFERWALL.find(function(t){ return t.id===b.taskId; });
    if(!task) return res.json({coins:u.coins, msg:'Task not found'});
    if((u.tasksDone||[]).indexOf(b.taskId)!==-1) return res.json({coins:u.coins, msg:'Already claimed'});
    if(b.taskId==='ads_10' && (u.total_ads||0)<10) return res.json({coins:u.coins, msg:'Watch 10 ads first. You have '+u.total_ads});
    if(b.taskId==='ads_50' && (u.total_ads||0)<50) return res.json({coins:u.coins, msg:'Watch 50 ads first. You have '+u.total_ads});
    if(b.taskId==='invite_1' && (u.referrals||0)<1) return res.json({coins:u.coins, msg:'Invite 1 friend first'});
    const upd=await updateUser(u.id, {tasksDone:(u.tasksDone||[]).concat([b.taskId]), coins:u.coins+task.reward, total_earned:u.total_earned+task.reward});
    return res.json({coins:upd.coins, msg:task.title+' +'+task.reward+' coins!'});
  }
  res.json({coins:u.coins});
});
app.post('/api/daily', async function(req,res){
  const u0=req.body; let u=await getUserAsync(u0.user_id, null);
  if(u.lastDaily===todayStr()) return res.json({error:'Already claimed today!'});
  const isSA=u.region==='SA'; const bonusCash=isSA?0.05:0.003;
  const updated=await updateUser(u.id, {balance:parseFloat((u.balance+bonusCash).toFixed(2)), coins:u.coins+20, streak:(u.streak||0)+1, lastDaily:todayStr()});
  res.json({success:true, bonusCash:parseFloat(bonusCash.toFixed(2)), bonusCoins:20, streak:updated.streak, balance:updated.balance});
});
app.post('/api/convert', async function(req,res){
  const u0=req.body; let u=await getUserAsync(u0.user_id, null);
  if((u.coins||0)<1000) return res.json({error:'Need 1000 Coins. You have '+u.coins+'.'});
  const thousands=Math.floor(u.coins/1000); const cashValue=u.region==='SA'? thousands*USDT_TO_ZAR : thousands*1;
  const updated=await updateUser(u.id, {balance:parseFloat((u.balance+cashValue).toFixed(2)), coins:u.coins-(thousands*1000), total_earned:parseFloat(((u.total_earned||0)+cashValue).toFixed(2))});
  res.json({success:true, converted:parseFloat(cashValue.toFixed(2)), balance:updated.balance});
});
app.post('/api/vip', async function(req,res){
  const b=req.body;
  const id=b.userId || b.user_id; const u=await getUserAsync(id, b.name, {device_id:b.device_id});
  if(b.action==='info') return res.json({level:u.level||1, levelName:getLevel(u).name, vip_level:getVipName(u), points:0, coins:u.coins, balance:u.balance, levels:LEVELS, packages:TOPUP_PACKAGES, buyCoins:BUY_COINS_PACKAGES, buyPoints:[], buyCoinsStars:[], buyPointsStars:[], unlockedLevels:u.unlockedLevels||[1], levelExpiresAt:u.levelExpiresAt||0, expiresInDays:u.levelExpiresAt?Math.max(0,Math.ceil((u.levelExpiresAt-Date.now())/(1000*60*60*24))):0, topupAccount:TOPUP_ACCOUNT, minSA:levelMinRand(u.level||1), minUSA:MIN_WITHDRAW_USA});
  if(b.action==='levelup'){
    const target=Number(b.targetLevel); const lvl=LEVELS[target];
    if(!lvl) return res.json({msg:'Invalid level'});
    const unlocked=u.unlockedLevels||[1]; const isUnlocked=unlocked.indexOf(target)!==-1; const isNext=target===(u.level||1)+1;
    if(!isNext && !isUnlocked) return res.json({msg:'Cant jump! Buy Level '+((u.level||1)+1)+' first. Unlocked: '+unlocked.join(', ')});
    if(target<=(u.level||1)) return res.json({msg:'Already this level or higher'});
    if(b.payWith==='coins'){ if((u.coins||0)<lvl.coinsCost) return res.json({msg:'Need '+lvl.coinsCost+' Coins. You have '+(u.coins||0)+'.'}); await updateUser(u.id, {coins:u.coins-lvl.coinsCost}); }
    else return res.json({msg:'Choose Coins. Stars = pay in Telegram with /vip'});
    const newUnlocked=[]; const allUnlock=(u.unlockedLevels||[1]).concat([target, target<20?target+1:target]); allUnlock.forEach(function(x){ if(newUnlocked.indexOf(x)===-1) newUnlocked.push(x); });
    const upd=await updateUser(u.id, {level:target, vip_level:lvl.name.toUpperCase(), vip_until:new Date(Date.now()+30*24*60*60*1000).toISOString().slice(0,10), levelExpiresAt:Date.now()+30*24*60*60*1000, unlockedLevels:newUnlocked});
    return res.json({msg:'LEVEL UP! You are now '+lvl.name+'! Expires in 30 days. Next level '+(target+1)+' unlocked! Ads: '+levelAds(target)+'/day • Min R'+levelMinRand(target), level:upd.level, points:0, coins:upd.coins});
  }
  if(b.action==='topup_request'){
    const pkg=ALL_BUY_PACKAGES.find(function(p){ return p.id===b.packageId; }); if(!pkg) return res.json({msg:'Package not found'});
    await updateUser(u.id, {pendingTopup:{packageId:b.packageId, coins:(pkg.coins||0), price:pkg.price, proof:b.proof||'', date:new Date().toISOString(), label:pkg.label}});
    if(ADMIN_ID && bot){
      await bot.telegram.sendMessage(ADMIN_ID, 'TOPUP REQUEST - Check Capitec '+TOPUP_ACCOUNT+'\n\nUser: '+u.name+' (@'+u.username+') ID:'+u.id+'\nPackage: '+pkg.label+' - R'+pkg.price+'\nGive: '+giveLine(pkg.coins||0)+'\nProof: '+b.proof+'\nBank: Capitec '+TOPUP_ACCOUNT+'\n\nCheck your bank, then press Approve below.', { reply_markup: { inline_keyboard: [[{ text:'Approve', callback_data:'approve_topup_'+u.id+'_'+b.packageId }],[{ text:'Reject', callback_data:'reject_topup_'+u.id }]] } }).catch(function(){});
    }
    return res.json({msg:'Topup request sent! '+giveLine(pkg.coins||0)+'. Admin will check Capitec '+TOPUP_ACCOUNT+'.'});
  }
  res.json({msg:'OK'});
});
app.post('/api/vip-stars-invoice', async function(req,res){
  const b=req.body;
  let u=await getUserAsync(b.user_id, null);
  if(!u) return res.json({error:'user not found - send /start in bot first'});
  if(!BOT_TOKEN) return res.json({error:'Bot not connected'});
  try{
    let target = b.targetLevel || b.level;
    let planName = b.plan;
    if(target){ planName = LEVELS[Number(target)] && LEVELS[Number(target)].name; }
    else if(planName){ const found = Object.values(LEVELS).find(function(l){ return l.name.toLowerCase()===String(planName).toLowerCase(); }); if(found) target = Object.keys(LEVELS).find(function(k){ return LEVELS[k].name===found.name; }); }
    if(!target) target = (u.level||1)+1;
    target = Number(target); const lvl = LEVELS[target];
    if(!lvl) return res.json({error:'Invalid level'});
    const stars = Math.floor(Number(lvl.starsCost||250));
    const payload = 'vip_'+lvl.name+'_'+u.id+'_'+Date.now();
    const bodyToSend = { chat_id: parseInt(u.id) || u.user_id, title: 'Shaya Watch '+lvl.name, description: lvl.name+' - 30 Days - '+perAdLabelFor(u)+'/2 ads - '+lvl.adLimit+'/day - '+minLabelFor(u)+' Min', payload: payload, provider_token:'', currency:'XTR', prices:[{label:lvl.name+' - 30 Days', amount:stars}], start_parameter:'vip_'+lvl.name };
    if(!parseInt(u.id)) return res.json({error:'Stars only in Telegram. Open @ShayaWatchAllBot, type /vip, then pay with Stars.'});
    const tgRes = await fetch('https://api.telegram.org/bot'+BOT_TOKEN+'/sendInvoice', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(bodyToSend)});
    const tgData = await tgRes.json();
    if(!tgData.ok) return res.json({error:'Could not send invoice. Press /start in @ShayaWatchAllBot first. '+ (tgData.description||'')});
    res.json({success:true, stars:stars, plan:lvl.name, level:target});
  }catch(e){ res.json({error:'Could not send invoice. '+e.message}); }
});
app.post('/api/buy-stars', async function(req,res){
  return res.json({error:'Stars = VIP ONLY. Buy a VIP Level with Stars in the VIP section. Stars do NOT buy Coins.'});
});
app.post('/api/request-vip', async function(req,res){
  const b=req.body; let u=await getUserAsync(b.user_id, null);
  const reqObj={id:vipRequests.length+1, user_id:parseInt(u.id)||u.id, username:u.username, first_name:u.first_name, plan:b.plan, method:b.method||'Stars', proof:b.proof||'', status:'pending', created_at:new Date().toISOString()};
  vipRequests.push(reqObj); await sbInsert('vip_requests', reqObj); res.json({success:true, plan:b.plan});
});
app.post('/api/withdraw', async function(req,res){
  const b=req.body;
  const id=b.user_id || b.userId; let u=await getUserAsync(id, b.name);
  let cleanMethod=(b.method||'').trim();
  if(cleanMethod.toLowerCase().indexOf('trc20')!==-1 || cleanMethod.toLowerCase().indexOf('paypal')!==-1) return res.json({error:'PayPal and USDT TRC20 are REMOVED. Use Dollars (USDT) - Walt.'});
  if(cleanMethod==='USDT (TON) - Telegram Wallet' || cleanMethod==='Telegram Wallet') cleanMethod='Dollars (USDT) - Walt';
  if(cleanMethod==='Gram Wallet (TON)' || cleanMethod==='Gram Wallet') cleanMethod='Gram - Walt';
  if(cleanMethod==='usdt') cleanMethod='Dollars (USDT) - Walt';
  if(cleanMethod==='gem') cleanMethod='Gram - Walt';
  if(!cleanMethod) cleanMethod='Dollars (USDT) - Walt';
  const walletVal=(b.wallet||b.detail||'').trim();
  if(!walletVal) return res.json({error:'Enter your wallet / account / number'});
  const lvl=getLevel(u);
  const C = curFor(u); const minLabel = minLabelFor(u);
  const isAirtime = cleanMethod.toLowerCase().indexOf('airtime')!==-1 || b.method==='airtime';
  const isData = cleanMethod.toLowerCase().indexOf('data')!==-1 || b.method==='data';
  if(isData){
    const needCoins = 550;
    if((u.coins||0) < needCoins) return res.json({error:'Need '+needCoins+' coins for R5 - 1GB TikTok Data (24h). Balance: '+u.coins+' coins.'});
    await updateUser(u.id, {coins:u.coins-needCoins, pendingWithdraw:{method:'Data', detail: walletVal, network: b.network, amountLabel:'R5 - 1GB TikTok Data (24h)', need: needCoins, date: new Date().toISOString()}});
    const whD = {id:withdrawals.length+1, user_id:parseInt(u.id)||u.id, userKey:String(u.id), username:u.username, first_name:u.first_name, method:'Data', wallet:walletVal, detail:walletVal, network:b.network, amountCash:5, amountLabel:'R5 - 1GB TikTok Data (24h)', coinsUsed:needCoins, need:needCoins, region:u.region, vip_level:getVipName(u), status:'pending', created_at:new Date().toISOString()};
    withdrawals.push(whD); await sbInsert('withdrawals', whD);
    if(ADMIN_ID && bot){
      await bot.telegram.sendMessage(ADMIN_ID, 'WITHDRAW REQUEST - DATA ONLY\n\nUser: '+u.name+' (@'+u.username+') ID:'+u.id+'\nMethod: R5 - 1GB TikTok Data (24h) '+(b.network?'('+b.network+')':'')+'\nDetail: '+walletVal+'\nAmount: R5 - 550 Coins\nLevel: '+lvl.name+' | Coins Left: '+(u.coins-needCoins)+'\n\nPay them, then press Paid below.', { reply_markup: { inline_keyboard: [[{ text:'Paid', callback_data:'approve_withdraw_'+u.id }],[{ text:'Reject', callback_data:'reject_withdraw_'+u.id }]] } }).catch(function(){});
    }
    return res.json({success:true, msg:'Request sent! R5 - 1GB TikTok Data (24h) to '+walletVal+'.'});
  }
  if(isAirtime){
    const randAmount = parseInt(b.amount) || 5;
    if(randAmount < 1) return res.json({error:'Choose amount '+C+'5 or more'});
    const needCoins = randAmount * 110;
    if((u.coins||0) < needCoins) return res.json({error:'Need '+needCoins+' coins for '+C+randAmount+' Airtime (110 Coins='+C+'1). Balance: '+u.coins+' coins.'});
    await updateUser(u.id, {coins:u.coins-needCoins, pendingWithdraw:{method:'Airtime', detail: walletVal, network: b.network, amountLabel:C+randAmount+' Airtime', need: needCoins, date: new Date().toISOString()}});
    const wh1 = {id:withdrawals.length+1, user_id:parseInt(u.id)||u.id, userKey:String(u.id), username:u.username, first_name:u.first_name, method:'Airtime', wallet:walletVal, detail:walletVal, network:b.network, amountCash:randAmount, amountLabel:C+randAmount+' Airtime', coinsUsed:needCoins, need:needCoins, region:u.region, vip_level:getVipName(u), status:'pending', created_at:new Date().toISOString()};
    withdrawals.push(wh1); await sbInsert('withdrawals', wh1);
    if(ADMIN_ID && bot){
      await bot.telegram.sendMessage(ADMIN_ID, 'WITHDRAW REQUEST - NO LIMIT\n\nUser: '+u.name+' (@'+u.username+') ID:'+u.id+'\nMethod: '+C+randAmount+' Airtime '+(b.network?'('+b.network+')':'')+'\nDetail: '+walletVal+'\nAmount: '+C+randAmount+' - '+needCoins+' Coins (110 Coins='+C+'1)\nLevel: '+lvl.name+' | Coins Left: '+(u.coins-needCoins)+'\n\nPay them, then press Paid below.', { reply_markup: { inline_keyboard: [[{ text:'Paid', callback_data:'approve_withdraw_'+u.id }],[{ text:'Reject', callback_data:'reject_withdraw_'+u.id }]] } }).catch(function(){});
    }
    return res.json({success:true, msg:'Request sent! '+C+randAmount+' Airtime to '+walletVal+'. NO LIMIT.'});
  }
  const isEarnMethod = ['capitec'].indexOf(String(b.method).toLowerCase())!==-1 || cleanMethod==='Capitec / Bank';
  if(isEarnMethod || b.method==='capitec'){
    const needFinal = lvl.withdrawMin;
    const amountLabel = minLabel;
    if((u.coins||0)<needFinal) return res.json({error:'Need '+needFinal+' coins for '+amountLabel+'. Balance: '+u.coins+' coins. Min is '+amountLabel+' - Level '+u.level+'!'});
    await updateUser(u.id, {coins:u.coins-needFinal, pendingWithdraw:{method:'Capitec', detail: walletVal, network: b.network, amountLabel: amountLabel, need: needFinal, date: new Date().toISOString()}});
    const wh2 = {id:withdrawals.length+1, user_id:parseInt(u.id)||u.id, userKey:String(u.id), username:u.username, first_name:u.first_name, method:'Capitec / Bank', wallet:walletVal, detail:walletVal, network:b.network, amountCash:0, amountLabel:amountLabel, coinsUsed:needFinal, need:needFinal, region:u.region, vip_level:getVipName(u), status:'pending', created_at:new Date().toISOString()};
    withdrawals.push(wh2); await sbInsert('withdrawals', wh2);
    if(ADMIN_ID && bot){
      await bot.telegram.sendMessage(ADMIN_ID, 'WITHDRAW REQUEST\n\nUser: '+u.name+' (@'+u.username+') ID:'+u.id+'\nMethod: Capitec Bank\nDetail: '+walletVal+'\nAmount: '+amountLabel+'\nLevel: '+lvl.name+' | Coins Left: '+(u.coins-needFinal)+'\n\nPay them, then press Paid below.', { reply_markup: { inline_keyboard: [[{ text:'Paid', callback_data:'approve_withdraw_'+u.id }],[{ text:'Reject', callback_data:'reject_withdraw_'+u.id }]] } }).catch(function(){});
    }
    return res.json({success:true, msg:'Withdraw request sent! '+amountLabel+' via Capitec to '+walletVal+'.'});
  }
  const minCash = u.region==='SA' ? levelMinRand(u.level||1) : MIN_WITHDRAW_USA;
  if(u.balance<minCash) return res.json({error:'Min withdraw is '+minLabel+'. You have '+u.currency+u.balance.toFixed(2)+'.'});
  if(cleanMethod==='Dollars (USDT) - Walt' || cleanMethod==='Gram - Walt'){
    if(walletVal.indexOf('UQ')!==0) return res.json({error:'Wrong address! Walt addresses start with UQ...'});
    if(walletVal.indexOf('T')===0) return res.json({error:'That is TRC20 (T...). Walt uses TON - must start with UQ...'});
  }
  const usdtAmount=u.region==='SA'?(u.balance/USDT_TO_ZAR):u.balance;
  const zarAmount=u.region==='SA'?u.balance:u.balance*USDT_TO_ZAR;
  const w={id:withdrawals.length+1, user_id:parseInt(u.id)||u.id, userKey:String(u.id), username:u.username, first_name:u.first_name, method:cleanMethod, wallet:walletVal, detail:walletVal, amountCash:parseFloat(u.balance.toFixed(2)), amountLabel:u.currency+u.balance.toFixed(2)+' = $'+usdtAmount.toFixed(2)+' USDT', usdtAmount:parseFloat(usdtAmount.toFixed(2)), zarAmount:parseFloat(zarAmount.toFixed(2)), region:u.region, vip_level:getVipName(u), status:'pending', created_at:new Date().toISOString()};
  withdrawals.push(w); await sbInsert('withdrawals', w);
  await updateUser(u.id, {balance:0, pendingWithdraw:{method:cleanMethod, detail:walletVal, network:b.network, amountLabel:u.currency+w.amountCash+' = $'+w.usdtAmount+' USDT', need:0, date:new Date().toISOString(), withdrawId:w.id}});
  if(bot && ADMIN_ID) bot.telegram.sendMessage(ADMIN_ID, 'NEW WITHDRAW - WALT\n\nUser: '+u.first_name+' (@'+u.username+') ID: '+u.id+'\nAmount: '+u.currency+w.amountCash+' = $'+w.usdtAmount+' USDT'+(u.region==='SA'?' = R'+w.zarAmount:'')+'\nMethod: '+w.method+'\nWallet: '+walletVal+'\n\nPay them, then press Paid.', { reply_markup: { inline_keyboard: [[{ text:'Paid', callback_data:'approve_withdraw_'+u.id }],[{ text:'Reject', callback_data:'reject_withdraw_'+u.id }]] } }).catch(function(){});
  res.json({success:true, usdtAmount:w.usdtAmount, zarAmount:w.zarAmount});
});
app.get('/api/withdraw-history', async function(req,res){
  const uid = String(req.query.user_id || req.query.userId || '');
  if(!uid) return res.json([]);
  const list = withdrawals.filter(function(w){ return String(w.user_id)===uid || String(w.user_id)===String(parseInt(uid)) || (w.userKey && String(w.userKey)===uid); }).slice().reverse();
  res.json(list.map(function(w){ const wc = w.region==='USA' ? '$' : 'R'; return { id: w.id, method: w.method, detail: w.wallet || w.detail || '', amountCash: w.amountCash || 0, amountLabel: w.amountLabel || (w.amountCash ? (wc+w.amountCash) : ''), coinsUsed: w.coinsUsed || w.need || 0, usdtAmount: w.usdtAmount || 0, status: w.status || 'pending', created_at: w.created_at || w.date || new Date().toISOString() }; }));
});
app.get('/api/tasks', async function(req,res){
  const userId = req.query.user_id || req.query.userId;
  let completed = []; let referrals = 0; let uRegion='SA';
  if(userId){ const u = await getUserAsync(userId, null); if(u){ completed = u.completedTasks || u.tasksDone || []; referrals = u.referrals || 0; uRegion = u.region || 'SA'; } }
  const out = tasksList.map(function(t){
    const done = completed.indexOf(t.id)!==-1 || completed.indexOf(String(t.id))!==-1;
    let canClaim = false; let progress = '';
    if(t.type==='invite_3'){ canClaim = !done && referrals>=3; progress = referrals+'/3 friends'; }
    else { canClaim = !done; progress = t.desc; }
    const rewardCash = uRegion==='SA' ? parseFloat((t.reward_cash*USDT_TO_ZAR).toFixed(2)) : t.reward_cash;
    return { id:t.id, title:t.title, link:t.link, reward_cash:rewardCash, reward_coins:t.reward_coins, type:t.type, desc:t.desc, done:done, canClaim:canClaim, progress:progress, referrals:referrals };
  });
  res.json(out);
});
app.post('/api/complete-task', async function(req,res){
  const b=req.body;
  const id = b.user_id || b.userId; const tid = parseInt(b.taskId || b.task_id);
  let u = await getUserAsync(id, null);
  if(!u) return res.json({error:'user not found - send /start first'});
  const task = tasksList.find(function(t){ return t.id===tid; });
  if(!task) return res.json({error:'Task not found'});
  const completed = u.completedTasks || u.tasksDone || [];
  if(completed.indexOf(tid)!==-1 || completed.indexOf(String(tid))!==-1) return res.json({error:'Already claimed this task!'});
  if(task.type==='invite_3' && (u.referrals||0)<3) return res.json({error:'Need 3 friends. You have '+(u.referrals||0)+'/3.'});
  const cashValue = u.region==='SA' ? task.reward_cash * USDT_TO_ZAR : task.reward_cash;
  const updated = await updateUser(u.id, { balance: parseFloat((u.balance + cashValue).toFixed(2)), coins: (u.coins||0) + task.reward_coins, total_earned: parseFloat(((u.total_earned||0)+cashValue).toFixed(2)), completedTasks: completed.concat([tid]), tasksDone: (u.tasksDone||[]).concat([tid]), });
  res.json({success:true, msg:'Task Done! +'+u.currency+cashValue.toFixed(2)+' + '+task.reward_coins+' Coins!', balance: updated.balance, coins: updated.coins});
});
app.post('/api/task-click', async function(req,res){ res.json({success:true, msg:'Click tracked. Now Claim!'}); });
app.get('/api/leaderboard', async function(req,res){
  const all=Array.from(users.values()).sort(function(a,b){ return (b.balance+(b.coins/1000)*(b.region==='SA'?USDT_TO_ZAR:1))-(a.balance+(a.coins/1000)*(a.region==='SA'?USDT_TO_ZAR:1)); }).slice(0,20).map(function(u){ return {user_id:u.user_id||u.id, username:u.username, first_name:u.first_name, region:u.region, vip_level:getVipName(u), balance:u.balance, coins:u.coins}; });
  res.json(all);
});
app.post('/api/offerwall-credit', async function(req,res){
  const b=req.body; let u=await getUserAsync(b.user_id, null);
  const coinsToAdd=Math.floor(parseFloat(b.amount)||0); if(coinsToAdd<=0) return res.json({error:'Invalid amount'});
  const updated=await updateUser(u.id, {coins:(u.coins||0)+coinsToAdd, total_earned:(u.total_earned||0)+(coinsToAdd/1000)});
  offerwallRewards.push({user_id:u.id, amount:coinsToAdd, source:b.source||'giga-offerwall-9114', created_at:new Date().toISOString()});
  res.json({success:true, coinsAdded:coinsToAdd, user:formatUserForFrontend(updated)});
});
async function fetchYouTube(query, region, maxResults){
  maxResults = maxResults || 12;
  if(!YOUTUBE_API_KEY) return [];
  try{ const regionCode=region==='SA'?'ZA':'US'; const url='https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults='+maxResults+'&q='+encodeURIComponent(query)+'&regionCode='+regionCode+'&key='+YOUTUBE_API_KEY; const r=await fetch(url); const d=await r.json(); if(!d.items) return []; return d.items.map(function(it){ return {id:it.id.videoId, title:it.snippet.title, channel:it.snippet.channelTitle, thumb:it.snippet.thumbnails && it.snippet.thumbnails.medium && it.snippet.thumbnails.medium.url || '', views:'Trending', url:'https://www.youtube.com/watch?v='+it.id.videoId}; }); }catch(e){ return []; }
}
app.get('/api/videos/trending', async function(req,res){ res.json(await fetchYouTube(req.query.region==='SA'?'Amapiano trending South Africa 2026':'Trending USA Hip Hop 2026', req.query.region||'SA')); });
app.get('/api/videos/music', async function(req,res){ res.json(await fetchYouTube(req.query.region==='SA'?'Amapiano Kabza De Small DJ Maphorisa':'Hip Hop Music Videos 2026', req.query.region||'SA')); });
app.get('/api/videos/search', async function(req,res){ res.json(await fetchYouTube(req.query.q||'Amapiano', req.query.region||'SA')); });
app.get('/api/admin/pending', function(req,res){ res.json({withdrawals:withdrawals.filter(function(w){ return w.status==='pending'; }), vipRequests:vipRequests.filter(function(v){ return v.status==='pending'; })}); });
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID || '-1003867683507';
const DAILY_POSTS = [
  "🔥 GOOD MORNING SHAYA FAMILY!\n\n📺 Watch Ads = Cash + Coins — 2 Ads = 1 Reward\n🧠 Quiz = +Coins (after 10 ads)\n🏦 Topup Capitec 1893275807 = Buy Coins (Cash/VIP)\n👑 VIP: SA R0.05 / 2 ads + 5 Coins • USA $0.005 / 2 ads + 5 Coins • Ads = 20 x Level • Min Drops -1000 Per Level\n💸 Withdraw: Min Drops Per Level • Airtime NO LIMIT (110 Coins=R1) • Data R5 1GB TikTok 24h ONLY\n\n👉 Open @ShayaWatchAllBot → OPEN SHAYA WATCH BOT",
  "💰 WHO HAS WITHDRAWN TODAY?\n\nShow proof in group! Topup R29 today → Get 500 Coins ONLY\n\nCapitec: 1893275807\nRef: Your Name\n\nInvite 3 friends = +50 Coins + Cash!\n👉 @ShayaWatchAllBot",
  "🏆 LEADERBOARD UPDATE!\n\nTop earners today get featured!\nWatch Ads (Level 1 = 20/day, Level 20 = 400/day) = Max earnings!\nNot VIP yet? Buy with Coins / Stars in app! VIP = Coins / Stars ONLY\n\n👉 Open @ShayaWatchAllBot",
  "⏰ EVENING REMINDER!\n\nDon't waste your ads today!\nClaim Daily Bonus + Quiz before midnight!\nTopup before you sleep — Admin approves in morning!\n\nCapitec: 1893275807\n👉 @ShayaWatchAllBot",
];
let dailyPostIndex = 0;
async function sendDailyPost(){
  if(!bot || !GROUP_CHAT_ID) return;
  try{
    const msg = DAILY_POSTS[dailyPostIndex % DAILY_POSTS.length];
    dailyPostIndex++;
    await bot.telegram.sendMessage(GROUP_CHAT_ID, msg);
    console.log('Daily post sent to group');
  }catch(e){ console.log('Daily post failed', e.message); }
}
setInterval(sendDailyPost, 6*60*60*1000);
setTimeout(sendDailyPost, 60*1000);
if(bot){
  bot.start(async function(ctx){
    const user_id=ctx.from.id; const payload=ctx.startPayload||''; let referred_by=null;
    if(payload.indexOf('ref_')===0) referred_by=payload.replace('ref_','');
    else if(payload && (/^\d+$/.test(payload) || payload.indexOf('web_')===0)) referred_by=payload;
    let u=await getUser(user_id); if(!u) u=await createUser(user_id, {username:ctx.from.username||'', first_name:ctx.from.first_name||'', referred_by:referred_by?String(referred_by):null});
    const rate=await refreshRate();
    const perAdTxt = u.region==='USA' ? '$0.005 / 2 ads + 5 Coins' : 'R0.05 / 2 ads + 5 Coins';
    const minTxt = u.region==='USA' ? '$20 Min' : 'R'+levelMinRand(u.level||1)+' Min (Level '+(u.level||1)+')';
    const rateTxt = u.region==='USA' ? '1 USDT = $1.00' : '1 USDT = R'+rate.toFixed(2);
    await ctx.replyWithMarkdown('Welcome to *SHAYA WATCH BOT* '+u.first_name+'!\n\nEARN\nWatch 2 Ads = '+perAdTxt+'\nQuiz = +Coins (Unlock after 10 ads)\nTopup Capitec '+TOPUP_ACCOUNT+' = Buy Coins (Cash or VIP)\nOfferwall (Giga 9114) = Coins\nInvite = +50 Coins\nTasks = Cash + Coins\n\nCoins = Convert to Cash OR Buy VIP\nVIP = Coins / Stars ONLY\n\nVIP - 20 Levels, 30 Days\nFREE (Level 1): '+perAdTxt+' - 20/day - R350 Min\nKING (Level 20): '+perAdTxt+' - 400/day - R33 Min\nYour Level: '+levelAds(u.level||1)+'/day - '+minTxt+'\nAds = 20 x Level • Min Drops -1000 Coins Per Level\n\nWithdraw: Min Drops Per Level / Airtime NO LIMIT (110 Coins='+(u.region==='USA'?'$1':'R1')+') / Data R5 1GB TikTok 24h ONLY\n'+rateTxt+' LIVE\n\nTap below', {reply_markup:{inline_keyboard:[[{text:'OPEN SHAYA WATCH BOT', web_app:{url:WEBAPP_URL}}],[{text:'Join Shaya Earn Network', url:GROUP_URL}]]}});
  });
  bot.command('getgroupid', async function(ctx){
    const chatId = ctx.chat && ctx.chat.id;
    const chatType = ctx.chat && ctx.chat.type;
    await ctx.reply('Group Chat ID:\n'+chatId+'\nType: '+chatType+'\n\nCopy this number into Render -> GROUP_CHAT_ID\nExample: GROUP_CHAT_ID = '+chatId);
  });
  bot.command('postnow', async function(ctx){
    if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
    await sendDailyPost();
    await ctx.reply('Posted to group! Group ID: '+(GROUP_CHAT_ID || 'NOT SET - Add GROUP_CHAT_ID in Render'));
  });
  bot.command('balance', async function(ctx){ let u=await getUser(ctx.from.id); if(!u) return ctx.reply('Send /start first'); const f=formatUserForFrontend(u); ctx.reply('Balance: '+f.currency+f.balance.toFixed(2)+' = $'+f.usdtBalance+' USDT\nCoins: '+f.coins+' (Cash or VIP)\nAds Today: '+f.dailyAds+'/'+f.dailyLimit+' (Level '+(u.level||1)+')\nVIP: '+f.vip_level+' ('+u.level+'/20)\nMin: '+(u.region==='SA'?'R'+levelMinRand(u.level||1):'$20')+' | Airtime 110 Coins='+(u.region==='SA'?'R1':'$1')+' | Data R5 1GB TikTok 24h | Per ad: '+perAdLabelFor(u)+' / 2 ads + 5 Coins'); });
  bot.command('tasks', async function(ctx){
    let u=await getUserAsync(ctx.from.id, ctx.from.first_name);
    const completed = u.completedTasks||[]; let txt = 'TASKS\n\n';
    tasksList.forEach(function(t){ const done = completed.indexOf(t.id)!==-1; const rc = u.region==='SA' ? (t.reward_cash*USDT_TO_ZAR).toFixed(2) : t.reward_cash.toFixed(2); txt += (done?'Done ':'')+t.title+' - +'+u.currency+rc+' + '+t.reward_coins+' Coins '+(done?'(Done)':'')+'\n'; if(t.id===2) txt += '   Progress: '+(u.referrals||0)+'/3 friends\n'; });
    txt += '\nOpen App to Claim!';
    await ctx.reply(txt, {reply_markup:{inline_keyboard:[[{text:'OPEN APP - CLAIM TASKS', web_app:{url:WEBAPP_URL}}]]}});
  });
  bot.command('vip', async function(ctx){
    let u=await getUserAsync(ctx.from.id, ctx.from.first_name);
    const next=Math.min(20,(u.level||1)+1); const lvl=LEVELS[next];
    await ctx.reply('Your Level: '+getVipName(u)+' ('+u.level+'/20)\nCoins: '+u.coins+'\nAds: '+levelAds(u.level||1)+'/day • Min: R'+levelMinRand(u.level||1)+'\nNext: Level '+next+' '+lvl.name+'\nCost: '+lvl.coinsCost+' Coins OR '+lvl.starsCost+' Stars\nNext Ads: '+levelAds(next)+'/day • Min R'+levelMinRand(next), {reply_markup:{inline_keyboard:[[{text:'Buy '+lvl.name+' - '+lvl.starsCost+' Stars', callback_data:'buy_stars_'+next}],[{text:'OPEN SHAYA WATCH BOT', web_app:{url:WEBAPP_URL}}]]}});
  });
  bot.command('vipall', async function(ctx){
    let u=await getUserAsync(ctx.from.id, ctx.from.first_name);
    let txt='ALL 20 VIP\nYour Unlocked: '+(u.unlockedLevels||[1]).join(', ')+'\nPer ad (all levels): '+perAdLabelFor(u)+' / 2 ads + 5 Coins\n\n';
    for(let i=1;i<=20;i++){ txt+=i+'. '+LEVELS[i].name+' - '+LEVELS[i].coinsCost+' Coins / '+LEVELS[i].starsCost+' Stars - '+perAdLabelFor(u)+'/2 ads + 5 Coins - '+LEVELS[i].adLimit+'/day - Min R'+levelMinRand(i)+'\n'; }
    await ctx.reply(txt);
  });
  bot.command('approve', async function(ctx){
    if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
    const text=ctx.message.text.trim(); const parts=text.split(/\s+/); const targetId=parts[1]; let pkgId=parts[2];
    if(!targetId || !pkgId) return ctx.reply('Usage: /approve <ID> <package>\nExample:\n/approve web_ja1p2bcvr9 p699\n/approve 1159481047 p29');
    if(pkgId==='R29'||pkgId==='29') pkgId='p29'; if(pkgId==='R79'||pkgId==='79') pkgId='p79'; if(pkgId==='R179'||pkgId==='179') pkgId='p179'; if(pkgId==='R349'||pkgId==='349') pkgId='p349'; if(pkgId==='R699'||pkgId==='699') pkgId='p699';
    let target=await getUser(targetId); if(!target){ for(let kv of users){ if(String(kv[1].user_id)===String(targetId)||String(kv[1].id)===String(targetId)){ target=kv[1]; break; } } }
    const pkg=ALL_BUY_PACKAGES.find(function(p){ return p.id===pkgId; }); if(!target||!pkg) return ctx.reply('User or package not found\nTried ID: '+targetId+'\nTried Package: '+pkgId);
    const giveCoins = (target.pendingTopup && target.pendingTopup.coins) || pkg.coins || 0;
    await updateUser(target.id, {coins:target.coins+giveCoins, total_earned:target.total_earned+giveCoins, pendingTopup:null});
    ctx.reply('Approved! '+giveText(giveCoins)+' to '+target.name+' (ID: '+target.id+')');
    try{ const chatId=parseInt(target.id)||target.user_id; if(chatId) await ctx.telegram.sendMessage(chatId, 'TOPUP APPROVED! '+giveText(giveCoins)+'!'); }catch(e){ console.log('Web user - approved in DB, no Telegram DM'); }
  });
  bot.command('pending', async function(ctx){
    if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
    let pendingList=[];
    for(let kv of users){ const u=kv[1]; if(u.pendingTopup) pendingList.push({id:u.id, name:u.name||u.first_name||'friend', username:u.username||'', pending:u.pendingTopup}); }
    if(supabase){ try{ const res2=await supabase.from('users').select('id, name, first_name, username, pending_topup').not('pending_topup','is',null); const data=res2.data; if(data){ for(let row of data){ if(row.pending_topup && !pendingList.find(function(p){ return String(p.id)===String(row.id); })) pendingList.push({id:row.id, name:row.name||row.first_name||'friend', username:row.username||'', pending:row.pending_topup}); } } }catch(e){} }
    if(pendingList.length===0) return ctx.reply('No pending topups. All clear!');
    let txt='PENDING TOPUPS ('+pendingList.length+')\n\n'; pendingList.forEach(function(p,i){ txt+=(i+1)+'. '+p.name+' (@'+p.username+') ID:'+p.id+'\n   Package: '+p.pending.packageId+' - R'+p.pending.price+' = '+giveLine(p.pending.coins||0)+'\n   Proof: '+p.pending.proof+'\n\n'; }); txt+='\nPress Approve on the request message, or type:\n/approveall';
    await ctx.reply(txt);
  });
  bot.command('approveall', async function(ctx){
    if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
    let pendingList=[];
    for(let kv of users){ const u=kv[1]; if(u.pendingTopup) pendingList.push(u); }
    if(supabase){ try{ const res3=await supabase.from('users').select('*').not('pending_topup','is',null); const data=res3.data; if(data){ for(let row of data){ if(row.pending_topup && !pendingList.find(function(p){ return String(p.id)===String(row.id); })){ let u=await getUser(row.id); if(u) pendingList.push(u); } } } }catch(e){} }
    if(pendingList.length===0) return ctx.reply('No pending topups to approve.');
    await ctx.reply('Approving '+pendingList.length+' topups...');
    let approved=0, failed=[], report='APPROVEALL DONE\n\n';
    for(let u of pendingList){
      try{
        const pkgInfo=u.pendingTopup; if(!pkgInfo) continue;
        const pkg=ALL_BUY_PACKAGES.find(function(p){ return p.id===pkgInfo.packageId; }); if(!pkg){ failed.push(u.name+' ('+u.id+') - package '+pkgInfo.packageId+' not found'); continue; }
        const giveCoins = pkgInfo.coins || pkg.coins || 0;
        await updateUser(u.id, {coins:(u.coins||0)+giveCoins, total_earned:(u.total_earned||0)+giveCoins, pendingTopup:null});
        report+='OK '+u.name+' (@'+u.username+') ID:'+u.id+' - '+giveText(giveCoins)+' (R'+pkg.price+')\n'; approved++;
        try{ const chatId=parseInt(u.id)||u.user_id; if(chatId) await ctx.telegram.sendMessage(chatId, 'TOPUP APPROVED! '+giveText(giveCoins)+'!'); }catch(e){}
      }catch(e){ failed.push(u.name+' ('+u.id+') - '+e.message); }
    }
    if(failed.length>0) report+='\nFAILED ('+failed.length+'):\n'+failed.join('\n');
    report+='\n\nTotal Approved: '+approved+'/'+pendingList.length;
    await ctx.reply(report);
  });
  bot.command('reject', async function(ctx){
    if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
    const parts=ctx.message.text.trim().split(/\s+/); const targetId=parts[1]; if(!targetId) return ctx.reply('Usage: /reject <ID>');
    let target=await getUser(targetId); if(!target||!target.pendingTopup) return ctx.reply('No pending topup for this user.');
    await updateUser(target.id, {pendingTopup:null}); await ctx.reply('Rejected topup for '+target.name+' ('+target.id+')');
    try{ const chatId=parseInt(target.id)||target.user_id; if(chatId) await ctx.telegram.sendMessage(chatId, 'Your topup request was rejected. No payment found for Capitec '+TOPUP_ACCOUNT+'.'); }catch(e){}
  });
  bot.command('approvevip', async function(ctx){
    if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
    const parts=ctx.message.text.split(' '); const targetId=parts[1]; const levelNum=parseInt(parts[2])||2;
    let u=await getUser(targetId); if(!u) return ctx.reply('User not found');
    const lvl=LEVELS[levelNum]; const until=new Date(Date.now()+30*24*60*60*1000).toISOString().slice(0,10);
    const newUnlocked=[]; const allU=(u.unlockedLevels||[1]).concat([levelNum, levelNum<20?levelNum+1:levelNum]); allU.forEach(function(x){ if(newUnlocked.indexOf(x)===-1) newUnlocked.push(x); });
    await updateUser(u.id, {level:levelNum, vip_level:lvl.name.toUpperCase(), vip_until:until, levelExpiresAt:Date.now()+30*24*60*60*1000, unlockedLevels:newUnlocked});
    ctx.reply('Approved '+lvl.name+' for '+u.name+' ('+targetId+') until '+until+' - Ads '+levelAds(levelNum)+'/day - Min R'+levelMinRand(levelNum));
    try{ await ctx.telegram.sendMessage(parseInt(u.id)||u.id, 'Your '+lvl.name+' is ACTIVE until '+until+'! Ads '+levelAds(levelNum)+'/day - Min R'+levelMinRand(levelNum)); }catch(e){}
  });
  bot.command('paywithdraw', async function(ctx){
    if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
    const id=parseInt(ctx.message.text.split(' ')[1]); const w=withdrawals.find(function(x){ return x.id===id; }); if(!w) return ctx.reply('Withdraw not found');
    w.status='paid'; ctx.reply('Marked withdraw #'+id+' as PAID');
    try{ await ctx.telegram.sendMessage(w.user_id, 'Your withdraw of $'+w.usdtAmount+' USDT has been PAID!'); }catch(e){}
  });
  bot.command('stats', async function(ctx){ if(ctx.from.id!==ADMIN_ID) return; ctx.reply('STATS\nUsers: '+users.size+'\nWithdraws Paid: '+withdrawals.filter(function(w){ return w.status==='paid'; }).length+'\nPending: '+withdrawals.filter(function(w){ return w.status==='pending'; }).length+'\nRate: 1 USDT = R'+USDT_TO_ZAR.toFixed(2)+' / $1.00\nGroup Post: '+(GROUP_CHAT_ID ? 'ON - '+GROUP_CHAT_ID : 'OFF - Add GROUP_CHAT_ID in Render')); });
  bot.on('new_chat_members', async function(ctx){
    try{
      const members = ctx.message.new_chat_members || [];
      for(let m of members){
        if(m.is_bot) continue;
        const name = m.first_name || 'friend';
        await ctx.reply('Welcome '+name+' to Shaya Earn Network!\n\nWatch 2 Ads = Cash + Coins — SA R0.05 / USA $0.005 per 2 ads + 5 Coins\nTopup Capitec 1893275807 = Buy Coins (Cash/VIP)\nWithdraw: Min Drops Per Level • Airtime NO LIMIT • Data R5 1GB TikTok 24h ONLY\n\nOpen @ShayaWatchAllBot - OPEN SHAYA WATCH BOT\n\nIntroduce yourself - Where are you from?');
      }
    }catch(e){ console.log('Welcome failed', e.message); }
  });
  bot.on('pre_checkout_query', async function(ctx){ try{ await ctx.answerPreCheckoutQuery(true); }catch(e){} });
  bot.on('successful_payment', async function(ctx){
    const pay=ctx.message.successful_payment; const payload=pay.invoice_payload||'';
    if(payload.indexOf('buy_coins_')===0){
      await ctx.reply('Stars = VIP ONLY. Stars do NOT buy Coins. Buy a VIP Level with Stars instead.');
      return;
    }
    let target=null;
    const m=payload.match(/vip_(.+)_(\d+)_/); if(m){ const name=m[1]; const found=Object.entries(LEVELS).find(function(kv){ return kv[1].name===name; }); if(found) target=parseInt(found[0]); }
    if(!target){ const parts=payload.split('_'); target=parseInt(parts[1])||2; }
    const lvl=LEVELS[target]||LEVELS[2];
    const user_id=ctx.from.id; const starsPaid=pay.total_amount;
    const until=new Date(Date.now()+30*24*60*60*1000).toISOString().slice(0,10);
    let u=await getUser(user_id); if(!u) u=await createUser(user_id, {username:ctx.from.username||'', first_name:ctx.from.first_name||''});
    const newUnlocked=[]; const allU2=(u.unlockedLevels||[1]).concat([target, target<20?target+1:target]); allU2.forEach(function(x){ if(newUnlocked.indexOf(x)===-1) newUnlocked.push(x); });
    await updateUser(u.id, {level:target, vip_level:lvl.name.toUpperCase(), vip_until:until, levelExpiresAt:Date.now()+30*24*60*60*1000, unlockedLevels:newUnlocked});
    await ctx.reply('VIP ACTIVATED!\n\nPlan: '+lvl.name+' (Level '+target+'/20)\nPaid: '+starsPaid+' Stars\nUntil: '+until+'\nAds: '+levelAds(target)+'/day • Min R'+levelMinRand(target), {reply_markup:{inline_keyboard:[[{text:'OPEN SHAYA WATCH BOT', web_app:{url:WEBAPP_URL}}]]}});
    if(ADMIN_ID){ try{ await ctx.telegram.sendMessage(ADMIN_ID, 'STARS RECEIVED!\nUser: '+ctx.from.first_name+' (@'+ctx.from.username+') ID: '+user_id+'\nPlan: '+lvl.name+'\nStars: '+starsPaid); }catch(e){} }
  });
  bot.on('callback_query', async function(ctx){
    const data=ctx.callbackQuery && ctx.callbackQuery.data || '';
    const fromId=ctx.from && ctx.from.id;
    if(data.indexOf('approve_topup_')===0 || data.indexOf('reject_topup_')===0 || data.indexOf('approve_withdraw_')===0 || data.indexOf('reject_withdraw_')===0){
      if(fromId!==ADMIN_ID){ try{ await ctx.answerCbQuery('Admin only'); }catch(e){} return; }
    }
    if(data.indexOf('approve_topup_')===0){
      const parsed = parseTopupCallback(data, 'approve_topup_');
      const userId = parsed.userId; const packageId = parsed.packageId;
      const target=await getUser(userId); const pkg=ALL_BUY_PACKAGES.find(function(p){ return p.id===packageId; });
      if(!target||!pkg){ try{ await ctx.answerCbQuery('User or package not found: '+userId+' / '+packageId); }catch(e){} return; }
      const giveCoins = (target.pendingTopup && target.pendingTopup.coins) || pkg.coins || 0;
      await updateUser(target.id, {coins:(target.coins||0)+giveCoins, total_earned:(target.total_earned||0)+giveCoins, pendingTopup:null});
      try{ await ctx.answerCbQuery('Approved!'); }catch(e){}
      try{ await ctx.editMessageText('APPROVED - TOPUP\n\n'+target.name+' ID:'+target.id+'\n'+pkg.label+'\n'+giveText(giveCoins)+'\n\nPaid via Capitec '+TOPUP_ACCOUNT); }catch(e){}
      try{ const chatId=parseInt(target.id)||target.user_id; if(chatId) await ctx.telegram.sendMessage(chatId, 'TOPUP APPROVED!\n\n'+giveText(giveCoins)+'!'); }catch(e){ console.log('Web user - approved in DB only'); }
      return;
    }
    if(data.indexOf('reject_topup_')===0){
      const userId = data.replace('reject_topup_','');
      const target=await getUser(userId);
      if(target) await updateUser(target.id, {pendingTopup:null});
      try{ await ctx.answerCbQuery('Rejected'); }catch(e){}
      try{ await ctx.editMessageText('REJECTED - TOPUP\n\n'+(target && target.name || '')+' ID:'+userId+'\nReason: No payment found in Capitec '+TOPUP_ACCOUNT); }catch(e){}
      try{ const chatId=parseInt(userId); if(chatId) await ctx.telegram.sendMessage(chatId, 'Your topup was rejected. No payment found in Capitec '+TOPUP_ACCOUNT+'.'); }catch(e){}
      return;
    }
    if(data.indexOf('approve_withdraw_')===0){
      const userId = data.replace('approve_withdraw_','');
      for(let i=withdrawals.length-1;i>=0;i--){ if(String(withdrawals[i].user_id)===String(userId) || String(withdrawals[i].userKey)===String(userId)){ if(withdrawals[i].status==='pending'){ withdrawals[i].status='paid'; break; } } }
      try{ await ctx.answerCbQuery('Marked as Paid'); }catch(e){}
      try{ await ctx.editMessageText((ctx.callbackQuery.message && ctx.callbackQuery.message.text || 'Withdraw') + '\n\nPAID - Admin confirmed'); }catch(e){}
      const target=await getUser(userId); if(target) await updateUser(target.id, {pendingWithdraw:null});
      try{ const chatId=parseInt(userId); if(chatId) await ctx.telegram.sendMessage(chatId, 'Your withdraw has been PAID!'); }catch(e){}
      return;
    }
    if(data.indexOf('reject_withdraw_')===0){
      const userId = data.replace('reject_withdraw_','');
      for(let i=withdrawals.length-1;i>=0;i--){ if(String(withdrawals[i].user_id)===String(userId) || String(withdrawals[i].userKey)===String(userId)){ if(withdrawals[i].status==='pending'){ withdrawals[i].status='rejected'; break; } } }
      const target=await getUser(userId);
      if(target && target.pendingWithdraw){ await updateUser(target.id, {coins:(target.coins||0)+(target.pendingWithdraw.need||0), pendingWithdraw:null}); }
      try{ await ctx.answerCbQuery('Rejected & Refunded'); }catch(e){}
      try{ await ctx.editMessageText('REJECTED - WITHDRAW\n\n'+(target && target.name || '')+' ID:'+userId+'\nRefunded coins.'); }catch(e){}
      try{ const chatId=parseInt(userId); if(chatId) await ctx.telegram.sendMessage(chatId, 'Your withdraw was rejected. Coins refunded.'); }catch(e){}
      return;
    }
    if(data.indexOf('buy_stars_')===0){
      const target=parseInt(data.split('_')[2]); const lvl=LEVELS[target];
      try{ await ctx.answerCbQuery(); }catch(e){}
      try{ const _u = await getUser(ctx.from.id); const _label = _u ? perAdLabelFor(_u)+' / 2 ads' : 'R0.05 / 2 ads'; await ctx.telegram.sendInvoice(ctx.from.id, 'Shaya Watch '+lvl.name, lvl.name+' - 30 Days - '+_label+' - '+lvl.adLimit+'/day - Min R'+levelMinRand(target)+' / $20', 'vip_'+lvl.name+'_'+ctx.from.id+'_'+Date.now(), '', 'XTR', [{label:lvl.name+' - 30 Days', amount:lvl.starsCost}]); }catch(e){ await ctx.reply('Stars failed: '+e.message); }
      return;
    }
  });
  bot.launch().then(function(){ console.log('Bot launched @ShayaWatchAllBot - EXACT DAILY BLOCK ON'); }).catch(function(e){ console.log('Bot launch failed', e.message); });
  process.once('SIGINT', function(){ bot.stop('SIGINT'); }); process.once('SIGTERM', function(){ bot.stop('SIGTERM'); });
} else console.log('BOT_TOKEN not set - bot disabled, API still works');
app.listen(PORT, function(){ console.log('Shaya Watch Bot running on '+PORT); console.log('WebApp: '+WEBAPP_URL); });
