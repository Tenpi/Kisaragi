import {Message, MessageEmbed} from "discord.js"
import fs from "fs"
import {Command} from "../../structures/Command"
import {Embeds} from "./../../structures/Embeds"
import {Functions} from "./../../structures/Functions"
import {Kisaragi} from "./../../structures/Kisaragi"

export default class Help extends Command {
    constructor(discord: Kisaragi, message: Message) {
        super(discord, message, {
            description: "Lists all bot commands and describes how to use them.",
            help:
            `
            Looking for help on the help command, how ironic!
            \`help\` - Lists all commands
            \`help cmd\` - Gets detailed help on a command
            `,
            examples:
            `
            \`=>help\`
            \`=>help help\`
            `,
            aliases: ["h"],
            cooldown: 5
        })
    }

    public run = async (args: string[]) => {
        const discord = this.discord
        const message = this.message
        const embeds = new Embeds(discord, message)
        const star = discord.getEmoji("star")
        const helpEmbedArray: MessageEmbed[] = []
        if (args[1]) {
            const helpDir = new (require("./helpInfo").default)(this.discord, this.message)
            await helpDir.run(args)
            return
        }
        const unlistedDirs = ["bot developer", "heart", "logging", "music"]
        const subDir = fs.readdirSync("./commands")
        for (let i = 0; i < subDir.length; i++) {
            if (unlistedDirs.includes(subDir[i])) continue
            let help = ""
            const commands = fs.readdirSync(`./commands/${subDir[i]}`)
            for (let j = 0; j < commands.length; j++) {
                commands[j] = commands[j].slice(0, -3)
                if (commands[j] === "empty" || commands[j] === "tempCodeRunnerFile") continue
                const cmdClass = new (require(`../${subDir[i]}/${commands[j]}`).default)(this.discord, this.message)
                if (cmdClass.options.unlist === true) continue
                help += `${star}**${commands[j]}**\n` + `${cmdClass.options.description}\n`
            }
            const helpEmbed = embeds.createEmbed()
            helpEmbed
            .setTitle(`**${Functions.toProperCase(subDir[i])} Commands** ${discord.getEmoji("gabTired")}`)
            .setAuthor("help", "https://cdn.discordapp.com/emojis/579856442551697418.gif")
            // .setImage("https://i.imgur.com/Av9RN7x.png")
            .setThumbnail(message.author!.displayAvatarURL({format: "png", dynamic: true}))
            .setDescription(help)
            helpEmbedArray.push(helpEmbed)
        }
        embeds.createReactionEmbed(helpEmbedArray)
    }
}
