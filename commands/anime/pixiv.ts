import {Message} from "discord.js"
import {Command} from "../../structures/Command"
import {Functions} from "./../../structures/Functions"
import {Kisaragi} from "./../../structures/Kisaragi"
import {Permission} from "./../../structures/Permission"
import {PixivApi} from "./../../structures/PixivApi"

export default class Pixiv extends Command {
    constructor(discord: Kisaragi, message: Message) {
        super(discord, message, {
            description: "Searches for anime images on pixiv.",
            help:
            `
            _Note:_ Add the tag \`all\` to remove the bookmark filter.
            \`pixiv\` - Gets a pixiv image with some defaults.
            \`pixiv link/id\` - Gets the pixiv or ugoira image from the link.
            \`pixiv tag\` - Gets a pixiv image with the tag (translated to japanese).
            \`pixiv en tag\` - Gets a pixiv image with the tag (not translated).
            \`pixiv popular\` - Gets a pixiv image from the daily rankings.
            \`pixiv r18 tag\` - Gets an R-18 pixiv image from the tag (translated to japanese).
            \`pixiv r18 en tag\` - Gets an R-18 pixiv image from the tag (not translated).
            \`pixiv r18 popular\` - Gets a random image from the R-18 daily rankings.
            \`pixiv download/dl query\` - Downloads images on pixiv and uploads the zip file.
            \`pixiv r18 download/dl query\` - Downloads R-18 images and uploads the zip file.
            `,
            examples:
            `
            \`=>pixiv\`
            \`=>pixiv azur lane\`
            \`=>pixiv download black tights\`
            \`=>pixiv r18 sagiri izumi\`
            \`=>pixiv r18 megumin\`
            \`=>pixiv r18 popular\`
            `,
            aliases: ["p"],
            random: "none",
            cooldown: 60
        })
    }

    public run = async (args: string[]) => {
        const discord = this.discord
        const message = this.message
        const pixivApi = new PixivApi(discord, message)
        const perms = new Permission(discord, message)

        const loading = message.channel.lastMessage
        loading?.delete()

        const tags = Functions.combineArgs(args, 1)

        if (tags.match(/\d\d\d+/g)) {
            await pixivApi.getPixivImageID(String(tags.match(/\d+/g)))
            return
        }

        if (args[1]?.toLowerCase() === "r18") {
            if (!perms.checkNSFW()) return
            if (args[2] === "en") {
                const r18Tags = Functions.combineArgs(args, 3)
                await pixivApi.getPixivImage(r18Tags, true, true)
                return
            } else if (args[2] === "popular") {
                await pixivApi.getPopularPixivR18Image()
                return
            } else if (args[2] === "download" || args[2] === "dl") {
                const r18Tags = Functions.combineArgs(args, 3)
                await pixivApi.downloadPixivImages(r18Tags, true)
                return
            } else {
                const r18Tags = Functions.combineArgs(args, 2)
                await pixivApi.getPixivImage(r18Tags, true)
                return
            }
        }

        if (args[1] === "en") {
            const enTags = Functions.combineArgs(args, 2)
            await pixivApi.getPixivImage(enTags, false, true)
            return
        } else if (args[1] === "download" || args[1] === "dl") {
            const tags = Functions.combineArgs(args, 2)
            await pixivApi.downloadPixivImages(tags)
            return
        } else if (args[1] === "popular") {
            await pixivApi.getPopularPixivImage()
            return
        }

        await pixivApi.getPixivImage()
    }
}
