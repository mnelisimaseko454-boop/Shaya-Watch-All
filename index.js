// ===== SHAYA QUIZ BOT - FINAL - APPROVE TOPUP + DATA BACKUP ONLY - COPIED FROM SHAYA WATCH =====
const express = require('express');
const path = require('path');
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://shayaquizearnbot.onrender.com';
const ADMIN_ID = parseInt(process.env.ADMIN_ID || '7860630273');
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const TOPUP_ACCOUNT = '1893275807';
let supabase = null;
try { if (SUPABASE_URL && SUPABASE_KEY) { supabase = createClient(SUPABASE_URL, SUPABASE_KEY); console.log('Supabase connected'); } } catch(e){ console.log('Supabase failed', e.message); }

// ================= DATA BACKUP - COPIED FROM WATCH =================
// Watch: users Map + sbGetUser + sbUpsertUser + getUser + createUser + getUserAsync + updateUser
const users = new Map();
async function sbGetUser(id){
  if(!supabase) return null;
  try{
    let res1 = await supabase.from('quiz_users').select('*').eq('id', String(id)).single();
    if(res1.data) return res1.data;
    const n = parseInt(id); if(!isNaN(n)){ const r2 = await supabase.from('quiz_users').select('*').eq('user_id', n).single(); return r2.data || null; }
    return null;
  }catch(e){ return null; }
}
async function sbUpsertUser(u){
  if(!supabase) return;
  try{ await supabase.from('quiz_users').upsert({
    id: String(u.id), user_id: parseInt(u.id) || null,
    name: u.name || '', first_name: u.name || '',
    points: u.points||0, play_points: u.playPoints||0, daily_points: u.dailyPoints||0,
    q_index: u.qIndex||0, correct: u.correct||0, wrong: u.wrong||0,
    pending_topup: u.pendingTopup || null
  }, { onConflict: 'id' }); }catch(e){ console.log('sb upsert failed', e.message); }
}
async function getUser(id){
  const key = String(id);
  if(users.has(key)) return users.get(key);
  const sb = await sbGetUser(key);
  if(sb){
    const u = { id: key, user_id: sb.user_id || parseInt(key) || null, name: sb.name || sb.first_name || 'Player',
      points: parseInt(sb.points||0), playPoints: parseInt(sb.play_points||0), dailyPoints: parseInt(sb.daily_points||0),
      qIndex: parseInt(sb.q_index||0), correct: parseInt(sb.correct||0), wrong: parseInt(sb.wrong||0),
      pendingTopup: sb.pending_topup || null };
    users.set(key, u); return u;
  }
  return null;
}
async function createUser(id, data){
  data = data || {};
  const key = String(id);
  const u = { id: key, user_id: parseInt(id)||null, name: data.first_name||data.name||'Player',
    points:0, playPoints:0, dailyPoints:0, qIndex:0, correct:0, wrong:0, pendingTopup:null };
  users.set(key, u); await sbUpsertUser(u); return u;
}
async function getUserAsync(id, name){
  let u = await getUser(id);
  if(!u) u = await createUser(id, { first_name: name, name: name });
  if(name) u.name = name;
  return u;
}
async function updateUser(id, patch){
  let u = users.get(String(id)) || await getUser(id);
  if(!u) return null;
  Object.assign(u, patch); users.set(String(id), u); await sbUpsertUser(u); return u;
}
function formatUser(u){
  return { id: u.id, user_id: u.user_id||u.id, name: u.name,
    points: u.points||0, playPoints: u.playPoints||0, dailyPoints: u.dailyPoints||0,
    qIndex: u.qIndex||0, correct: u.correct||0, wrong: u.wrong||0 };
}
function giveText(coins, points){
  const parts = [];
  if(coins) parts.push('+' + coins + ' Coins');
  if(points) parts.push('+' + points + ' Points');
  return parts.length ? parts.join(' ') : 'Nothing';
}
// ================= END DATA BACKUP =================

const ALL_BUY_PACKAGES = [
  { id:'p1000', coins:0, points:1000, price:1, label:'1000 PLAY = R1' },
  { id:'p5000', coins:0, points:5000, price:5, label:'5000 PLAY = R5' },
  { id:'p10000', coins:0, points:10000, price:10, label:'10000 PLAY = R10' },
  { id:'p50000', coins:0, points:50000, price:50, label:'50000 PLAY = R50' },
  { id:'p100000', coins:0, points:100000, price:100, label:'100000 PLAY = R100' },
];
// Watch helper for approve_topup callback
function parseTopupCallback(data, prefix){
  const rest = data.replace(prefix, '');
  const lastUnd = rest.lastIndexOf('_');
  if(lastUnd === -1) return { userId: rest, packageId: '' };
  return { userId: rest.slice(0, lastUnd), packageId: rest.slice(lastUnd+1) };
}

app.get('/health', (req,res)=> res.json({ok:true}));
app.get('/', (req,res)=> res.sendFile(path.join(__dirname, 'public', 'quiz.html')));
app.get('/api/user/:id', async (req,res)=>{
  const u = await getUserAsync(req.params.id, null);
  if(!u) return res.json({error:'user not found - send /start first'});
  res.json(formatUser(u));
});
app.post('/api/sync', async (req,res)=>{
  const b = req.body;
  let u = await getUserAsync(b.user_id, b.name);
  const patch = {};
  if(b.points!==undefined) patch.points = parseInt(b.points);
  if(b.playPoints!==undefined) patch.playPoints = parseInt(b.playPoints);
  if(b.dailyPoints!==undefined) patch.dailyPoints = parseInt(b.dailyPoints);
  if(b.qIndex!==undefined) patch.qIndex = parseInt(b.qIndex);
  if(b.correct!==undefined) patch.correct = parseInt(b.correct);
  if(b.wrong!==undefined) patch.wrong = parseInt(b.wrong);
  const updated = await updateUser(u.id, patch);
  res.json({success:true, user:formatUser(updated)});
});
app.get('/api/quiz-leaderboard', async (req,res)=>{
  if(supabase){
    const { data } = await supabase.from('quiz_users').select('user_id,name,points').order('points',{ascending:false}).limit(20);
    if(data) return res.json(data.map(r=>({user_id:r.user_id, name:r.name, points:r.points})));
  }
  res.json(Array.from(users.values()).map(u=>({user_id:u.user_id, name:u.name, points:u.points})).sort((a,b)=>b.points-a.points).slice(0,20));
});
app.post('/api/quiz-withdraw', async (req,res)=>{
  const b = req.body; let u = await getUserAsync(b.user_id, b.name);
  let r = Number(b.rand)||0; let pts = Number(b.points)||0;
  if(b.method && b.method.includes('Data')){ r=5; pts=5000; } else { if(r<20||r>100) return res.json({error:'R20 - R100 only'}); pts = r*1000; }
  if(u.points < pts) return res.json({error:'Not enough WIN Points'});
  const updated = await updateUser(u.id, { points: u.points - pts });
  if(supabase) try{ await supabase.from('quiz_withdraws').insert({ user_id:String(u.id), name:u.name, method:b.method, wallet:b.wallet, rand:r, points:pts, status:'pending' }); }catch(e){}
  if(bot && ADMIN_ID) bot.telegram.sendMessage(ADMIN_ID, `💸 NEW WITHDRAW - QUIZ\n👤 ${u.name} (${u.id})\n💰 R${r} = ${pts} WIN\n🏦 ${b.method} - ${b.wallet}`, {
    reply_markup: { inline_keyboard: [[{ text:'✅ PAID', callback_data:'withdraw_paid_'+u.id }],[{ text:'❌ REJECT', callback_data:'withdraw_reject_'+u.id }]] }
  }).catch(()=>{});
  res.json({ok:true, remaining: updated.points});
});

// ================= APPROVE TOPUP - COPIED FROM WATCH =================
// Watch: /api/vip action=topup_request -> saves pendingTopup -> sends Admin Approve button
app.post('/api/quiz-topup', async (req,res)=>{
  const b = req.body;
  let u = await getUserAsync(b.user_id, b.name);
  const pkg = ALL_BUY_PACKAGES.find(p=> p.id===b.packageId) || { id:b.packageId||'p1000', points: parseInt(b.points), price: b.price, label: 'R'+b.price+' = '+b.points+' PLAY' };
  await updateUser(u.id, { pendingTopup: { packageId: pkg.id, points: pkg.points, price: pkg.price, proof: b.proof||'', date: new Date().toISOString(), label: pkg.label } });
  if(bot && ADMIN_ID){
    await bot.telegram.sendMessage(ADMIN_ID, 'TOPUP REQUEST - Check Capitec '+TOPUP_ACCOUNT+'\n\nUser: '+u.name+' ID:'+u.id+'\nPackage: '+pkg.label+' - R'+pkg.price+'\nGive: +'+pkg.points+' PLAY\nProof: '+b.proof+'\nBank: Capitec '+TOPUP_ACCOUNT+'\n\nCheck your bank, then press Approve below.', {
      reply_markup: { inline_keyboard: [[{ text:'Approve', callback_data:'approve_topup_'+u.id+'_'+pkg.id }],[{ text:'Reject', callback_data:'reject_topup_'+u.id }]] }
    }).catch(()=>{});
  }
  res.json({msg:'Topup request sent! +'+pkg.points+' PLAY. Admin will check Capitec '+TOPUP_ACCOUNT+'.'});
});
// ================= END APPROVE TOPUP API =================

let bot = null;
if(BOT_TOKEN){ try{ bot = new Telegraf(BOT_TOKEN); console.log('Bot created - Shaya Quiz Bot'); }catch(e){ console.log('Bot create failed', e.message); } }

if(bot){
  bot.start(async (ctx)=>{
    const user_id = ctx.from.id;
    let u = await getUser(user_id);
    if(!u) u = await createUser(user_id, { first_name: ctx.from.first_name||'', username: ctx.from.username||'' });
    await ctx.replyWithMarkdown('Welcome to *SHAYA QUIZ BOT* '+u.name+'!\n\n🎁 Daily 200 FREE\n🎮 Play - Win - Withdraw\n🏆 Win R20 - R100\n\nTap below', {
      reply_markup:{ inline_keyboard:[[{text:'🧠 PLAY QUIZ - WIN CASH', web_app:{url: WEBAPP_URL}}]] }
    });
  });
  bot.command('balance', async (ctx)=>{
    let u = await getUser(ctx.from.id); if(!u) return ctx.reply('Send /start first');
    ctx.reply(`💰 Balance:\n🎁 Daily: ${u.dailyPoints}\n🎮 Play: ${u.playPoints}\n🏆 Win: ${u.points} = R${(u.points/1000).toFixed(2)}`);
  });

  // ================= APPROVE TOPUP - COPIED FROM WATCH - /approve =================
  bot.command('approve', async (ctx)=>{
    if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
    const text = ctx.message.text.trim(); const parts = text.split(/\s+/); const targetId = parts[1]; let pkgId = parts[2];
    if(!targetId || !pkgId) return ctx.reply('Usage: /approve <ID> <package>\nExample:\n/approve 1159481047 p100000\n/approve web_ja1p2bcvr9 p5000');
    let target = await getUser(targetId);
    if(!target){ for(let kv of users){ if(String(kv[1].user_id)===String(targetId)||String(kv[1].id)===String(targetId)){ target=kv[1]; break; } } }
    const pkg = ALL_BUY_PACKAGES.find(p=> p.id===pkgId); if(!target||!pkg) return ctx.reply('User or package not found\nTried ID: '+targetId+'\nTried Package: '+pkgId);
    const givePoints = (target.pendingTopup && target.pendingTopup.points) || pkg.points || 0;
    await updateUser(target.id, { playPoints: target.playPoints + givePoints, pendingTopup: null });
    ctx.reply('Approved! +'+givePoints+' PLAY to '+target.name+' (ID: '+target.id+')');
    try{ const chatId = parseInt(target.id)||target.user_id; if(chatId) await ctx.telegram.sendMessage(chatId, 'TOPUP APPROVED! +'+givePoints+' PLAY!'); }catch(e){ console.log('Web user - approved in DB, no Telegram DM'); }
  });
  // Watch: /pending
  bot.command('pending', async (ctx)=>{
    if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
    let pendingList = [];
    for(let kv of users){ const u = kv[1]; if(u.pendingTopup) pendingList.push({id:u.id, name:u.name||'Player', pending:u.pendingTopup}); }
    if(supabase){ try{ const res2 = await supabase.from('quiz_users').select('id, name, first_name, pending_topup').not('pending_topup','is',null); const data = res2.data; if(data){ for(let row of data){ if(row.pending_topup && !pendingList.find(p=> String(p.id)===String(row.id))) pendingList.push({id:row.id, name:row.name||row.first_name||'Player', pending:row.pending_topup}); } } }catch(e){} }
    if(pendingList.length===0) return ctx.reply('No pending topups. All clear!');
    let txt = 'PENDING TOPUPS ('+pendingList.length+')\n\n';
    pendingList.forEach((p,i)=>{ txt += (i+1)+'. '+p.name+' ID:'+p.id+'\n   Package: '+p.pending.packageId+' - R'+p.pending.price+' = +'+p.pending.points+' PLAY\n   Proof: '+p.pending.proof+'\n\n'; });
    txt += '\nPress Approve on the request message, or type:\n/approveall';
    await ctx.reply(txt);
  });
  // Watch: /approveall
  bot.command('approveall', async (ctx)=>{
    if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
    let pendingList = [];
    for(let kv of users){ const u = kv[1]; if(u.pendingTopup) pendingList.push(u); }
    if(supabase){ try{ const res3 = await supabase.from('quiz_users').select('*').not('pending_topup','is',null); const data = res3.data; if(data){ for(let row of data){ if(row.pending_topup && !pendingList.find(p=> String(p.id)===String(row.id))){ let u = await getUser(row.id); if(u) pendingList.push(u); } } } }catch(e){} }
    if(pendingList.length===0) return ctx.reply('No pending topups to approve.');
    await ctx.reply('Approving '+pendingList.length+' topups...');
    let approved = 0, failed = [], report = 'APPROVEALL DONE\n\n';
    for(let u of pendingList){
      try{
        const pkgInfo = u.pendingTopup; if(!pkgInfo) continue;
        const pkg = ALL_BUY_PACKAGES.find(p=> p.id===pkgInfo.packageId); if(!pkg){ failed.push(u.name+' ('+u.id+') - package '+pkgInfo.packageId+' not found'); continue; }
        const givePoints = pkgInfo.points || pkg.points || 0;
        await updateUser(u.id, { playPoints: (u.playPoints||0)+givePoints, pendingTopup: null });
        report += 'OK '+u.name+' ID:'+u.id+' - +'+givePoints+' PLAY (R'+pkg.price+')\n'; approved++;
        try{ const chatId = parseInt(u.id)||u.user_id; if(chatId) await ctx.telegram.sendMessage(chatId, 'TOPUP APPROVED! +'+givePoints+' PLAY!'); }catch(e){}
      }catch(e){ failed.push(u.name+' ('+u.id+') - '+e.message); }
    }
    if(failed.length>0) report += '\nFAILED ('+failed.length+'):\n'+failed.join('\n');
    report += '\n\nTotal Approved: '+approved+'/'+pendingList.length;
    await ctx.reply(report);
  });
  // Watch: /reject
  bot.command('reject', async (ctx)=>{
    if(ctx.from.id!==ADMIN_ID) return ctx.reply('Admin only');
    const parts = ctx.message.text.trim().split(/\s+/); const targetId = parts[1]; if(!targetId) return ctx.reply('Usage: /reject <ID>');
    let target = await getUser(targetId); if(!target||!target.pendingTopup) return ctx.reply('No pending topup for this user.');
    await updateUser(target.id, { pendingTopup: null }); await ctx.reply('Rejected topup for '+target.name+' ('+target.id+')');
    try{ const chatId = parseInt(target.id)||target.user_id; if(chatId) await ctx.telegram.sendMessage(chatId, 'Your topup request was rejected. No payment found for Capitec '+TOPUP_ACCOUNT+'.'); }catch(e){}
  });
  // ================= END APPROVE TOPUP COMMANDS =================

  // ================= APPROVE TOPUP - COPIED FROM WATCH - callback_query =================
  bot.on('callback_query', async (ctx)=>{
    const data = ctx.callbackQuery && ctx.callbackQuery.data || '';
    const fromId = ctx.from && ctx.from.id;
    if(data.indexOf('approve_topup_')===0 || data.indexOf('reject_topup_')===0 || data.indexOf('withdraw_paid_')===0 || data.indexOf('withdraw_reject_')===0){
      if(fromId!==ADMIN_ID){ try{ await ctx.answerCbQuery('Admin only'); }catch(e){} return; }
    }
    if(data.indexOf('approve_topup_')===0){
      const parsed = parseTopupCallback(data, 'approve_topup_');
      const userId = parsed.userId; const packageId = parsed.packageId;
      const target = await getUser(userId); const pkg = ALL_BUY_PACKAGES.find(p=> p.id===packageId);
      if(!target||!pkg){ try{ await ctx.answerCbQuery('User or package not found: '+userId+' / '+packageId); }catch(e){} return; }
      const givePoints = (target.pendingTopup && target.pendingTopup.points) || pkg.points || 0;
      await updateUser(target.id, { playPoints: (target.playPoints||0)+givePoints, pendingTopup: null });
      try{ await ctx.answerCbQuery('Approved!'); }catch(e){}
      try{ await ctx.editMessageText('APPROVED - TOPUP\n\n'+target.name+' ID:'+target.id+'\n'+pkg.label+'\n+'+givePoints+' PLAY\n\nPaid via Capitec '+TOPUP_ACCOUNT); }catch(e){}
      try{ const chatId = parseInt(target.id)||target.user_id; if(chatId) await ctx.telegram.sendMessage(chatId, 'TOPUP APPROVED!\n\n+'+givePoints+' PLAY!'); }catch(e){ console.log('Web user - approved in DB only'); }
      return;
    }
    if(data.indexOf('reject_topup_')===0){
      const userId = data.replace('reject_topup_','');
      const target = await getUser(userId);
      if(target) await updateUser(target.id, { pendingTopup: null });
      try{ await ctx.answerCbQuery('Rejected'); }catch(e){}
      try{ await ctx.editMessageText('REJECTED - TOPUP\n\n'+(target && target.name || '')+' ID:'+userId+'\nReason: No payment found in Capitec '+TOPUP_ACCOUNT); }catch(e){}
      try{ const chatId = parseInt(userId); if(chatId) await ctx.telegram.sendMessage(chatId, 'Your topup was rejected. No payment found in Capitec '+TOPUP_ACCOUNT+'.'); }catch(e){}
      return;
    }
    if(data.indexOf('withdraw_paid_')===0){
      const userId = data.replace('withdraw_paid_','');
      try{ await ctx.answerCbQuery('Marked as Paid'); }catch(e){}
      try{ await ctx.editMessageText('✅ WITHDRAW PAID'); }catch(e){}
      try{ await ctx.telegram.sendMessage(parseInt(userId), 'Your withdraw has been PAID!'); }catch(e){}
      return;
    }
    if(data.indexOf('withdraw_reject_')===0){
      const userId = data.replace('withdraw_reject_','');
      try{ await ctx.answerCbQuery('Rejected'); }catch(e){}
      try{ await ctx.editMessageText('❌ WITHDRAW REJECTED'); }catch(e){}
      return;
    }
  });
  // ================= END APPROVE TOPUP CALLBACK =================

  bot.launch().then(()=> console.log('Bot launched - Quiz - Approve Topup + Backup ON')).catch(e=> console.log('Bot launch failed', e.message));
  process.once('SIGINT', ()=> bot.stop('SIGINT')); process.once('SIGTERM', ()=> bot.stop('SIGTERM'));
} else console.log('BOT_TOKEN not set');
app.listen(PORT, ()=>{ console.log('Shaya Quiz running on '+PORT); });
