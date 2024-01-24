const Discord = require("discord.js");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const client = new Discord.Client({ intents: 3276799 });
const config = require("./config.json");
const { title } = require("process");

let isPlaying = false;
let isLooping = false;
const playlist = [];
const loopPlaylist = [];

client.login(config.token);

client.on("ready", async () => {
    await client.application.commands.set(commandsList);

    console.log(`🟢${client.user.tag} V2`);

    commandsList.forEach(command => {
        console.log(`Commande enregistrée : ${command.name}`);
    });

    setInterval(() => {
        client.user.setPresence({
            activities: [{
                name: title,
                type: Discord.ActivityType.Listening
            }],
            status: "idle"
        });
    }, 1000);
});

const commandsList = [
    
    {
        name: "search",
        description: "Recherche et joue une musique par titre",
        handle: async (interaction) => {
            const titre = interaction.options.getString("titre");
            if (!titre) {
                return interaction.reply("Veuillez fournir un titre de musique à rechercher.");
            }

            const channel = interaction.member.voice.channel;
            if (!channel) {
                return interaction.reply("Vous devez être dans un salon vocal pour utiliser cette commande.");
            }

            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });

            const searchResults = await ytsr(titre, { limit: 1 });
            if (searchResults.items.length === 0) {
                return interaction.reply("Aucun résultat trouvé pour la recherche.");
            }

            const firstResult = searchResults.items[0];
            const url = firstResult.url;
            const videoID = firstResult.id;
            const title = firstResult.title;

            const stream = ytdl(url, { filter: 'audioonly' });
            const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

            const player = createAudioPlayer();
            player.play(resource);
            connection.subscribe(player);

            const videoimage = `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`;

            const embed = {
                title: "Musique en cours de lecture",
                description: `**Titre**: ${title}\n**Lien**: ${url}\n`,
                image: {
                    url: videoimage,
                },
            };

            interaction.reply({ content: "", embeds: [embed], ephemeral: false });
        },
        options: [
            {
                name: "titre",
                description: "Titre de la musique à rechercher",
                type: 3,
                required: true,
            },
        ],
    },
    
    {
        name: "help",
        description: "Affiche la liste des commandes",
        handle: (interaction) => {
            const commandsDescription = commandsList.map(command => `**${command.name}**: ${command.description}`).join("\n");
            const embed = {
                title: "Liste des commandes",
                description: commandsDescription
            };
            interaction.reply({ content: "", embeds: [embed], ephemeral: true });
        },
    },
    {
        name: "play",
        description: "Joue de la musique",
        handle: async (interaction) => {
            const input = interaction.options.getString("url");
            if (!input) {
                return interaction.reply("Veuillez fournir une URL YouTube valide ou le nom de la vidéo.");
            }

            const channel = interaction.member.voice.channel;
            if (!channel) {
                return interaction.reply("Vous devez être dans un salon vocal pour utiliser cette commande.");
            }

            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });

            let url;
            let videoID;
            try {
                videoID = ytdl.getURLVideoID(input);
                url = `https://www.youtube.com/watch?v=${videoID}`;
            } catch (error) {
                return interaction.reply("Impossible de récupérer l'URL YouTube à partir de l'entrée fournie.");
            }

            const stream = ytdl(url, { filter: 'audioonly' });
            const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

            const player = createAudioPlayer();
            player.play(resource);
            connection.subscribe(player);

            interaction.reply("Musique en cours de lecture.");
        },
        
        options: [
            {
                name: "url",
                description: "URL YouTube ou nom de la vidéo",
                type: 3,
                required: true,
            },
        ],
    },
    {
        name: "playliste",
        description: "Joue une liste de musique avec des liens",
        handle: async (interaction) => {
            const urls = interaction.options.getString("urls");
            if (!urls) {
                return interaction.reply("Veuillez fournir une liste d'URLs YouTube valides séparées par des virgules.");
            }
    
            const urlArray = urls.split(",").map(url => url.trim());
    
            if (urlArray.length === 0) {
                return interaction.reply("Veuillez fournir une liste d'URLs YouTube valides séparées par des virgules.");
            }
    
            if (isPlaying) {
                playlist.push(...urlArray.map(url => ({ url, videoID: ytdl.getURLVideoID(url) })));
                interaction.reply(`Musiques ajoutées à la playlist : ${urlArray.join(", ")}`);
            } else {
                const channel = interaction.member.voice.channel;
                if (!channel) {
                    return interaction.reply("Vous devez être dans un salon vocal pour utiliser cette commande.");
                }
    
                const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                });
    
                playlist.push(...urlArray.map(url => ({ url, videoID: ytdl.getURLVideoID(url) })));
                isPlaying = true;
                playCurrentSong(connection);
                
                const embeds = await Promise.all(urlArray.map(async (url) => {
                    const videoID = ytdl.getURLVideoID(url);
                    const title = await ytdl.getBasicInfo(url).then(info => info.videoDetails.title);
                    const videoimage = `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`;
    
                    return {
                        title: `Musique ajoutée à la playlist`,
                        description: `**Titre**: ${title}\n**Lien**: ${url}\n`,
                        image: {
                            url: videoimage,
                        },
                    };
                }));
    
                interaction.reply({ content: "", embeds: embeds, ephemeral: false });
            }
        },
        options: [
            {
                name: "urls",
                description: "Liste d'URLs YouTube séparées par des virgules",
                type: 3,
                required: true,
            },
        ],
    },
    {
    name: "skip",
    description: "Passe à la musique suivante dans la playlist",
    handle: async (interaction) => {
        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.reply("Vous devez être dans un salon vocal pour utiliser cette commande.");
        }

        if (playlist.length === 0) {
            return interaction.reply("Il n'y a pas de musique suivante dans la playlist.");
        }

        const nextSong = playlist[0];
        const { url, videoID } = nextSong;

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        connection.subscribe(player);
        player.stop();

        const stream = ytdl(url, { filter: 'audioonly' });
        const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
        player.play(resource);
        playlist.shift();

        const title = await ytdl.getBasicInfo(url).then(info => info.videoDetails.title);
        const videoimage = `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`;

        const embed = {
            title: "Musique suivante",
            description: `**Titre**: ${title}\n**Lien**: ${url}\n`,
            image: {
                url: videoimage,
            },
        };

        interaction.reply({ content: "", embeds: [embed], ephemeral: false });
    },
},

    {
        name: "stop",
        description: "Arrête la lecture de musique et vide la playlist",
        handle: (interaction) => {
            const channel = interaction.member.voice.channel;
            if (!channel) {
                return interaction.reply("Vous devez être dans un salon vocal pour utiliser cette commande.");
            }

            playlist.length = 0;
            isPlaying = false;
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            connection.destroy();
            interaction.reply("La lecture de musique a été arrêtée et la playlist a été vidée.");
        },
    },
];

client.on("interactionCreate", (interaction) => {
    if (!interaction.isCommand()) return;

    const command = commandsList.find(cmd => cmd.name === interaction.commandName);
    if (command) {
        command.handle(interaction);
    }
});

async function playCurrentSong(connection) {
    if (playlist.length === 0) {
        isPlaying = false;
        if (isLooping) {
            playlist.push(...loopPlaylist);
        }
        return;
    }

    const { url, videoID } = playlist[0];

    const stream = ytdl(url, { filter: 'audioonly' });
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

    const player = createAudioPlayer();
    player.play(resource);
    connection.subscribe(player);

    player.once('finish', () => {
        playlist.shift();
        playCurrentSong(connection);
    });
}

client.on("voiceChannelJoin", (member, channel) => {
    if (!isPlaying && playlist.length > 0) {
        isPlaying = true;
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        playCurrentSong(connection);
    }
});

client.on("error", (error) => {
    console.error('Erreur du client Discord :', error);
});

client.on("warn", (warning) => {
    console.warn('Avertissement du client Discord :', warning);
});
