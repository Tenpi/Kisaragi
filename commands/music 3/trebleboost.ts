import {Message} from "discord.js"
import {Command} from "../../structures/Command"
import {Audio} from "./../../structures/Audio"
import {Embeds} from "./../../structures/Embeds"
import {Functions} from "./../../structures/Functions"
import {Kisaragi} from "./../../structures/Kisaragi"
import {Permission} from "../../structures/Permission"

export default class Trebleboost extends Command {
    constructor(discord: Kisaragi, message: Message) {
        super(discord, message, {
            description: "Preset for highshelf (1000Hz, +5db).",
            help:
            `
            \`trebleboost\` - Applies treble boosting (highshelf 5 1000 100)
            `,
            examples:
            `
            \`=>trebleboost\`
            `,
            aliases: ["treble"],
            guildOnly: true,
            cooldown: 20
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
        const queue = audio.getQueue() as any
        const rep = await message.reply("_Applying a treble boost, please wait..._")
        const file = queue?.[0].file
        await audio.highshelf(file, 5, 1000, 100)
        if (rep) rep.delete()
        const settings = audio.getSettings() as any
        settings.filters.push("highshelf")
        const embed = await audio.updateNowPlaying()
        queue[0].message.edit(embed)
        const rep2 = await message.reply("Applied treble boosting!")
        rep2.delete({timeout: 3000}).then(() => message.delete().catch(() => null))
        return
    }
}
