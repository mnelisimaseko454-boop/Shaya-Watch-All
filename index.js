// index.js - Shaya Watch - SA + USA - Bot + WebApp
// Bot: @ShayaWatchAllBot | WebApp: https://shaya-watch-all.onrender.com
const { Telegraf, Markup } = require('telegraf');
const { DatabaseSync } = require('node:sqlite');
const express = require('express');
const path = require('path');
const fs = require('fs');

const TOKEN = process.env.BOT_TOKEN || "PUT_YOUR_TOKEN_FROM_BOTFATHER";
const ADMIN_ID = 1159481047;
const BOT_USERNAME = "ShayaWatchAllBot";
const WEBAPP_URL = "https://shaya-watch-all.onrender.com";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

// --- USDT TO RAND - AUTO LIVE RATE ---
let USDT_TO_ZAR = 16.62;
let LAST_RATE_UPDATE = 0;
let ZAR_TO_USDT = 1 / USDT_TO_ZAR;

async function updateUsdtRate(){
  try{
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if(data?.rates?.ZAR){
      USDT_TO_ZAR = data.rates.ZAR;
      ZAR_TO_USDT = 1 / USDT_TO_ZAR;
      LAST_RATE_UPDATE = Date.now();
      console.log(`💱 Live Rate Updated [ER-API]: 1 USDT = R${USDT_TO_ZAR.toFixed(2)}`);
      return;
    }
    throw new Error('No ZAR in ER-API');
  }catch(e){
    console.log('ER-API failed, trying Binance fallback...', e.message);
    try{
      const res2 = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDTZAR');
      const data2 = await res2.json();
      if(data2?.price){
        USDT_TO_ZAR = parseFloat(data2.price);
        ZAR_TO_USDT = 1 / USDT_TO_ZAR;
        LAST_RATE_UPDATE = Date.now();
        console.log(`💱 Live Rate Updated [Binance]: 1 USDT = R${USDT_TO_ZAR.toFixed(2)}`);
        return;
      }
    }catch(e2){ console.log('Binance failed too, using fallback', USDT_TO_ZAR); }
  }
}
updateUsdtRate();
setInterval(updateUsdtRate, 30*60*1000);

const bot = new Telegraf(TOKEN);
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- PERSISTENT DB - FIX 3 + FIX FOR ERR_DLOPEN_FAILED ---
// Uses Node built-in SQLite - no native build needed
const DB_PATH = process.env.DATABASE_PATH || (fs.existsSync('/data') ? '/data/shaya.db' : 'shaya.db');
console.log('Using DB at:', DB_PATH);
// Make sure /data exists if Render Disk is attached
try{ if(DB_PATH.startsWith('/data')) fs.mkdirSync('/data', {recursive:true}); }catch(e){}
const db = new DatabaseSync(DB_PATH);
try{ db.exec('PRAGMA journal_mode = WAL'); }catch(e){}
try{ db.exec('PRAGMA synchronous = NORMAL'); }catch(e){}

db.exec(`CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY,
  username TEXT, first_name TEXT,
  region TEXT DEFAULT 'SA', currency TEXT DEFAULT 'R',
  balance REAL DEFAULT 0, coins INTEGER DEFAULT 0,
  referrals INTEGER DEFAULT 0, total_ads INTEGER DEFAULT 0,
  vip_level TEXT DEFAULT 'FREE', vip_until TEXT DEFAULT NULL,
  last_daily TEXT DEFAULT NULL, last_checkin TEXT DEFAULT NULL,
  streak INTEGER DEFAULT 0, referred_by INTEGER DEFAULT NULL,
  wallet TEXT DEFAULT NULL, total_earned REAL DEFAULT 0,
  updated_at TEXT DEFAULT NULL
)`);

db.exec(`CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT, reward_cash REAL, reward_coins INTEGER, link TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, amount REAL, coins INTEGER,
  method TEXT, wallet TEXT, status TEXT DEFAULT 'PENDING', created_at TEXT,
  usdt_amount REAL DEFAULT 0, zar_amount REAL DEFAULT 0
)`);

if (db.prepare('SELECT COUNT(*) as c FROM tasks').get().c === 0) {
  db.prepare(`INSERT INTO tasks (title, reward_cash, reward_coins, link) VALUES
  ('Join Shaya Earn Network Group', 0.10, 50, 'https://t.me/ShayaEarnNetwork'),
  ('Follow Our Channel', 0.05, 20, 'https://t.me/ShayaEarnNetwork'),
  ('Share Bot To 3 Friends', 0.20, 100, '')`).run();
}

function getUser(id, username, firstName) {
  let u = db.prepare('SELECT * FROM users WHERE user_id=?').get(id);
  if (!u) {
    db.prepare('INSERT INTO users (user_id, username, first_name, updated_at) VALUES (?,?,?,?)').run(id, username||'', firstName||'', new Date().toISOString());
    u = db.prepare('SELECT * FROM users WHERE user_id=?').get(id);
  }
  return u;
}

const RATES = {
  SA: { currency:'R', perAdCash:0.02, perAdCoins:10, coinValue:1000,
    minWithdraw:30, minWithdrawUSDT:30,
    referralCash:0.50, referralCoins:50, referralNeedAds:10,
    vipPrice:30, vipPerAdCash:0.04, vipPerAdCoins:20,
    vipProPrice:100, vipProPerAdCash:0.08, vipProPerAdCoins:40 },
  USA: { currency:'$', perAdCash:0.002, perAdCoins:2, coinValue:1000,
    minWithdraw:0.05, minWithdrawUSDT:30,
    referralCash:0.10, referralCoins:10, referralNeedAds:5,
    vipPrice:5, vipPerAdCash:0.004, vipPerAdCoins:4,
    vipProPrice:15, vipProPerAdCash:0.008, vipProPerAdCoins:8 }
};

async function getYouTubeVideos(type='trending', query='', region='SA') {
  if (!YOUTUBE_API_KEY) return [];
  const regionCode = region === 'USA' ? 'US' : 'ZA';
  let url = '';
  if (type === 'trending') url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&maxResults=12&regionCode=${regionCode}&key=${YOUTUBE_API_KEY}`;
  else if (type === 'search') url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query)}&type=video&regionCode=${regionCode}&key=${YOUTUBE_API_KEY}`;
  else if (type === 'music') url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&maxResults=12&regionCode=${regionCode}&videoCategoryId=10&key=${YOUTUBE_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items) return [];
    return data.items.map(v => ({ id: v.id.videoId || v.id, title: v.snippet.title, channel: v.snippet.channelTitle, thumb: v.snippet.thumbnails.medium.url, views: v.statistics?.viewCount || 0, url: `https://www.youtube.com/watch?v=${v.id.videoId || v.id}` }));
  } catch(e){ return []; }
}

app.get('/api/user/:id', (req,res)=>{
  const u = db.prepare('SELECT * FROM users WHERE user_id=?').get(req.params.id);
  if(!u) return res.json({error:'not found'});
  res.json({ ...u, rate: RATES[u.region], usdtToZar: USDT_TO_ZAR, zarToUsdt: ZAR_TO_USDT, lastRateUpdate: LAST_RATE_UPDATE });
});

app.get('/api/rate', (req,res)=>{
  res.json({ usdtToZar: USDT_TO_ZAR, zarToUsdt: ZAR_TO_USDT, lastUpdate: new Date(LAST_RATE_UPDATE).toISOString(), source: 'open.er-api.com + Binance fallback' });
});

app.get('/api/convert-usdt', async (req,res)=>{
  if(Date.now() - LAST_RATE_UPDATE > 30*60*1000) await updateUsdtRate();
  const usdt = parseFloat(req.query.usdt || 0);
  const zar = parseFloat(req.query.zar || 0);
  if(usdt) return res.json({ usdt, zar: (usdt * USDT_TO_ZAR).toFixed(2), rate: USDT_TO_ZAR, live: true });
  if(zar) return res.json({ zar, usdt: (zar * ZAR_TO_USDT).toFixed(4), rate: USDT_TO_ZAR, live: true });
  res.json({ rate: USDT_TO_ZAR, example: { usdt_30: (30*USDT_TO_ZAR).toFixed(2), usdt_1: USDT_TO_ZAR, usdt_0_05: (0.05*USDT_TO_ZAR).toFixed(2) }, live: true });
});

app.post('/api/convert-balance-to-usdt', (req,res)=>{
  const { user_id } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE user_id=?').get(user_id);
  if(!u) return res.json({error:'user not found'});
  if(u.region === 'SA') return res.json({ success:true, balanceRand: u.balance, balanceUSDT: (u.balance * ZAR_TO_USDT).toFixed(4), rate: USDT_TO_ZAR });
  return res.json({ success:true, balanceUSD: u.balance, balanceUSDT: u.balance.toFixed(4), rate: 1 });
});

app.post('/api/watch', (req,res)=>{
  const { user_id } = req.body;
  let u = db.prepare('SELECT * FROM users WHERE user_id=?').get(user_id);
  if(!u) return res.json({error:'user not found'});
  const r = RATES[u.region];
  let cash=r.perAdCash, coins=r.perAdCoins;
  if(u.vip_level==='VIP'){ cash=r.vipPerAdCash; coins=r.vipPerAdCoins; }
  if(u.vip_level==='VIP PRO'){ cash=r.vipProPerAdCash; coins=r.vipProPerAdCoins; }
  db.prepare('UPDATE users SET balance=balance+?, coins=coins+?, total_ads=total_ads+1, total_earned=total_earned+?, updated_at=? WHERE user_id=?').run(cash,coins,cash,new Date().toISOString(),user_id);
  u = db.prepare('SELECT * FROM users WHERE user_id=?').get(user_id);
  if(u.referred_by && u.total_ads === RATES[u.region].referralNeedAds){
    const ref = db.prepare('SELECT * FROM users WHERE user_id=?').get(u.referred_by);
    if(ref){
      const rr = RATES[ref.region];
      db.prepare('UPDATE users SET balance=balance+?, coins=coins+?, referrals=referrals+1, updated_at=? WHERE user_id=?').run(rr.referralCash, rr.referralCoins, new Date().toISOString(), ref.user_id);
    }
  }
  res.json({ success:true, earnedCash:cash, earnedCoins:coins, user:u });
});

app.post('/api/daily', (req,res)=>{
  const { user_id } = req.body;
  let u = db.prepare('SELECT * FROM users WHERE user_id=?').get(user_id);
  if(!u) return res.json({error:'user not found'});
  const today = new Date().toISOString().slice(0,10);
  if(u.last_daily===today) return res.json({error:'Already claimed today'});
  const r = RATES[u.region];
  const streak = u.last_daily ? u.streak+1 : 1;
  const bonusCash = r.perAdCash*5 + (streak*0.01);
  const bonusCoins = 20 + streak;
  db.prepare('UPDATE users SET balance=balance+?, coins=coins+?, last_daily=?, streak=?, updated_at=? WHERE user_id=?').run(bonusCash, bonusCoins, today, streak, new Date().toISOString(), user_id);
  res.json({ success:true, bonusCash, bonusCoins, streak });
});

app.post('/api/convert', (req,res)=>{
  const { user_id } = req.body;
  let u = db.prepare('SELECT * FROM users WHERE user_id=?').get(user_id);
  if(!u) return res.json({error:'user not found'});
  const r = RATES[u.region];
  if(u.coins < r.coinValue) return res.json({error:`Need ${r.coinValue} coins`});
  const val = u.coins / r.coinValue;
  db.prepare('UPDATE users SET balance=balance+?, coins=0, updated_at=? WHERE user_id=?').run(val, new Date().toISOString(), user_id);
  res.json({ success:true, converted:val });
});

app.post('/api/withdraw', (req,res)=>{
  const { user_id, method, wallet } = req.body;
  let u = db.prepare('SELECT * FROM users WHERE user_id=?').get(user_id);
  if(!u) return res.json({error:'user not found'});
  const r = RATES[u.region];
  const isUSDT = method.includes('USDT');
  if(isUSDT){
    let usdtBalance = u.region === 'SA' ? u.balance * ZAR_TO_USDT : u.balance;
    if(usdtBalance < r.minWithdrawUSDT) return res.json({error:`Need $${r.minWithdrawUSDT} USDT minimum. SA: R${(r.minWithdrawUSDT*USDT_TO_ZAR).toFixed(2)} | USA: $${r.minWithdrawUSDT}. Your USDT: $${usdtBalance.toFixed(2)}`});
    const usdtAmount = usdtBalance;
    const zarAmount = u.region === 'SA' ? u.balance : usdtBalance * USDT_TO_ZAR;
    db.prepare('INSERT INTO withdrawals (user_id, amount, coins, method, wallet, created_at, usdt_amount, zar_amount) VALUES (?,?,?,?,?,?,?,?)').run(user_id, u.balance, u.coins, method, wallet, new Date().toISOString(), usdtAmount, zarAmount);
    db.prepare('UPDATE users SET balance=0, coins=0, wallet=?, updated_at=? WHERE user_id=?').run(wallet, new Date().toISOString(), user_id);
    bot.telegram.sendMessage(ADMIN_ID, `💸 NEW USDT WITHDRAWAL\nUser: ${user_id} @${u.username}\nRegion: ${u.region}\nUSDT: $${usdtAmount.toFixed(2)} USDT\nIn Rand: R${zarAmount.toFixed(2)}\nRate: 1 USDT = R${USDT_TO_ZAR.toFixed(2)}\nMethod: ${method}\nWallet: ${wallet}`).catch(()=>{});
    return res.json({ success:true, usdtAmount, zarAmount });
  } else {
    if(u.balance < r.minWithdraw) return res.json({error:`Need ${u.currency}${r.minWithdraw} minimum for ${method}. Your balance: ${u.currency}${u.balance.toFixed(2)}`});
    const usdtEq = u.region === 'SA' ? (u.balance * ZAR_TO_USDT).toFixed(4) : u.balance.toFixed(4);
    db.prepare('INSERT INTO withdrawals (user_id, amount, coins, method, wallet, created_at, usdt_amount, zar_amount) VALUES (?,?,?,?,?,?,?,?)').run(user_id, u.balance, u.coins, method, wallet, new Date().toISOString(), usdtEq, u.balance);
    db.prepare('UPDATE users SET balance=0, coins=0, wallet=?, updated_at=? WHERE user_id=?').run(wallet, new Date().toISOString(), user_id);
    bot.telegram.sendMessage(ADMIN_ID, `💸 NEW WITHDRAWAL\nUser: ${user_id} @${u.username}\nRegion: ${u.region}\nAmount: ${u.currency}${u.balance} + ${u.coins} Coins (= $${usdtEq} USDT)\nMethod: ${method}\nWallet: ${wallet}`).catch(()=>{});
    return res.json({ success:true });
  }
});

app.get('/api/tasks', (req,res)=>{ res.json(db.prepare('SELECT * FROM tasks').all()); });
app.get('/api/leaderboard', (req,res)=>{ res.json(db.prepare('SELECT username, first_name, balance, coins, total_ads, region FROM users ORDER BY total_earned DESC LIMIT 10').all()); });

app.post('/api/sync', (req,res)=>{
  const { user_id, balance, coins, total_ads, referrals, streak, region, vip_level } = req.body;
  let u = db.prepare('SELECT * FROM users WHERE user_id=?').get(user_id);
  if(!u) return res.json({error:'not found'});
  if(u.balance === 0 && u.coins === 0 && (balance > 0 || coins > 0)){
    db.prepare('UPDATE users SET balance=?, coins=?, total_ads=?, referrals=?, streak=?, region=?, vip_level=?, updated_at=? WHERE user_id=?').run(balance||0, coins||0, total_ads||0, referrals||0, streak||0, region||u.region, vip_level||u.vip_level, new Date().toISOString(), user_id);
    u = db.prepare('SELECT * FROM users WHERE user_id=?').get(user_id);
    console.log(`Restored user ${user_id} from frontend backup`);
  }
  res.json({success:true, user:u});
});

app.post('/api/set-region', (req,res)=>{
  const { user_id, region } = req.body;
  if(!['SA','USA'].includes(region)) return res.json({error:'Invalid region'});
  db.prepare('UPDATE users SET region=?, currency=?, updated_at=? WHERE user_id=?').run(region, RATES[region].currency, new Date().toISOString(), user_id);
  const u = db.prepare('SELECT * FROM users WHERE user_id=?').get(user_id);
  res.json({success:true, user:u, rate: RATES[region]});
});

app.get('/ping', (req,res)=> res.send('OK'));

app.get('/api/videos/trending', async (req,res)=>{ res.json(await getYouTubeVideos('trending','',req.query.region||'SA')); });
app.get('/api/videos/music', async (req,res)=>{ res.json(await getYouTubeVideos('music','',req.query.region||'SA')); });
app.get('/api/videos/search', async (req,res)=>{ res.json(await getYouTubeVideos('search',req.query.q||'Amapiano',req.query.region||'SA')); });

bot.start((ctx)=>{
  const user = ctx.from;
  const args = ctx.message.text.split(' ')[1];
  getUser(user.id, user.username, user.first_name);
  if(args && args.startsWith('ref_')){
    const refId = parseInt(args.replace('ref_',''));
    if(refId && refId!==user.id) db.prepare('UPDATE users SET referred_by=? WHERE user_id=?').run(refId, user.id);
  }
  ctx.reply(`🔥 SHAYA WATCH - ALL PROFIT PLANS\n\n🇿🇦 SA + 🇺🇸 USA in ONE bot!\n💱 LIVE: 1 USDT = R${USDT_TO_ZAR.toFixed(2)}\nTap below to OPEN APP 👇`, Markup.inlineKeyboard([
    [Markup.button.webApp('🚀 OPEN SHAYA APP', `${WEBAPP_URL}?start=${user.id}`)],
    [Markup.button.callback('🇿🇦 SA MODE', 'set_SA'), Markup.button.callback('🇺🇸 USA MODE', 'set_USA')],
    [Markup.button.callback('👥 My Referral Link', 'invite')],
  ]));
});

bot.action(/set_(SA|USA)/, (ctx)=>{
  const region = ctx.match[1];
  db.prepare('UPDATE users SET region=?, currency=?, updated_at=? WHERE user_id=?').run(region, RATES[region].currency, new Date().toISOString(), ctx.from.id);
  ctx.answerCbQuery(`Set to ${region}`);
  ctx.reply(`✅ Region: ${region} (${RATES[region].currency})\nNow open the app to earn!`, Markup.inlineKeyboard([[Markup.button.webApp('🚀 OPEN APP', `${WEBAPP_URL}?start=${ctx.from.id}`)]]));
});

bot.action('invite', (ctx)=>{
  ctx.reply(`👥 Your Link:\nhttps://t.me/${BOT_USERNAME}?start=ref_${ctx.from.id}\n\nShare it everywhere! You earn on every friend.`);
});

bot.command('trending', async (ctx)=>{
  const u = getUser(ctx.from.id, ctx.from.username, ctx.from.first_name);
  const videos = await getYouTubeVideos('trending','',u.region||'SA');
  if(!videos.length) return ctx.reply('❌ YouTube API Key missing or quota finished.');
  let msg = `🔥 TRENDING IN ${u.region} NOW:\n\n`;
  videos.slice(0,5).forEach((v,i)=>{ msg += `${i+1}. ${v.title}\n👤 ${v.channel} | 👁️ ${v.views} views\n${v.url}\n\n`; });
  ctx.reply(msg);
});

bot.command('usdt', (ctx)=>{
  const u = getUser(ctx.from.id, ctx.from.username, ctx.from.first_name);
  const usdtVal = u.region==='SA' ? (u.balance * ZAR_TO_USDT).toFixed(4) : u.balance.toFixed(4);
  ctx.reply(`💱 USDT CONVERTER - LIVE\n\nYour Balance: ${u.currency}${u.balance.toFixed(2)}\n= $${usdtVal} USDT\n\nRate: 1 USDT = R${USDT_TO_ZAR.toFixed(2)} (LIVE)\n30 USDT = R${(30*USDT_TO_ZAR).toFixed(2)}\n0.05 USDT = R${(0.05*USDT_TO_ZAR).toFixed(2)}\n\nWithdraw Min:\n• Cash: ${u.currency}${RATES[u.region].minWithdraw}\n• USDT: $30 USDT`);
});

bot.command('balance', (ctx)=>{
  const u = getUser(ctx.from.id, ctx.from.username, ctx.from.first_name);
  const usdtVal = u.region==='SA' ? (u.balance * ZAR_TO_USDT).toFixed(4) : u.balance.toFixed(4);
  ctx.reply(`💰 Balance: ${u.currency}${u.balance.toFixed(2)} (= $${usdtVal} USDT)\n🪙 Coins: ${u.coins}\n📺 Ads: ${u.total_ads}\n👥 Referrals: ${u.referrals}\n🔥 Streak: ${u.streak} days\n👑 VIP: ${u.vip_level}`);
});

bot.command('activate', (ctx)=>{
  if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
  const parts = ctx.message.text.split(' ');
  const targetId = parts[1]; const level = parts.slice(2).join(' ');
  if(!targetId || !level) return ctx.reply('Use: /activate 123456 VIP OR /activate 123456 VIP PRO');
  const lvl = level.toUpperCase().includes('PRO') ? 'VIP PRO' : 'VIP';
  const until = new Date(Date.now()+7*24*60*60*1000).toISOString().slice(0,10);
  db.prepare('UPDATE users SET vip_level=?, vip_until=?, updated_at=? WHERE user_id=?').run(lvl, until, new Date().toISOString(), parseInt(targetId));
  ctx.reply(`✅ ${targetId} = ${lvl} until ${until}`);
  bot.telegram.sendMessage(parseInt(targetId), `🎉 You are now ${lvl} until ${until}!`).catch(()=>{});
});

bot.command('stats', (ctx)=>{
  if(ctx.from.id!==ADMIN_ID) return;
  const total = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const sa = db.prepare("SELECT COUNT(*) as c FROM users WHERE region='SA'").get().c;
  const usa = db.prepare("SELECT COUNT(*) as c FROM users WHERE region='USA'").get().c;
  const pend = db.prepare("SELECT COUNT(*) as c FROM withdrawals WHERE status='PENDING'").get().c;
  ctx.reply(`📊 STATS\nTotal: ${total} | SA: ${sa} | USA: ${usa}\nPending Withdrawals: ${pend}\nRate: 1 USDT = R${USDT_TO_ZAR.toFixed(2)} (LIVE)`);
});

bot.command('approve', (ctx)=>{
  if(ctx.from.id!==ADMIN_ID) return;
  const id = ctx.message.text.split(' ')[1];
  db.prepare("UPDATE withdrawals SET status='PAID' WHERE id=?").run(id);
  ctx.reply(`✅ Withdrawal #${id} marked PAID`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`🌐 WebApp on port ${PORT} | DB: ${DB_PATH}`));
bot.launch();
console.log('🤖 Bot running + WebApp API ready');
process.once('SIGINT', ()=> bot.stop('SIGINT'));
process.once('SIGTERM', ()=> bot.stop('SIGTERM'));
