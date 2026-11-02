// Post the weekly image and the Discord text block to a channel through a webhook.
// Usage: node post_discord.js <image.png> <message.txt> [webhook file=discord_webhook.txt next to this script]
// The webhook URL lives only in that file on this PC (it's a secret: anyone with it can post to the channel);
// sync_repo.js never copies it to the public repo. Prints Discord's message id on success.
const fs = require('fs'), path = require('path');
const [image, textFile, hookFile = path.join(__dirname, 'discord_webhook.txt')] = process.argv.slice(2);
const hook = fs.readFileSync(hookFile, 'utf8').trim();
if (!/^https:\/\/(discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)\/api\/webhooks\/\d+\/[\w-]+$/.test(hook)) throw new Error('webhook file does not hold a Discord webhook URL');
const content = fs.readFileSync(textFile, 'utf8').trim();
if (content.length > 2000) throw new Error('message is ' + content.length + ' characters; Discord allows 2000');

(async () => {
  const form = new FormData();
  form.append('payload_json', JSON.stringify({ content, allowed_mentions: { parse: [] } }));
  form.append('files[0]', new Blob([fs.readFileSync(image)], { type: 'image/png' }), path.basename(image));
  const res = await fetch(hook + '?wait=true', { method: 'POST', body: form });
  const body = await res.text();
  if (!res.ok) throw new Error('Discord said ' + res.status + ': ' + body.slice(0, 300));
  console.log('posted message', JSON.parse(body).id);
})().catch(e => { console.error(e.message); process.exit(1); });
