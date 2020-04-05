import {Client, ClientOptions, Collection, Guild, GuildChannel, GuildEmoji, Message, MessageAttachment, Role, TextChannel, User} from "discord.js"
import {message} from "../test/login"
import * as config from "./../config.json"
import {Embeds} from "./Embeds"
import {SQLQuery} from "./SQLQuery"
export class Kisaragi extends Client {
    private starIndex = 0
    constructor(options: ClientOptions) {
        super(options)
    }

    /** Get emojis (my servers) */
    public getEmoji = (name: string): GuildEmoji => {
        if (name === "star") {
            if (this.starIndex === 0) {
                this.starIndex = 1
            } else if (this.starIndex === 1) {
                name += "2"
                this.starIndex = 0
            }
        }
        const emoji = this.emojis.cache.find((e) => (e.name === name) && (e.guild.ownerID === process.env.OWNER_ID))
        if (emoji) {
            return emoji as unknown as GuildEmoji
        } else {
            // Confused Anime
            return this.emojis.cache.get("579870079311937557") as unknown as GuildEmoji
        }
    }

    /** Get emojis (all servers) */
    public getEmojiGlobal = (resolvable: string) => {
        if (!resolvable) return null
        let emoji: GuildEmoji | undefined
        if (Number(resolvable)) {
            emoji = this.emojis.cache.find((e) => e.id === resolvable)
        } else {
            emoji = this.emojis.cache.find((e) => e.name === resolvable)
        }
        if (!emoji) return null
        const emojiTag = emoji.animated ? `<${emoji.identifier}>` : `<:${emoji.identifier}>`
        return emojiTag
    }

    /** Find a role in the guild */
    public getRole = (guild: Guild, resolvable: string) => {
        if (!resolvable) return null
        let role: Role | undefined
        if (Number(resolvable)) {
            role = guild.roles.cache.find((r) => r.id === resolvable)
        } else {
            role = guild.roles.cache.find((r) => r.name.toLowerCase().includes(resolvable.toLowerCase()))
        }
        if (!role) return null
        return role
    }

    /** Find a channel in the guild */
    public getChannel = (guild: Guild, resolvable: string) => {
        if (!resolvable) return null
        let channel: GuildChannel | undefined
        if (Number(resolvable)) {
            channel = guild.channels.cache.find((c) => c.id === resolvable)
        } else {
            channel = guild.channels.cache.find((c) => c.name.toLowerCase().includes(resolvable.toLowerCase()))
        }
        if (!channel) return null
        return channel
    }

    // Fetch Message
    public fetchMessage = async (msg: Message, messageID: string) => {
        if (!messageID?.trim()) return undefined
        const channels = msg.guild!.channels.cache.map((c: GuildChannel) => {if (c.type === "text") return c as TextChannel})
        const msgArray: Message[] = []
        for (let i = 0; i < channels.length; i++) {
            const found = await channels[i]?.messages.fetch({limit: 1, around: messageID})?.then((m) => m.map((m) => m))
            if (found) msgArray.push(...found)
        }
        const msgFound = msgArray.find((m: Message) => m?.id === messageID)
        return msgFound
    }

    // Fetch Last Attachment
    public fetchLastAttachment = async <T extends boolean = false, A extends boolean = false>(message: Message, author?: T, fileExt?: RegExp | false, limit?: number, all?: A):
    Promise<A extends true ? string[] | undefined : (T extends true ? {image: string | undefined, author: User | undefined} : string | undefined)> => {
        if (!limit) limit = 100
        if (!fileExt) fileExt = new RegExp(/.(png|jpg|gif)/)
        const msg = await message.channel.messages.fetch({limit}).then((i) => i.find((m) => m.attachments.size > 0 && m.attachments.first()?.url.match(fileExt as RegExp) !== null))
        if (all) return msg?.attachments.map((a) => a.url) as any
        const image = msg?.attachments.first()?.url
        if (author) return {image, author: msg?.author} as any
        return image as any
    }

    // Get an Invite
    public getInvite = async (guild: Guild | null) => {
        if (!guild || !guild.me?.permissions.has("MANAGE_GUILD")) return "None"
        const invites = await guild.fetchInvites()
        let invite: string | undefined
        if (invites) {
            invite = invites.find((i)=>i.temporary === false)?.url
            if (!invite) invite = invites.first()?.url
        }
        if (!invite) invite = "None"
        return invite
    }

    // Prune Prompt Responses
    public pruneResponses = async (msg: Message) => {
        const messages = await msg.channel.messages.fetch({limit: 10}).then((m) => m.map((m) => m))
        let i = 0
        while (messages[i].author.id !== this.user?.id) {
            await messages[i].delete()
            i++
        }
    }

    // Fetch First Message in a Guild
    public fetchFirstMessage = async (guild: Guild) => {
        const channels = guild.channels.cache.filter((c: GuildChannel) => {
            if (c.type === "text") {
                const perms = c.permissionsFor(this.user?.id!)!
                if (perms?.has("SEND_MESSAGES") && perms?.has("VIEW_CHANNEL")) {
                    return true
                }
            }
            return false
        })
        const channel = channels?.first() as TextChannel
        const lastMsg = await channel?.messages?.fetch({limit: 1}).then((c: Collection<string, Message>) => c.first())
        return lastMsg
    }

    // Check for Bot Mention
    public checkBotMention = (message: Message) => {
        if (message.author.id === this.user?.id) return false
        if (!message.content.startsWith("<@")) return false
        const regex = new RegExp(`<@${this.user?.id}>`)
        if (message.content.match(regex)) return true
    }

    // Errors
    public cmdError = (msg: Message, error: Error) => {
        const embeds = new Embeds(this, msg)
        console.log(error)
        const messageErrorEmbed = embeds.createEmbed()
        messageErrorEmbed
        .setTitle(`**Command Error** ${this.getEmoji("maikaWut")}`)
        .setDescription(`There was an error executing this command:\n` +
        `**${error.name}: ${error.message}**\n` +
        `Please report this with the \`feedback\` command, or through any of the following links:\n` +
        `[Support Server](${config.support}), [Github Repository](${config.repo})`)
        return messageErrorEmbed
    }

    /** Stops responding if the user is blacklisted. */
    public blacklistStop = async (msg: Message) => {
        const sql = new SQLQuery(msg)
        const blacklists = await sql.selectColumn("blacklist", "user id")
        const found = blacklists.find((u) => String(u) === msg.author.id)
        if (found) {
            return true
        } else {
            return false
        }
    }

    /** Mute responses in large guilds */
    public checkMuted = (message: Message) => {
        // if (message.guild?.ownerID === process.env.OWNER_ID) return false
        const muted = [
            "110373943822540800",
            "264445053596991498",
            "450100127256936458",
            "446425626988249089",
            "333949691962195969",
            "632760185756319784"
        ]
        const mutedUsers = [
            "321714991050784770",
            "955798657884569600",
            "395526710101278721",
            "255048840615428107",
            "165811958828761089",
            "187316528100802560",
            "205680187394752512",
            "187316528100802560",
            "245225589332639747"
        ]
        if (!message.guild) {
            if (mutedUsers.includes(message.author.id)) return true
            return false
        }
        if (muted.includes(message.guild.id)) {
            return true
        } else {
            const found = message.guild.members.cache.find((m) => mutedUsers.includes(m.id))
            if (found) return true
            return false
        }
    }
}
