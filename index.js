const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState, getVoiceConnection } = require('@discordjs/voice');
const express = require('express');

// Web server mini untuk Railway (Keep-Alive)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot Voice Command Aktif!');
});

app.listen(PORT, () => {
    console.log(`🌐 Web server berjalan di port ${PORT}`);
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // Wajib diisi di Variables Railway nanti!

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Daftarkan Slash Command (/join dan /leave)
const commands = [
    new SlashCommandBuilder()
        .setName('join')
        .setDescription('Menyuruh bot masuk ke voice channel kamu'),
    new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Menyuruh bot keluar dari voice channel')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`🤖 Bot online sebagai ${client.user.tag}`);

    // Daftarkan command secara otomatis ke Discord
    try {
        console.log('🔄 Mendaftarkan slash commands...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        console.log('✅ Slash commands berhasil didaftarkan!');
    } catch (error) {
        console.error('❌ Gagal mendaftarkan commands:', error);
    }
});

// Menangani perintah /join dan /leave
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'join') {
        const memberVoiceChannel = interaction.member.voice.channel;

        if (!memberVoiceChannel) {
            return interaction.reply({ content: '❌ Kamu harus masuk ke dalam voice channel dulu, Abang!', ephemeral: true });
        }

        try {
            const connection = joinVoiceChannel({
                channelId: memberVoiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: true
            });

            // Logika Auto-Reconnect jika terputus
            connection.on(VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                } catch (error) {
                    connection.destroy();
                }
            });

            await interaction.reply(`✅ Berhasil masuk ke voice channel: **${memberVoiceChannel.name}**!`);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Terjadi kesalahan saat mencoba masuk voice channel.', ephemeral: true });
        }
    } 
    
    else if (commandName === 'leave') {
        const connection = getVoiceConnection(interaction.guild.id);

        if (!connection) {
            return interaction.reply({ content: '❌ Bot lagi tidak berada di voice channel mana pun di server ini.', ephemeral: true });
        }

        connection.destroy();
        await interaction.reply('👋 Bot keluar dari voice channel.');
    }
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

client.login(TOKEN);
