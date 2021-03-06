import {Message} from "discord.js"
import {Command} from "../../structures/Command"
import {Embeds} from "../../structures/Embeds"
import {Permission} from "../../structures/Permission"
import * as config from "./../../config.json"
import {Functions} from "./../../structures/Functions"
import {Kisaragi} from "./../../structures/Kisaragi"
import {SQLQuery} from "./../../structures/SQLQuery"

export default class Oauth2 extends Command {
    constructor(discord: Kisaragi, message: Message) {
        super(discord, message, {
            description: "Authorize Kisaragi with additional permissions over your discord account.",
            help:
            `
            _Note: The data is only used for commands requiring oauth2. You can delete it at any point._
            \`oauth2\` - Follow the url and click on "Authorize" to authorize the bot
            \`oauth2 revoke/delete\` - Revokes your oauth token and deletes your oauth2 data. Also deletes the twitter token.
            `,
            examples:
            `
            \`=>oauth2\`
            \`=>oauth2 delete\`
            `,
            guildOnly: true,
            aliases: ["authorize", "discordoauth"],
            cooldown: 10
        })
    }

    public run = async (args: string[]) => {
        const discord = this.discord
        const message = this.message
        const perms = new Permission(discord, message)
        const embeds = new Embeds(discord, message)
        if (args[1] === "delete" || args[1] === "revoke") {
            await SQLQuery.revokeOuath2(message.author.id)
            const oauth2Embed = embeds.createEmbed()
            oauth2Embed
            .setAuthor("discord oauth", "https://cdn3.iconfinder.com/data/icons/popular-services-brands-vol-2/512/discord-512.png")
            .setTitle(`**Discord Oauth 2.0** ${discord.getEmoji("gabYes")}`)
            .setDescription(`${discord.getEmoji("star")}Revoked your oauth token! This also deletes your twitter oauth token, if it was set.`)
            return message.channel.send(oauth2Embed)
        }

        const state = Functions.randomString(16)
        const states = await SQLQuery.redisGet("state").then((s) => JSON.parse(s))
        states.push(state)
        await SQLQuery.redisSet("state", JSON.stringify(states))

        const redirect = config.testing === "on" ? config.oauth2Testing : config.oauth2
        const url = `https://discord.com/api/oauth2/authorize?client_id=${discord.user!.id}&redirect_uri=${encodeURIComponent(redirect)}&state=${state}&response_type=code&scope=guilds.join%20email%20connections%20guilds%20identify%20gdm.join`
        const oauth2Embed = embeds.createEmbed()
        oauth2Embed
        .setAuthor("discord oauth", "https://cdn3.iconfinder.com/data/icons/popular-services-brands-vol-2/512/discord-512.png")
        .setTitle(`**Discord Oauth 2.0** ${discord.getEmoji("gabYes")}`)
        .setDescription(`${discord.getEmoji("star")}Authorize Kisaragi Bot [**here**](${url}) to authenticate additional permissions over your discord account for oauth2 commands (ex. Sending you email, adding you to a guild, creating a group dm).`)
        return message.channel.send(oauth2Embed)
    }
}
