import {Message, MessageEmbed} from "discord.js"
import Osu, {OsuBeatmap} from "osu.ts"
import {Command} from "../../structures/Command"
import {Embeds} from "./../../structures/Embeds"
import {Functions} from "./../../structures/Functions"
import {Kisaragi} from "./../../structures/Kisaragi"

export default class OsuCommand extends Command {
    constructor(discord: Kisaragi, message: Message) {
        super(discord, message, {
            description: "Searches for osu beatmaps, players, and scores.",
            help:
            `
            \`osu query\` - Searches for beatmaps
            \`osu url\` - Gets the beatmap from the url
            \`osu user name\` - Gets a user profile
            \`osu recent name\` - Gets a user's recent plays
            \`osu best name\` - Gets a user's best plays
            `,
            examples:
            `
            \`=>osu\`
            \`=>osu https://osu.ppy.sh/beatmapsets/556393#osu/1177545\`
            \`=>osu best tenpii\`
            `,
            aliases: [],
            cooldown: 10
        })
    }

    public run = async (args: string[]) => {
        const discord = this.discord
        const message = this.message
        const embeds = new Embeds(discord, message)
        const osu = new Osu(process.env.OSU_API_KEY!)
        const osuEmbed = embeds.createEmbed()
        const star = discord.getEmoji("star")

        if (args[1] === "user") {
            const playerName = args[2]
            if (!playerName) {
                return this.noQuery(osuEmbed
                    .setAuthor("osu", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Osu%21Logo_%282015%29.svg/220px-Osu%21Logo_%282015%29.svg.png")
                    .setTitle(`**Osu Profile** ${discord.getEmoji("kannaSip")}`))
            }
            const player = await osu.users.get(playerName)
            const hours = Math.floor(Number(player.total_seconds_played) / 3600)
            const minutes = Math.floor((Number(player.total_seconds_played) % (3600*hours)) / 60)
            const seconds = ((Number(player.total_seconds_played) % (3600*hours)) % (60*minutes))
            osuEmbed
            .setAuthor("osu", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Osu%21Logo_%282015%29.svg/220px-Osu%21Logo_%282015%29.svg.png")
            .setTitle(`**Osu Profile** ${discord.getEmoji("kannaSip")}`)
            .setURL(`https://osu.ppy.sh/users/${player.user_id}`)
            .setDescription(
            `${star}_Player:_ **${player.username}**\n` +
            `${star}_Join Date:_ **${Functions.formatDate(new Date(player.join_date))}**\n` +
            `${star}_Play Time:_ **${hours}h ${minutes}m ${seconds}s**\n` +
            `${star}_Play count:_ **${player.playcount}**\n` +
            `${star}${discord.getEmoji("SSHrank")} **${player.count_rank_ssh}** ${discord.getEmoji("SSrank")}` +
            `**${player.count_rank_ss}** ${discord.getEmoji("SHrank")} **${player.count_rank_sh}** ${discord.getEmoji("Srank")} **${player.count_rank_s}**` +
            `${discord.getEmoji("Arank")} **${player.count_rank_a}**\n` +
            `${star}${discord.getEmoji("300hit")} **${player.count300}** ${discord.getEmoji("100hit")} **${player.count100}**` +
            `${discord.getEmoji("50hit")} **${player.count50}**\n` +
            `${star}_Level:_ **${player.level.slice(0, 5)}**\n` +
            `${star}_Rank:_ **#${player.pp_rank} (:flag_${player.country.toLowerCase()}: #${player.pp_country_rank})**\n` +
            `${star}_Score:_ **${player.ranked_score} (${player.total_score})**\n` +
            `${star}_PP:_ **${player.pp_raw}**\n` +
            `${star}_Accuracy:_ **${player.accuracy.slice(0, 5) + "%"}**\n`
            )
            .setImage(await osu.users.banner(playerName))
            .setThumbnail(`https://a.ppy.sh/${player.user_id}`)
            return message.channel.send(osuEmbed)
        }

        if (args[1] === "recent") {
            const playername = args[2]
            if (!playername) {
                return this.noQuery(osuEmbed
                    .setAuthor("osu", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Osu%21Logo_%282015%29.svg/220px-Osu%21Logo_%282015%29.svg.png")
                    .setTitle(`**Osu Recent** ${discord.getEmoji("kannaSip")}`))
            }
            const recent = await osu.scores.recent(playername)
            const osuArray: MessageEmbed[] = []
            for (let i = 0; i < recent.length; i++) {
                const beatmap = await osu.beatmaps.get({b: recent[i].beatmap_id})
                const osuEmbed = embeds.createEmbed()
                osuEmbed
                .setAuthor("osu", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Osu%21Logo_%282015%29.svg/220px-Osu%21Logo_%282015%29.svg.png")
                .setTitle(`**${playername}'s Recent Plays** ${discord.getEmoji("kannaSip")}`)
                .setThumbnail(`https://b.ppy.sh/thumb/${beatmap[0].beatmapset_id}l.jpg`)
                .setImage(`https://assets.ppy.sh/beatmaps/${beatmap[0].beatmapset_id}/covers/cover.jpg`)
                .setURL(`https://osu.ppy.sh/beatmapsets/${beatmap[0].beatmapset_id}#osu/${beatmap[0].beatmap_id}`)
                .setDescription(
                    `${star}_Beatmap:_**${beatmap[0].title}**\n` +
                    `${star}_Rank:_**${recent[i].rank}**\n` +
                    `${star}_Max Combo:_**${recent[i].maxcombo}**\n` +
                    `${star}_Perfect Combo:_**${recent[i].perfect === "1" ? "Yes" : "No"}**\n` +
                    `${star}_Date:_**${Functions.formatDate(new Date(recent[i].date))}**\n` +
                    `${star}${discord.getEmoji("300hit")} **${recent[i].count300}** ${discord.getEmoji("100hit")} **${recent[i].count100}** ${discord.getEmoji("50hit")} **${recent[i].count50}**\n` +
                    `${star}_Misses:_ **${recent[i].countmiss}**`
                )
                osuArray.push(osuEmbed)
            }
            if (osuArray.length === 1) {
                return message.channel.send(osuArray[0])
            } else {
                return embeds.createReactionEmbed(osuArray)
            }
        }

        if (args[1] === "best") {
            const playername = args[2]
            if (!playername) {
                return this.noQuery(osuEmbed
                    .setAuthor("osu", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Osu%21Logo_%282015%29.svg/220px-Osu%21Logo_%282015%29.svg.png")
                    .setTitle(`**Osu Best** ${discord.getEmoji("kannaSip")}`))
            }
            const best = await osu.scores.best(playername)
            const osuArray: MessageEmbed[] = []
            for (let i = 0; i < best.length; i++) {
                const beatmap = await osu.beatmaps.get({b: best[i].beatmap_id})
                const osuEmbed = embeds.createEmbed()
                osuEmbed
                .setAuthor("osu", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Osu%21Logo_%282015%29.svg/220px-Osu%21Logo_%282015%29.svg.png")
                .setTitle(`**${playername}'s Best** ${discord.getEmoji("kannaSip")}`)
                .setThumbnail(`https://b.ppy.sh/thumb/${beatmap[0].beatmapset_id}l.jpg`)
                .setImage(`https://assets.ppy.sh/beatmaps/${beatmap[0].beatmapset_id}/covers/cover.jpg`)
                .setURL(`https://osu.ppy.sh/beatmapsets/${beatmap[0].beatmapset_id}#osu/${beatmap[0].beatmap_id}`)
                .setDescription(
                    `${star}_Beatmap:_**${beatmap[0].title}**\n` +
                    `${star}_PP:_**${best[i].pp}**\n` +
                    `${star}_Rank:_**${best[i].rank}**\n` +
                    `${star}_Max Combo:_**${best[i].maxcombo}**\n` +
                    `${star}_Perfect Combo:_**${best[i].perfect === "1" ? "Yes" : "No"}**\n` +
                    `${star}_Date:_**${Functions.formatDate(new Date(best[i].date))}**\n` +
                    `${star}${discord.getEmoji("300hit")} **${best[i].count300}** ${discord.getEmoji("100hit")} **${best[i].count100}** ${discord.getEmoji("50hit")} **${best[i].count50}**\n` +
                    `${star}_Misses:_ **${best[i].countmiss}**`
                )
                osuArray.push(osuEmbed)
            }
            if (osuArray.length === 1) {
                return message.channel.send(osuArray[0])
            } else {
                return embeds.createReactionEmbed(osuArray)
            }
        }

        const query = Functions.combineArgs(args, 1)
        if (query?.includes("osu.ppy.sh")) {
            const beatmaps = await osu.beatmaps.get(query)
            const osuArray: MessageEmbed[] = []
            for (let i = 0; i < beatmaps.length; i++) {
                const minutes = Math.floor((Number(beatmaps[i].total_length) / 60))
                const seconds = ((Number(beatmaps[i].total_length)) % (60*minutes))
                const osuEmbed = embeds.createEmbed()
                osuEmbed
                .setAuthor("osu", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Osu%21Logo_%282015%29.svg/220px-Osu%21Logo_%282015%29.svg.png")
                .setTitle(`**Osu Beatmap** ${discord.getEmoji("kannaSip")}`)
                .setURL(`https://osu.ppy.sh/beatmapsets/${beatmaps[i].beatmapset_id}#osu/${beatmaps[i].beatmap_id}`)
                .setImage(`https://assets.ppy.sh/beatmaps/${beatmaps[i].beatmapset_id}/covers/cover.jpg`)
                .setThumbnail(`http://s.ppy.sh/a/${beatmaps[i].creator_id}`)
                .setDescription(
                    `${star}_Beatmap:_ **${beatmaps[i].title}**\n` +
                    `${star}_Artist:_ **${beatmaps[i].artist}**\n` +
                    `${star}_Creator:_ **${beatmaps[i].creator}**\n` +
                    `${star}_Difficulty:_ **${beatmaps[i].version}**\n` +
                    `${star}_BPM:_ **${beatmaps[i].bpm}**\n` +
                    `${star}_Length:_ **${minutes}m ${seconds}s**\n` +
                    `${star}_Stars:_ **${beatmaps[i].difficultyrating}**\n` +
                    `${star}_CS:_ **${beatmaps[i].diff_size}** _OD:_ **${beatmaps[i].diff_overall}** _AR:_ **${beatmaps[i].diff_approach}** _HP:_ **${beatmaps[i].diff_drain}**\n` +
                    `${star}_Playcount:_ **${beatmaps[i].playcount}**\n` +
                    `${star}_Passcount:_ **${beatmaps[i].passcount}**\n` +
                    `${star}_Rating:_ **${beatmaps[i].rating}**\n` +
                    `${star}_Tags:_ ${beatmaps[i].tags}\n`
                )
                osuArray.push(osuEmbed)
            }
            if (osuArray.length === 1) {
                return message.channel.send(osuArray)
            } else {
                return embeds.createReactionEmbed(osuArray)
            }
        } else {
            const beatmaps = await osu.beatmaps.search(query)
            const osuArray: MessageEmbed[] = []
            for (let i = 0; i < beatmaps.length; i++) {
                const minutes = Math.floor((Number(beatmaps[i].beatmaps[0].total_length) / 60))
                const seconds = ((Number(beatmaps[i].beatmaps[0].total_length)) % (60*minutes))
                const osuEmbed = embeds.createEmbed()
                osuEmbed
                .setAuthor("osu", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Osu%21Logo_%282015%29.svg/220px-Osu%21Logo_%282015%29.svg.png")
                .setTitle(`**Osu Beatmap** ${discord.getEmoji("kannaSip")}`)
                .setURL(`https://osu.ppy.sh/beatmapsets/${beatmaps[i].id}#osu/${beatmaps[i].beatmaps[0].id}`)
                .setImage(`https://assets.ppy.sh/beatmaps/${beatmaps[i].id}/covers/cover.jpg`)
                .setThumbnail(`http://s.ppy.sh/a/${beatmaps[i].user_id}`)
                .setDescription(
                    `${star}_Beatmap:_ **${beatmaps[i].title}**\n` +
                    `${star}_Artist:_ **${beatmaps[i].artist}**\n` +
                    `${star}_Creator:_ **${beatmaps[i].creator}**\n` +
                    `${star}_Difficulty:_ **${beatmaps[i].beatmaps[0].version}**\n` +
                    `${star}_BPM:_ **${beatmaps[i].bpm}**\n` +
                    `${star}_Length:_ **${minutes}m ${seconds}s**\n` +
                    `${star}_Stars:_ **${beatmaps[i].beatmaps[0].difficulty_rating}**\n` +
                    `${star}_CS:_ **${beatmaps[i].beatmaps[0].cs}** _OD:_ **${beatmaps[i].beatmaps[0].hit_length}** _AR:_ **${beatmaps[i].beatmaps[0].ar}** _HP:_ **${beatmaps[i].beatmaps[0].drain}**\n` +
                    `${star}_Playcount:_ **${beatmaps[i].beatmaps[0].playcount}**\n` +
                    `${star}_Passcount:_ **${beatmaps[i].beatmaps[0].passcount}**\n` +
                    `${star}_Tags:_ ${beatmaps[i].tags}\n`
                )
                osuArray.push(osuEmbed)
            }
            if (osuArray.length === 1) {
                return message.channel.send(osuArray)
            } else {
                return embeds.createReactionEmbed(osuArray)
            }
        }

    }
}
