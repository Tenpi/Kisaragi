import {Message} from "discord.js"
import {Command} from "../../structures/Command"
import {CommandFunctions} from "./../../structures/CommandFunctions"
import {Embeds} from "./../../structures/Embeds"
import {Kisaragi} from "./../../structures/Kisaragi"

export default class Chain extends Command {
    constructor(discord: Kisaragi, message: Message) {
        super(discord, message, {
            description: "Runs multiple commands, one after another.",
            help:
            `
            \`chain cmd1 & cmd2\` - Run multiple commands separated by "&"
            `,
            examples:
            `
            \`=>chain holiday & mention kurisumasu\`
            `,
            aliases: [],
            cooldown: 30
        })
    }

    public run = async (args: string[]) => {
        const discord = this.discord
        const message = this.message
        const commands = new CommandFunctions(discord, message)
        const embeds = new Embeds(discord, message)
        if (!args[1]) return this.noQuery(embeds.createEmbed())

        const cmdArgs = args.join(" ").split("& ")
        for (let i = 0; i < cmdArgs.length; i++) {
            const loading = await message.channel.send(`**Running Chain ${i + 1}** ${discord.getEmoji("gabCircle")}`)
            await commands.runCommand(message, cmdArgs[i].replace(/chain/g, "").split(" "))
            loading.delete({timeout: 1000})
        }
    }
}
