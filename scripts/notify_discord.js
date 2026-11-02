// Sends a short text alert to the private Discord channel (the weekly run's failure and status alerts).
// Usage: node notify_discord.js "<message>" [webhook file=discord_webhook.txt next to this script]
// Discord's own app then notifies the user's phone, so this works when they're away from the PC.
const fs = require('fs'), path = require('path');
const [msg, hookFile = path.join(__dirname, 'discord_webhook.txt')] = process.argv.slice(2);
if (!msg) throw new Error('no message');
const hook = fs.readFileSync(hookFile, 'utf8').trim();
fetch(hook + '?wait=true', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: msg.slice(0, 2000), allowed_mentions: { parse: [] } }) })
  .then(async res => { const t = await res.text(); if (!res.ok) throw new Error('Discord said ' + res.status + ': ' + t.slice(0, 200)); console.log('sent', JSON.parse(t).id); })
  .catch(e => { console.error(e.message); process.exit(1); });
