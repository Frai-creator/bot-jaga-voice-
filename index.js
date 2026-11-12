const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot Jaga Voice 24/7 Aktif!');
});

app.listen(PORT, () => {
    console.log(`🌐 Web server berjalan di port ${PORT}`);
});

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

function connectToVoice() {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
        return console.error('❌ Server (Guild) tidak ditemukan! Cek GUILD_ID.');
    }

    const channel = guild.channels.cache.get(VOICE_CHANNEL_ID);
    if (!channel) {
        return console.error('❌ Voice Channel tidak ditemukan! Cek VOICE_CHANNEL_ID.');
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: true
    });

    console.log(`✅ Berhasil masuk ke voice channel: ${channel.name}`);

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        console.log('⚠️ Koneksi voice terputus! Mencoba menyambung kembali...');
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
        } catch (error) {
            console.log('🔄 Gagal reconnect, memaksa masuk ulang dalam 5 detik...');
            connection.destroy();
            setTimeout(connectToVoice, 5000);
        }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
        console.log('💥 Koneksi hancur, menyambung ulang dalam 5 detik...');
        setTimeout(connectToVoice, 5000);
    });
}

client.once('ready', () => {
    console.log(`🤖 Bot online sebagai ${client.user.tag}`);
    connectToVoice();
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

client.login(TOKEN);
