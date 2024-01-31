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
        name: "play",
        description: "Gère la lecture de musique",
        handle: async (interaction) => {
            const action = interaction.options.getString("action");

            if (!action) {
                return interaction.reply("Veuillez spécifier une action, par exemple, `play`, `stop`, ou `skip`.");
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

            if (action === "play") {
                const titreOrUrl = interaction.options.getString("titre_or_url");

                if (!titreOrUrl) {
                    return interaction.reply("Veuillez fournir un titre de musique à rechercher ou un lien YouTube.");
                }

                let url, title;

                if (ytdl.validateURL(titreOrUrl)) {
                    url = titreOrUrl;
                    const info = await ytdl.getInfo(url);
                    title = info.videoDetails.title;
                } else {
                    const searchResults = await ytsr(titreOrUrl, { limit: 1 });

                    if (searchResults.items.length === 0) {
                        return interaction.reply("Aucun résultat trouvé pour la recherche.");
                    }

                    const firstResult = searchResults.items[0];
                    url = firstResult.url;
                    title = firstResult.title;
                }

                const stream = ytdl(url, { filter: 'audioonly' });
                const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

                const player = createAudioPlayer();
                player.play(resource);
                connection.subscribe(player);

                interaction.reply("Musique en cours de lecture.");
            } else if (action === "stop") {
                // Code pour arrêter la lecture de musique
                // ...
            } else if (action === "skip") {
                // Code pour passer à la musique suivante
                // ...
            } else {
                return interaction.reply("Action non valide. Veuillez spécifier `play`, `stop`, ou `skip`.");
            }
        },
        options: [
            {
                name: "action",
                description: "Action à effectuer (`play`, `stop`, ou `skip`)",
                type: 3,
                required: true,
            },
            {
                name: "titre_or_url",
                description: "Titre de la musique à rechercher ou lien YouTube (utilisé avec l'action `play`)",
                type: 3,
                required: false,
            },
        ],
    },
];
