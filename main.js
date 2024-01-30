const Discord = require("discord.js");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const client = new Discord.Client({ intents: 3276799 });
const config = require("./config.json");

let isPlaying = false;
let isLooping = false;
const playlist = [];
const loopPlaylist = [];

client.login(config.token);

client.on("ready", async () => {
    await client.application.commands.set(commandsList);

    console.log(`🟢${client.user.tag} / be Nelfye` + config.npm + config.serveurLink);

    commandsList.forEach(command => {
        console.log(`Commande enregistrée : ${command.name}`);
    });
        client.user.setPresence({
            activities: [{
                name: "online",
                type: Discord.ActivityType.Listening
            }],
            status: "dnd"
        });
});

const commandsList = [
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
            client.user.setPresence({
                activities: [{
                    name: title,
                    type: Discord.ActivityType.Listening
                }],
                status: "idle"
            });
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
    name: "skip",
    description: "Passe à la musique suivante dans la playlist",
    handle: async (interaction) => {

    },
},

    {
        name: "stop",
        description: "Arrête la lecture de musique",
        handle: (interaction) => {

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
