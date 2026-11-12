// index.js - Shaya Watch - SA + USA - ALL Profit Plans - Bot + WebApp Server
const { Telegraf, Markup } = require('telegraf');
const Database = require('better-sqlite3');
const express = require('express');
const path = require('path');

const TOKEN = "PUT_YOUR_TOKEN_FROM_BOTFATHER";
const ADMIN_ID = 1159481047; // <-- CHANGE TO YOUR ID from @userinfobot
const BOT_USERNAME = "ShayaWatchMnelisiBot"; // <-- Your new bot username
const WEBAPP_URL = "https://YOUR-RENDER-URL.onrender.com"; // <-- Change after deploy

const bot = new Telegraf(TOKEN);
const db = new Database('shaya.db');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- DATABASE ---
db.prepare(`CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY,
  username TEXT, first_name TEXT,
  region TEXT DEFAULT 'SA', currency TEXT DEFAULT 'R',
  balance REAL DEFAULT 0, coins INTEGER DEFAULT 0,
  referrals INTEGER DEFAULT 0, total_ads INTEGER DEFAULT 0,
  vip_level TEXT DEFAULT 'FREE', vip_until TEXT DEFAULT NULL,
  last_daily TEXT DEFAULT NULL, last_checkin TEXT DEFAULT NULL,
  streak INTEGER DEFAULT 0, referred_by INTEGER DEFAULT NULL,
  wallet TEXT DEFAULT NULL, total_earned REAL DEFAULT 0
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT, reward_cash REAL, reward_coins INTEGER, link TEXT
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, amount REAL, coins INTEGER,
  method TEXT, wallet TEXT, status TEXT DEFAULT 'PENDING', created_at TEXT
)`).run();

// Seed tasks if empty
if (db.prepare('SELECT COUNT(*) as c FROM tasks').get().c === 0) {
  db.prepare(`INSERT INTO tasks (title, reward_cash, reward_coins, link) VALUES
  ('Join Shaya Earn Network Group', 0.10, 50, 'https://t.me/ShayaEarnNetwork'),
  ('Follow Our Channel', 0.05, 20, 'https://t.me/ShayaEarnNetwork'),
  ('Share Bot To 3 Friends', 0.20, 100, '')`).run();
}

function getUser(id, username, firstName) {
  let u = db.prepare('SELECT * FROM users WHERE user_id=?').get(id);
  if (!u) {
    db.prepare('INSERT INTO users (user_id, username, first_name) VALUES (?,?,?)').run(id, username||'', firstName||'');
    u = db.prepare('SELECT * FROM users WHERE user_id=?').get(id);
  }
  return u;
}

const RATES = {
  SA: { currency:'R', perAdCash:0.02, perAdCoins:10, coinValue:1000, minWithdraw:50, minCoinsWithdraw:50000, referralCash:0.50, referralCoins:50, referralNeedAds:10, vipPrice:30, vipPerAdCash:0.04, vipPerAdCoins:20, vipProPrice:100, vipProPerAdCash:0.08, vipProPerAdCoins:40 },
  USA: { currency:'$', perAdCash:0.002, perAdCoins:2, coinValue:1000, minWithdraw:5, minCoinsWithdraw:5000, referralCash:0.10, referralCoins:10, referralNeedAds:5, vipPrice:5, vipPerAdCash:0.004, vipPerAdCoins:4, vipProPrice:15, vipProPerAdCash:0.008, vipProPerAdCoins:8 }
};

function fmt(u){ return `${u.currency}${u.balance.toFixed(2)}`; }

// --- API FOR WEB APP (index.html calls this) ---
app.get('/api/user/:id', (req,res)=>{
  const u = db.prepare('SELECT * FROM users WHERE user_id=?').get(req.params.id);
  if(!u) return res.json({error:'not found'});
  res.json({ ...u, rate: RATES[u.region] });
});

app.post('/api/watch', (req,res)=>{
  const { user_id } = req.body;
  let u = db.prepare('SELECT * FROM users WHERE user_id=?').get(user_id);
  if(!u) return res.json({error:'user not found'});
  const r = RATES[u.region];
  let cash=r.perAdCash, coins=r.perAdCoins;
  if(u.vip_level==='VIP'){ cash=r.vipPerAdCash; coins=r.vipPerAdCoins; }
  if(u.vip_level==='VIP PRO'){ cash=r.vipProPerAdCash; coins=r.vipProPerAdCoins; }
  db.prepare('UPDATE users SET balance=balance+?, coins=coins+?, total_ads=total_ads+1, total_earned=total_earned+? WHERE user_id=?').run(cash,coins,cash,user_id);
  u = db.prepare('SELECT * FROM users WHERE user_id=?').get(user_id);
  // Referral unlock
  if(u.referred_by && u.total_ads === RATES[u.region].referralNeedAds){
    const ref = db.prepare('SELECT * FROM users WHERE user_id=?').get(u.referred_by);
    if(ref){
      const rr = RATES[ref.region];
      db.prepare('UPDATE users SET balance=balance+?, coins=coins+?, referrals=referrals+1 WHERE user_id=?').run(rr.referralCash, rr.referralCoins, ref.user_id);
    }
  }
  res.json({ success:true, earnedCash:cash, earnedCoins:coins, user:u });
});

app.post('/api/daily', (req,res)=>{
  const { user_id } = req.body;
  let u = db.prepare('SELECT * FROM users WHERE user_id=?').get(user_id);
  const today = new Date().toISOString().slice(0,10);
  if(u.last_daily===today) return res.json({error:'Already claimed today'});
  const r = RATES[u.region];
  const streak = u.last_daily ? u.streak+1 : 1;
  const bonusCash = r.perAdCash*5 + (streak*0.01);
  db.prepare('UPDATE users SET balance=balance+?, coins=coins+?, last_daily=?, streak=? WHERE user_id=?').run(bonusCash, 20+streak, today, streak, user_id);
  res.json({ success:true, bonusCash, bonusCoins:20+streak, streak });
});

app.post('/api/convert', (req,res)=>{
  const { user_id } = req.body;
  let u = db.prepare('SELECT * FROM users WHERE user_id=?').get(user_id);
  const r = RATES[u.region];
  if(u.coins < r.coinValue) return res.json({error:`Need ${r.coinValue} coins`});
  const val = u.coins / r.coinValue;
  db.prepare('UPDATE users SET balance=balance+?, coins=0 WHERE user_id=?').run(val, user_id);
  res.json({ success:true, converted:val });
});

app.post('/api/withdraw', (req,res)=>{
  const { user_id, method, wallet } = req.body;
  let u = db.prepare('SELECT * FROM users WHERE user_id=?').get(user_id);
  const r = RATES[u.region];
  if(u.balance < r.minWithdraw && u.coins < r.minCoinsWithdraw) return res.json({error:'Not enough to withdraw'});
  db.prepare('INSERT INTO withdrawals (user_id, amount, coins, method, wallet, created_at) VALUES (?,?,?,?,?,?)').run(user_id, u.balance, u.coins, method, wallet, new Date().toISOString());
  db.prepare('UPDATE users SET balance=0, coins=0, wallet=? WHERE user_id=?').run(wallet, user_id);
  // Notify admin
  bot.telegram.sendMessage(ADMIN_ID, `💸 NEW WITHDRAWAL\nUser: ${user_id} @${u.username}\nRegion: ${u.region}\nAmount: ${u.currency}${u.balance} + ${u.coins} Coins\nMethod: ${method}\nWallet: ${wallet}`).catch(()=>{});
  res.json({ success:true });
});

app.get('/api/tasks', (req,res)=>{ res.json(db.prepare('SELECT * FROM tasks').all()); });
app.get('/api/leaderboard', (req,res)=>{ res.json(db.prepare('SELECT username, first_name, balance, coins, total_ads, region FROM users ORDER BY total_earned DESC LIMIT 10').all()); });

// --- BOT ---
bot.start((ctx)=>{
  const user = ctx.from;
  const args = ctx.message.text.split(' ')[1];
  let u = getUser(user.id, user.username, user.first_name);
  if(args && args.startsWith('ref_')){
    const refId = parseInt(args.replace('ref_',''));
    if(refId && refId!==user.id) db.prepare('UPDATE users SET referred_by=? WHERE user_id=?').run(refId, user.id);
  }
  ctx.reply(
    `🔥 SHAYA WATCH - ALL PROFIT PLANS\n\n` +
    `🇿🇦 SA + 🇺🇸 USA in ONE bot!\n` +
    `Tap below to OPEN APP 👇`,
    Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 OPEN SHAYA APP', `${WEBAPP_URL}?start=${user.id}`)],
      [Markup.button.callback('🇿🇦 SA MODE', 'set_SA'), Markup.button.callback('🇺🇸 USA MODE', 'set_USA')],
      [Markup.button.callback('👥 My Referral Link', 'invite')],
    ])
  );
});

bot.action(/set_(SA|USA)/, (ctx)=>{
  const region = ctx.match[1];
  db.prepare('UPDATE users SET region=?, currency=? WHERE user_id=?').run(region, RATES[region].currency, ctx.from.id);
  ctx.answerCbQuery(`Set to ${region}`);
  ctx.reply(`✅ Region: ${region} (${RATES[region].currency})\nNow open the app to earn!`, Markup.inlineKeyboard([[Markup.button.webApp('🚀 OPEN APP', `${WEBAPP_URL}?start=${ctx.from.id}`)]]));
});

bot.action('invite', (ctx)=>{
  const link = `https://t.me/${BOT_USERNAME}?start=ref_${ctx.from.id}`;
  ctx.reply(`👥 Your Link:\n${link}\n\nShare it everywhere! You earn on every friend.`);
});

bot.command('activate', (ctx)=>{
  if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
  const [_, targetId, level] = ctx.message.text.split(' ');
  if(!targetId || !level) return ctx.reply('Use: /activate 123456 VIP  OR  /activate 123456 VIP PRO');
  const lvl = level.toUpperCase()==='PRO' ? 'VIP PRO' : 'VIP';
  const until = new Date(Date.now()+7*24*60*60*1000).toISOString().slice(0,10);
  db.prepare('UPDATE users SET vip_level=?, vip_until=? WHERE user_id=?').run(lvl, until, parseInt(targetId));
  ctx.reply(`✅ ${targetId} = ${lvl} until ${until}`);
  bot.telegram.sendMessage(parseInt(targetId), `🎉 You are now ${lvl} until ${until}! 2x / 4x earnings unlocked!`).catch(()=>{});
});

bot.command('stats', (ctx)=>{
  if(ctx.from.id!==ADMIN_ID) return;
  const total = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const sa = db.prepare("SELECT COUNT(*) as c FROM users WHERE region='SA'").get().c;
  const usa = db.prepare("SELECT COUNT(*) as c FROM users WHERE region='USA'").get().c;
  const pend = db.prepare("SELECT COUNT(*) as c FROM withdrawals WHERE status='PENDING'").get().c;
  ctx.reply(`📊 STATS\nTotal: ${total} | SA: ${sa} | USA: ${usa}\nPending Withdrawals: ${pend}`);
});

bot.command('approve', (ctx)=>{
  if(ctx.from.id!==ADMIN_ID) return;
  const id = ctx.message.text.split(' ')[1];
  db.prepare("UPDATE withdrawals SET status='PAID' WHERE id=?").run(id);
  ctx.reply(`✅ Withdrawal #${id} marked PAID`);
});

// --- START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`🌐 WebApp on port ${PORT}`));
bot.launch();
console.log('🤖 Bot running + WebApp API ready');
process.once('SIGINT', ()=> bot.stop('SIGINT'));
process.once('SIGTERM', ()=> bot.stop('SIGTERM'));
