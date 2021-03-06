const DisTube = require("distube")
const Discord = require("discord.js")
const client = new Discord.Client()
const fs = require("fs")
const config = require("./config.json")
const http = require('http');
const express = require('express');
const app = express();

const server_port = process.env.YOUR_PORT || process.env.PORT || 60;
const server_host = process.env.YOUR_HOST || '0.0.0.0';

app.get("/", (request, response) => {
  console.log(Date.now() + " Ping Received");
  response.sendStatus(200);
});
app.listen(server_port);
setInterval(() => {
  http.get(`http://ten-music-autoplay.herokuapp.com/`);
}, 280000);

client.config = require("./config.json")
client.distube = new DisTube(client, { searchSongs: true, emitNewSongOnly: true, leaveOnFinish: true })
client.commands = new Discord.Collection()
client.aliases = new Discord.Collection()
client.emotes = config.emoji;

fs.readdir("./commands/", (err, files) => {
    let jsFiles = files.filter(f => f.split(".").pop() === "js")
    if (jsFiles.length <= 0) return console.log("Could not find any commands!")
    jsFiles.forEach((file) => {
        let cmd = require(`./commands/${file}`)
        console.log(`Loaded ${file}`)
        client.commands.set(cmd.name, cmd)
        if (cmd.aliases) cmd.aliases.forEach(alias => client.aliases.set(alias, cmd.name))
    })
})

client.on("ready", () => {
    console.log(client.user.tag + " is ready to play music.")
    let server = client.voice.connections.size
    client.user.setActivity({ type: "PLAYING", name: `music on ${server} servers` })
})

client.on('message', async message => {
    if (!message.content.startsWith(process.env.prefix)) return
    const args = message.content.slice(process.env.prefix.length).trim().split(/ +/g)
    const command = args.shift().toLowerCase();
    let cmd = client.commands.get(command) || client.commands.get(client.aliases.get(command))
    if (!cmd) return
    try {
        cmd.run(client, message, args)
    }
    catch (e) {
        console.error(e)
        message.reply("Error: " + e)
    }

})

const status = (queue) => `Volume: \`${queue.volume}%\` | Filter: \`${queue.filter || "Off"}\` | Loop: \`${queue.repeatMode ? queue.repeatMode == 2 ? "All Queue" : "This Song" : "Off"}\` | Autoplay: \`${queue.autoplay ? "On" : "Off"}\``;
client.distube
    .on("playSong", (message, queue, song) => message.channel.send(
        `${client.emotes.play} | Playing \`${song.name}\` - \`${song.formattedDuration}\`\nRequested by: ${song.user}\n${status(queue)}`
    ))
    .on("addSong", (message, queue, song) => message.channel.send(
        `${client.emotes.success} | Added ${song.name} - \`${song.formattedDuration}\` to the queue by ${song.user}`
    ))
    .on("${client.emotes.play} |playList", (message, queue, playlist, song) => message.channel.send(
        `${client.emotes.play} | Play \`${playlist.title}\` playlist (${playlist.total_items} songs).\nRequested by: ${song.user}\nNow playing \`${song.name}\` - \`${song.formattedDuration}\`\n${status(queue)}`
    ))
    .on("addList", (message, queue, playlist) => message.channel.send(
        `${client.emotes.success} | Added \`${playlist.title}\` playlist (${playlist.total_items} songs) to queue\n${status(queue)}`
    ))
    // DisTubeOptions.searchSongs = true
    .on("searchResult", (message, result) => {
        let i = 0;
        message.channel.send(`**Choose an option from below**\n${result.map(song => `**${++i}**. ${song.name} - \`${song.formattedDuration}\``).join("\n")}\n*Enter anything else or wait 60 seconds to cancel*`);
    })
    // DisTubeOptions.searchSongs = true
    .on("searchCancel", (message) => message.channel.send(`${client.emotes.error} | Searching canceled`))
    .on("error", (message, err) => message.channel.send(`${client.emotes.error} | An error encountered: ${err}`));

client.login('ODAyMjIxMDQyMDU5MDUxMDM4.YAsEkA.S_4WrHZbP4t5KVDAaCYDlf_ryYE')
