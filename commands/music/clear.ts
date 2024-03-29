import {Message} from "discord.js"
import {Command} from "../../structures/Command"
import {Audio} from "./../../structures/Audio"
import {Embeds} from "./../../structures/Embeds"
import {Functions} from "./../../structures/Functions"
import {Kisaragi} from "./../../structures/Kisaragi"
import {Permission} from "../../structures/Permission"

export default class Clear extends Command {
    constructor(discord: Kisaragi, message: Message) {
        super(discord, message, {
            description: "Clears all effects applied to a track.",
            help:
            `
            \`clear\` - Clears all effects.
            `,
            examples:
            `
            \`=>clear\`
            `,
            aliases: [],
            guildOnly: true,
            cooldown: 10
        })
    }

    public run = async (args: string[]) => {
        const discord = this.discord
        const message = this.message
        const embeds = new Embeds(discord, message)
        const audio = new Audio(discord, message)
        const perms = new Permission(discord, message)
        if (!perms.checkBotDev()) return
        if (!audio.checkMusicPermissions()) return
        if (!audio.checkMusicPlaying()) return
        audio.clear()
        const queue = audio.getQueue() as any
        const embed = await audio.updateNowPlaying()
        queue[0].message.edit(embed)
        const rep = await message.reply("Cleared all effects!")
        rep.delete({timeout: 3000}).then(() => message.delete().catch(() => null))
        return
    }
}
