import {Message, Permissions, PermissionString, Role, TextChannel} from "discord.js"
import * as config from "../assets/json/blacklist.json"
import {Kisaragi} from "./Kisaragi"
import {SQLQuery} from "./SQLQuery"

export class Permission {
    private readonly sql = new SQLQuery(this.message)
    constructor(private readonly discord: Kisaragi, private readonly message: Message) {}

    /** Check Mod */
    public checkMod = async (ignore?: boolean) => {
        if (this.message.author.id === process.env.OWNER_ID) return true
        if (this.message.author.id === this.discord.user!.id) return true
        const mod = await this.sql.fetchColumn("special roles", "mod role")
        if (!mod) {
            if (ignore) return false
            this.message.reply("In order to use moderator commands, you must first " +
            "configure the server's moderator role using the **mod** command!")
            return false
        } else {
            const modRole = this.message.member!.roles.cache.find((r: Role) => r.id === String(mod))
            if (!modRole) {
                if (ignore) return false
                this.message.reply("In order to use moderator commands, you must have " +
                `the mod role which is currently set to <@&${mod}>!`)
                return false
            } else {
                return true
            }
        }
    }

    /** Check Admin */
    public checkAdmin = async (ignore?: boolean) => {
        if (this.message.author.id === process.env.OWNER_ID) return true
        if (this.message.author.id === this.discord.user!.id) return true
        const admin = await this.sql.fetchColumn("special roles", "admin role")
        if (!admin) {
            if (ignore) return false
            this.message.reply("In order to use administrator commands, you must first " +
            "configure the server's administrator role using the **mod** command!")
            return false
        } else {
            const adminRole = this.message.member!.roles.cache.find((r: Role) => r.id === String(admin))
            if (!adminRole) {
                if (ignore) return false
                this.message.reply("In order to use administrator commands, you must have " +
                `the admin role which is currently set to <@&${admin}>!`)
                return false
            } else {
                return true
            }
        }
    }

    /** Check Bot Dev */
    public checkBotDev = () => {
        if (this.message.author.id === process.env.OWNER_ID) {
            return true
        } else {
            this.message.reply(`Sorry, only the bot developer can use bot developer commands. ${this.discord.getEmoji("sagiriBleh")}`)
            return false
        }
    }

    /** Check Permission */
    public checkPerm = (perm: string) => {
        if (this.message.author.id === process.env.OWNER_ID) return true
        perm = perm.toUpperCase().replace(/\s+/g, "_")
        const permission =  new Permissions(perm as PermissionString)
        if (this.message.member!.hasPermission(permission)) {
            return true
        } else {
            this.message.reply(`You must have the ${perm} permission in order to use this command.`)
            return false
        }
    }

    /** Check NSFW */
    public checkNSFW = (noMsg?: boolean) => {
        if (!this.message.guild) return true
        const channel = this.message.channel as TextChannel
        if (channel.nsfw) {
            return true
        } else {
            if (noMsg) return false
            this.message.reply(`You can only use this command in **NSFW channels**, pervert! ${this.discord.getEmoji("madokaLewd")}`)
            return false
        }
    }

    /** Booru content filter */
    public booruFilter = (tags: string) => {
        for (let i = 0; i < config.booru.length; i++) {
            if (tags.includes(config.booru[i])) return true
        }
        return false
    }

    /** Filter loli content */
    public loliFilter = (tags: string) => {
        if (this.message.guild?.ownerID === process.env.OWNER_ID) return false
        if (/loli/gi.test(tags) || /shota/gi.test(tags) || /lolicon/gi.test(tags) || /shotacon/gi.test(tags)) {
            return true
        } else {
            return false
        }
    }

    /** Continue temporary bans */
    public continueTempBans = async () => {
        let tempArr = await this.sql.redisGet(`${this.message.guild?.id}_tempban`)
        if (tempArr) {
            tempArr = JSON.parse(tempArr)
            for (let i = 0; i < tempArr.length; i++) {
                const current = tempArr[i]
                setInterval(async () => {
                    let newArr = await this.sql.redisGet(`${this.message.guild?.id}_tempban`)
                    newArr = JSON.parse(newArr)
                    const index = newArr.findIndex((i: any) => i.member === current.id)
                    const curr = newArr[index]
                    const time = Number(curr.time)-60000
                    if (time >= 0) clearInterval()
                    newArr[index] = {...curr, time}
                    await this.sql.redisSet(`${this.message.guild?.id}_tempban`, JSON.stringify(newArr))
                }, 60000)
                setTimeout(async () => {
                    await this.message.guild?.members.unban(current.id, current.reason)
                }, current.time)
            }
        }
    }
}
