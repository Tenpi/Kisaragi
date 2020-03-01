import {GuildEmoji, Message, MessageEmbed, Util} from "discord.js"
import {Command} from "../../structures/Command"
import {Embeds} from "./../../structures/Embeds"
import {Functions} from "./../../structures/Functions"
import {Kisaragi} from "./../../structures/Kisaragi"

export default class Emoji extends Command {
    constructor(discord: Kisaragi, message: Message) {
        super(discord, message, {
            description: "Posts the image of an emoji.",
            help:
            `
            \`emoji emoji/name\` - Posts an emoji from the emoji or name
            \`emoji list\` - Posts a list of all the emojis in the server
            `,
            examples:
            `
            \`=>emoji karenSugoi\`
            \`=>emoji kannaHungry\`
            \`=>emoji list\`
            `,
            aliases: [],
            cooldown: 5
        })
    }

    public run = async (args: string[]) => {
        const discord = this.discord
        const message = this.message
        const embeds = new Embeds(discord, message)

        if (args[1] === "list") {
            if (!message.guild) return message.reply(`This command can only be used in a guild.`)
            const emojis = message.guild?.emojis.cache.map((e)=> {
                if (e.animated) {
                    return `<${e.identifier}>`
                } else {
                    return `<:${e.identifier}>`
                }
            })!.join("")
            const split = Util.splitMessage(emojis, {maxLength: 2000, char: "<"})
            const emojiArray: MessageEmbed[] = []
            for (let i = 0; i < split.length; i++) {
                if (split.length > 1) split[i] = `<${split[i]}`
                const emojiEmbed = embeds.createEmbed()
                .setTitle(`**Emoji List** ${discord.getEmoji("kannaAngry")}`)
                .setDescription(split[i])
                emojiArray.push(emojiEmbed)
            }
            if (emojiArray.length === 1) {
                return message.channel.send(emojiArray[0])
            } else {
                return embeds.createReactionEmbed(emojiArray)
            }
        }

        const emojiEmbed = embeds.createEmbed()
        .setTitle(`**Emoji Search** ${discord.getEmoji("gabStare")}`)
        const emojiName = args[1]
        if (!emojiName) return this.noQuery(emojiEmbed, "You must provide an emoji or emoji name.")

        const emojiID = String(emojiName.replace(/(?<=:)(.*?)(?=:)/g, "").match(/\d+/))

        if (emojiID === "null") {
            const emojiFound = discord.emojis.cache.find((emoji: GuildEmoji) => emoji.name.toLowerCase() === emojiName.toLowerCase())
            if (emojiFound === undefined) {
                message.channel.send(emojiEmbed
                .setDescription("Could not find that emoji!"))
                return
            }

            message.channel.send(emojiEmbed
            .setDescription(`**${emojiFound!.name} Emoji**`)
            .setImage(`${emojiFound!.url}`))
            return

            } else {
                const emojiGet = discord.emojis.cache.get(emojiID)
                message.channel.send(emojiEmbed
                .setDescription(`**${emojiGet!.name} Emoji**`)
                .setImage(emojiGet!.url))
                return
            }
    }
}
