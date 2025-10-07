// ===== Keep-alive server =====
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('✅ FSG Bot is alive!'));
app.listen(3000, () => console.log('🌐 Keep-alive server running'));

// ===== Discord Bot Code =====
const { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionsBitField } = require('discord.js');
require('dotenv').config();
const ms = require('ms');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const PREFIX = process.env.PREFIX || '!';
const GIVEAWAY_ROLE_ID = process.env.GIVEAWAY_ROLE_ID || '';

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity('FP Skyblock Giveaways 🎁', { type: 3 });
});

/* ===== Giveaway helper ===== */
function finishGiveaway(channel, prize, winners, roleId) {
  const mentions = winners.map(id => `<@${id}>`).join(', ');
  const embed = new EmbedBuilder()
    .setTitle('🎉 Giveaway Ended!')
    .setColor('Gold')
    .setDescription(`**Prize:** ${prize}\n**Winner(s):** ${mentions}`)
    .setTimestamp();
  channel.send({ content: roleId ? `<@&${roleId}>` : '', embeds: [embed] });
}

/* ===== Commands ===== */
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const [cmd, ...args] = message.content.slice(PREFIX.length).trim().split(/ +/g);

  // ping
  if (cmd === 'ping') {
    const sent = await message.channel.send('🏓 Pinging...');
    sent.edit(`🏓 Pong! Latency: **${client.ws.ping}ms**`);
  }

  // gstart: !gstart 1m 1 Prize
  if (cmd === 'gstart') {
    const time = args.shift();
    const winnerCount = parseInt(args.shift() || '1');
    const prize = args.join(' ');
    if (!time || !prize) return message.reply('Usage: !gstart <duration> <winners> <prize>');
    const msg = await message.channel.send({
      content: GIVEAWAY_ROLE_ID ? `<@&${GIVEAWAY_ROLE_ID}>` : '',
      embeds: [
        new EmbedBuilder()
          .setTitle('🎉 New Giveaway!')
          .setColor('Purple')
          .setDescription(`**Prize:** ${prize}\n**Winners:** ${winnerCount}\nReact with 🎉 to enter.`)
          .setFooter({ text: `Hosted by ${message.author.tag}` })
          .setTimestamp()
      ]
    });
    await msg.react('🎉');
    setTimeout(() => {
      finishGiveaway(message.channel, prize, [message.author.id], GIVEAWAY_ROLE_ID);
    }, ms(time));
    return message.reply('🎁 Giveaway started!');
  }

  // moderation: ban
  if (cmd === 'ban') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply('❌ You do not have permission to ban.');
    const member = message.mentions.members.first();
    if (!member) return message.reply('Usage: !ban @user [reason]');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    await member.ban({ reason }).catch(e => message.reply('Failed to ban: ' + e.message));
    return message.reply(`✅ Banned ${member.user.tag}`);
  }

  // kick
  if (cmd === 'kick') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return message.reply('❌ You do not have permission to kick.');
    const member = message.mentions.members.first();
    if (!member) return message.reply('Usage: !kick @user [reason]');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    await member.kick(reason).catch(e => message.reply('Failed to kick: ' + e.message));
    return message.reply(`✅ Kicked ${member.user.tag}`);
  }

  // mute/unmute (needs a role named "Muted" created in server)
  if (cmd === 'mute') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply('❌ You do not have permission to mute.');
    const member = message.mentions.members.first();
    if (!member) return message.reply('Usage: !mute @user');
    const muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
    if (!muteRole) return message.reply('⚠️ Create a role named "Muted" first.');
    await member.roles.add(muteRole).catch(e => message.reply('Failed: ' + e.message));
    return message.reply(`🔇 Muted ${member.user.tag}`);
  }
  if (cmd === 'unmute') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply('❌ You do not have permission to unmute.');
    const member = message.mentions.members.first();
    if (!member) return message.reply('Usage: !unmute @user');
    const muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
    if (!muteRole) return message.reply('⚠️ Create a role named "Muted" first.');
    await member.roles.remove(muteRole).catch(e => message.reply('Failed: ' + e.message));
    return message.reply(`🔊 Unmuted ${member.user.tag}`);
  }

  // clear messages
  if (cmd === 'clear') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
      return message.reply('❌ You do not have permission to clear messages.');
    const amount = parseInt(args[0]) || 10;
    await message.channel.bulkDelete(amount, true).catch(e => message.reply('Failed: ' + e.message));
    return message.reply(`🧹 Deleted ${amount} messages.`).then(m => setTimeout(() => m.delete(), 3000));
  }

  // avatar
  if (cmd === 'avatar') {
    const user = message.mentions.users.first() || message.author;
    return message.channel.send({ content: user.displayAvatarURL({ dynamic: true, size: 1024 }) });
  }

  // userinfo
  if (cmd === 'userinfo') {
    const user = message.mentions.users.first() || message.author;
    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 1024, dynamic: true }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp/1000)}:R>`, inline: true }
      )
      .setColor('Blue');
    return message.channel.send({ embeds: [embed] });
  }

  // say
  if (cmd === 'say') {
    const text = args.join(' ');
    if (!text) return message.reply('Say what?');
    await message.delete().catch(()=>{});
    return message.channel.send(text);
  }
});

client.login(process.env.DISCORD_TOKEN);
