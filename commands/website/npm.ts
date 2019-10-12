import {Message, MessageEmbed} from "discord.js"
import {Command} from "../../structures/Command"
import {Embeds} from "./../../structures/Embeds"
import {Functions} from "./../../structures/Functions"
import {Kisaragi} from "./../../structures/Kisaragi"

const npm = require("libnpmsearch")

export default class NPM extends Command {
    constructor() {
        super({
            aliases: [],
            cooldown: 3
        })
    }

    public run = async (discord: Kisaragi, message: Message, args: string[]) => {
        const embeds = new Embeds(discord, message)
        const query = Functions.combineArgs(args, 1)
        const result = await npm(query, {sortBy: "popularity"})
        const star = discord.getEmoji("star")
        const npmArray: MessageEmbed[] = []
        for (let i = 0; i < result.length; i++) {
            const npmEmbed = embeds.createEmbed()
            const keywords = result[i].keywords ? result[i].keywords.join(", ") : "None"
            npmEmbed
            .setTitle(`**${result[i].name}** ${discord.getEmoji("gabStare")}`)
            .setURL(result[i].links ? result[i].links.npm : "None")
            .setAuthor(`npm`, "https://www.tomsquest.com/img/posts/2018-10-02-better-npm-ing/npm_logo.png")
            .setThumbnail(message.author!.displayAvatarURL({format: "png", dynamic: true}))
            .setDescription(
            `${star}_Version:_ **${result[i].version}**\n` +
            `${star}_Publisher:_ ${result[i].publisher.username}\n` +
            `${star}_Email:_ ${result[i].publisher.email}\n` +
            `${star}_Date:_ ${Functions.formatDate(result[i].date)}\n` +
            `${star}_Repository:_ ${result[i].links.repository ? result[i].links.repository : "None"}\n` +
            `${star}_Description:_ ${result[i].description ? result[i].description : "None"}\n` +
            `${star}_Keywords:_ ${Functions.checkChar(keywords, 1000, ",")}\n`
            )
            npmArray.push(npmEmbed)
        }
        if (npmArray.length > 1) {
            embeds.createReactionEmbed(npmArray)
        } else {
            message.channel.send(npmArray[0])
        }
    }
}
