import {Message, MessageAttachment, MessageEmbed} from "discord.js"
import {Command} from "../../structures/Command"
import {CommandFunctions} from "./../../structures/CommandFunctions"
import {Embeds} from "./../../structures/Embeds"
import {Functions} from "./../../structures/Functions"
import {Kisaragi} from "./../../structures/Kisaragi"

const google = require("google-it")

export default class Google extends Command {
    constructor(discord: Kisaragi, message: Message) {
        super(discord, message, {
            description: "Searches a search term on google.",
            help:
            `
            \`google query\` - Searches google for the query.
            `,
            examples:
            `
            \`=>google anime\`
            `,
            aliases: ["g"],
            cooldown: 10
        })
    }

    public run = async (args: string[]) => {
        const discord = this.discord
        const message = this.message
        const commands = new CommandFunctions(discord, message)
        const embeds = new Embeds(discord, message)
        const query = Functions.combineArgs(args, 1)
        if (!query) {
            return this.noQuery(embeds.createEmbed()
            .setAuthor("google", "https://cdn4.iconfinder.com/data/icons/new-google-logo-2015/400/new-google-favicon-512.png")
            .setTitle(`**Google Search** ${discord.getEmoji("raphi")}`))
        }

        const resultArray: string[] = []

        const result = await google({query, limit: 50})
        for (const i in result) {
            resultArray.push(`${discord.getEmoji("star")}_Title:_ **${result[i].title}**`)
            resultArray.push(`${discord.getEmoji("star")}_Link:_ ${result[i].link}`)
        }
        const googleEmbedArray: MessageEmbed[] = []
        let attachment: MessageAttachment | null
        try {
            await commands.runCommand(message, ["screenshot", "return", `https://www.google.com/search?q=${query.trim().replace(/ /g, "+")}`])
            attachment = new MessageAttachment("../assets/images/screenshot.png")
        } catch {
            attachment = null
        }
        for (let i = 0; i < resultArray.length; i+=10) {
            const googleEmbed = embeds.createEmbed()
            googleEmbed
            .setAuthor("google", "https://cdn4.iconfinder.com/data/icons/new-google-logo-2015/400/new-google-favicon-512.png")
            .setTitle(`**Google Search** ${discord.getEmoji("raphi")}`)
            .setThumbnail(message.author!.displayAvatarURL({format: "png", dynamic: true}))
            .attachFiles([attachment ? attachment : ""])
            .setImage(attachment ? `attachment://screenshot.png` : "")
            .setDescription(resultArray.slice(i, i+10).join("\n"))
            googleEmbedArray.push(googleEmbed)
        }
        embeds.createReactionEmbed(googleEmbedArray)
    }
}
