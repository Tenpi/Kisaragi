import axios from "axios"
import {Collection, Message, MessageEmbed, MessageReaction, StreamDispatcher, User, VoiceConnection} from "discord.js"
import fs from "fs"
import path from "path"
import {FFmpeg} from "prism-media"
import Soundcloud, {SoundCloudTrack} from "soundcloud.ts"
import {WaveFile} from "wavefile"
import Youtube from "youtube.ts"
import * as defaults from "./../assets/json/defaultSongs.json"
import {Embeds} from "./Embeds"
import {Functions} from "./Functions"
import {Kisaragi} from "./Kisaragi"
import {Video} from "./Video"

const numMap = {
    1: [0, 3, 6, 9, 12, 15],
    2: [1, 4, 7, 10, 13, 16],
    3: [2, 5, 8, 11, 14, 17]
}

const queues = new Collection()

export class Audio {
    private readonly wav = require("wav")
    private readonly lame = require("@suldashi/lame")
    private readonly video = new Video(this.discord, this.message)
    private readonly youtube = new Youtube(process.env.GOOGLE_API_KEY!)
    private readonly soundcloud = new Soundcloud(process.env.SOUNDCLOUD_CLIENT_ID)
    private readonly embeds = new Embeds(this.discord, this.message)
    constructor(private readonly discord: Kisaragi, private readonly message: Message) {}

    public init = (remove?: boolean) => {
        if (remove) Functions.removeDirectory(`./tracks/transform`)
        if (!fs.existsSync(`./tracks/transform`)) fs.mkdirSync(`./tracks/transform`, {recursive: true})
    }

    public convertToWav = async (filepath: string) => {
        const filename = path.basename(filepath).slice(0, -4)
        this.init()
        const newDest = `./tracks/transform/${filename}.wav`
        const input = fs.createReadStream(filepath)
        const output = fs.createWriteStream(newDest)
        const ffmpeg = new FFmpeg({args: ["-i", filepath, newDest]})
        ffmpeg.pipe(output)
        await Functions.awaitStream(input, output)
        return newDest
    }

    public convertToMp3 = async (filepath: string) => {
        const filename = path.basename(filepath).slice(0, -4)
        const newDest = `./tracks/transform/${filename}.mp3`
        this.init()
        const input = fs.createReadStream(filepath)
        const output = fs.createWriteStream(newDest)
        const ffmpeg = new FFmpeg({args: ["-i", filepath, newDest]})
        input.pipe(ffmpeg).pipe(output)
        await Functions.awaitStream(input, output)
        return newDest
    }

    public reverse = async (filepath: string) => {
        const filename = path.basename(filepath).slice(0, -4)
        this.init()
        const vidDest = await this.video.createImgVideo(filepath)
        const reverseDest = await this.video.reverseVideo(vidDest)
        const reverseAudio = await this.video.extractAudio(reverseDest)
        console.log(reverseAudio)
        await this.play(reverseAudio)
    }

    public getWaveData = (header: Float64Array) => {
        let littleEndian = false
        let bitDepth = 2
        let channels = 2
        let sampleRate = 44100
        if (header.slice(0, 4).join("") === "RIFF") {
            littleEndian = true
        }
        if (littleEndian) {
            bitDepth = Number(`${header[35]}${header[34]}`)
            channels = Number(`${header[23]}${header[22]}`)
            sampleRate = Number(`${header[27]}${header[26]}${header[25]}${header[24]}`)
        } else {
            bitDepth = Number(`${header[34]}${header[35]}`)
            channels = Number(`${header[22]}${header[23]}`)
            sampleRate = Number(`${header[24]}${header[25]}${header[26]}${header[27]}`)
        }
        const byteDepth = (bitDepth) / 4
        return {byteDepth, bitDepth, sampleRate, channels}
    }

    public getQueue = () => {
        if (queues.has(this.message.guild?.id)) {
            return queues.get(this.message.guild?.id)
        } else {
            queues.set(this.message.guild?.id, [])
            return []
        }
    }

    public queueAdd = async (link: string, file: string) => {
        const discord = this.discord
        let kind: "youtube" | "soundcloud" | "link"
        const queueObj = {
            title: "None",
            author: "None",
            url: "None",
            image: "",
            duration: "None",
            requester: "None",
            details: "None",
            file: "None",
            playing: false,
            looping: false
        }
        if (link?.match(/youtube.com|youtu.be/)) {
            const info = await this.youtube.videos.get(link)
            const image = info.snippet.thumbnails.maxres?.url ?? info.snippet.thumbnails.high.url
            const title = info.snippet.title
            const channel = info.snippet.channelTitle
            const duration = this.parseYTDuration(info.contentDetails.duration)
            const url = `https://www.youtube.com/watch?v=${info.id}`
            const details = `${discord.getEmoji("star")}_Title:_ [**${title}**](${url})\n` +
            `${discord.getEmoji("star")}_Channel:_ **${channel}**\n` +
            `${discord.getEmoji("star")}_Duration:_ \`${duration}\`\n` +
            `_Added by ${this.message.author.tag}_`
            kind = "youtube"
            queueObj.title = title
            queueObj.author = channel
            queueObj.url = url
            queueObj.image = image
            queueObj.duration = duration
            queueObj.requester = this.message.author.tag
            queueObj.details = details
        } else if (link?.match(/soundcloud.com/)) {
            const info = await this.soundcloud.tracks.get(link) as SoundCloudTrack
            const image = info.artwork_url
            const title = info.title
            const artist = info.user.username
            const duration = this.parseSCDuration(info.duration)
            const url = info.permalink_url
            const details = `${discord.getEmoji("star")}_Title:_ [**${title}**](${url})\n` +
            `${discord.getEmoji("star")}_Artist:_ **${artist}**\n` +
            `${discord.getEmoji("star")}_Duration:_ \`${duration}\`\n` +
            `_Added by ${this.message.author.tag}_`
            kind = "soundcloud"
            queueObj.title = title
            queueObj.author = artist
            queueObj.url = url
            queueObj.image = image
            queueObj.duration = String(duration)
            queueObj.requester = this.message.author.tag
            queueObj.details = details
        } else {
            const details = `${discord.getEmoji("star")}_Link:_ ${link}\n`
            kind = "link"
            queueObj.title = link
            queueObj.url = link
            queueObj.details = details
        }
        queueObj.file = file
        const queue = this.getQueue() as any
        const pos = queue.push(queueObj)
        console.log(queue)
        const topImg = kind === "youtube" ? "https://cdn4.iconfinder.com/data/icons/social-media-2210/24/Youtube-512.png" :
        (kind === "soundcloud" ? "https://i1.sndcdn.com/avatars-000681921569-32qkcn-t500x500.jpg" : "https://clipartmag.com/images/musical-notes-png-11.png")
        const queueEmbed = this.embeds.createEmbed()
        queueEmbed
        .setAuthor(`${kind}`, topImg)
        .setTitle(`**Song Request** ${discord.getEmoji("aquaUp")}`)
        .setURL(queueObj.url)
        .setThumbnail(queueObj?.image ?? "")
        .setDescription(`Added a new song to position **${pos}** in the queue!\n${queueObj.details}`)
        return queueEmbed
    }

    public next = () => {
        const queue = this.getQueue() as any
        const file = queue[0]?.file
        if (!file) return null
        return file
    }

    public pause = () => {
        const connection = this.message.guild?.voice?.connection
        if (!connection) return
        const player = connection.dispatcher
        player.pause(true)
        return true
    }

    public resume = () => {
        const connection = this.message.guild?.voice?.connection
        if (!connection) return
        const player = connection.dispatcher
        player.resume()
        return true
    }

    public volume = (num: number) => {
        if (num < 0 || num > 1000) return this.message.reply("The volume must be between 0 and 1000.")
        const connection = this.message.guild?.voice?.connection
        if (!connection) return
        const player = connection.dispatcher
        player.setVolumeLogarithmic(num/100.0)
        return true
    }

    public nowPlaying = async () => {
        const player = this.message.guild?.voice?.connection?.dispatcher
        const discord = this.discord
        const queue = this.getQueue() as any
        if (!queue) return "It looks like you aren't playing anything..."
        const now = queue[0]
        let loopText = ""
        if (now.looping === true) loopText = `_This song is in loop mode ${discord.getEmoji("aquaUp")}\nTo exit, use_ \`loop\` _or_ \`skip\`.\n`
        const nowEmbed = this.embeds.createEmbed()
        nowEmbed
        .setAuthor("playing", "https://clipartmag.com/images/musical-notes-png-11.png")
        .setTitle(`**Now Playing** ${discord.getEmoji("chinoSmug")}`)
        .setURL(now.url)
        .setThumbnail(now.image ?? "")
        .setDescription(`${loopText}${now.details}\n_You have been playing music for \`${this.parseSCDuration(Number(player?.streamTime))}\`._`)
        const msg = await this.message.channel.send(nowEmbed)
        const reactions = ["pause", "resume", "scrub", "loop", "skip", "reverse", "timestretch", "volume", "eq"]
        for (let i = 0; i < reactions.length; i++) await msg.react(discord.getEmoji(reactions[i]))
        const resumeCheck = (reaction: MessageReaction, user: User) => reaction.emoji === this.discord.getEmoji("resume") && user.bot === false
        const pauseCheck = (reaction: MessageReaction, user: User) => reaction.emoji === this.discord.getEmoji("pause") && user.bot === false
        const scrubCheck = (reaction: MessageReaction, user: User) => reaction.emoji === this.discord.getEmoji("scrub") && user.bot === false
        const skipCheck = (reaction: MessageReaction, user: User) => reaction.emoji === this.discord.getEmoji("skip") && user.bot === false
        const loopCheck = (reaction: MessageReaction, user: User) => reaction.emoji === this.discord.getEmoji("loop") && user.bot === false
        const reverseCheck = (reaction: MessageReaction, user: User) => reaction.emoji === this.discord.getEmoji("reverse") && user.bot === false
        const timestretchCheck = (reaction: MessageReaction, user: User) => reaction.emoji === this.discord.getEmoji("timestretch") && user.bot === false
        const volumeCheck = (reaction: MessageReaction, user: User) => reaction.emoji === this.discord.getEmoji("volume") && user.bot === false
        const eqCheck = (reaction: MessageReaction, user: User) => reaction.emoji === this.discord.getEmoji("eq") && user.bot === false

        const resume = msg.createReactionCollector(resumeCheck)
        const pause = msg.createReactionCollector(pauseCheck)
        const scrub = msg.createReactionCollector(scrubCheck)
        const skip = msg.createReactionCollector(skipCheck)
        const loop = msg.createReactionCollector(loopCheck)
        const reverse = msg.createReactionCollector(reverseCheck)
        const timestretch = msg.createReactionCollector(timestretchCheck)
        const volume = msg.createReactionCollector(volumeCheck)
        const eq = msg.createReactionCollector(eqCheck)
        const reactors = [pause, resume, scrub, loop, skip, reverse, timestretch, volume, eq]
        for (let i = 0; i < reactors.length; i++) {
            reactors[i].on("collect", async (reaction, user) => {
                await reaction.users.remove(user)
                return this[reactions[i]]()
            })
        }

    }

    public download = async (song: string) => {
        let file = ""
        if (song?.match(/youtube.com|youtu.be/)) {
            file = await this.youtube.util.downloadMP3(song, "./tracks")
        } else if (song?.match(/soundcloud.com/)) {
            file = await this.soundcloud.util.downloadTrack(song, "./tracks")
        } else {
            let name = song.split("#").shift()?.split("?").shift()?.split("/").pop()
            name = name?.match(/.(mp3|wav|ogg|webm)/) ? name : name + ".mp3"
            if (name === ".mp3") name = "noname.mp3"
            const data = await axios.get(song, {responseType: "arraybuffer"}).then((r) => r.data)
            const dest = `./tracks/${name}`
            fs.writeFileSync(dest, Buffer.from(data, "binary"))
            file = dest
        }
        return file
    }

    public play = async (file: string, loop?: boolean) => {
        const connection = this.message.guild?.voice?.connection
        if (!connection) return
        let player = connection.dispatcher
        if (!player) {
            player = connection.play(file)
        } else {
            connection?.play(file)
        }
        player.setBitrate(128)
        player.setFEC(false)
        if (player.paused) player.resume()
        const queue = this.getQueue() as any
        queue[0].playing = true

        player.on("finish", async () => {
            const queue = this.getQueue() as any
            console.log(queue)
            let next: string
            if (queue[0]?.looping === true) {
                next = file
            } else {
                queue.shift()
                next = this.next()
            }
            if (next) {
                await this.play(next)
                const nowPlaying = await this.nowPlaying()
                if (nowPlaying) await this.message.channel.send(nowPlaying)
            } else {
                const defSong = defaults.songs[Math.floor(Math.random()*defaults.songs.length)]
                const file = await this.download(defSong)
                await this.queueAdd(defSong, file)
                await this.play(file)
                const nowPlaying = await this.nowPlaying()
                if (nowPlaying) await this.message.channel.send(nowPlaying)
            }
        })
    }

    public skip = async (num?: number) => {
        let amount = num ? num : 1
        const queue = this.getQueue() as any
        if (amount > queue.length - 1) amount = queue.length - 1
        for (let i = 0; i < amount; i++) {
            queue.shift(num)
        }
        if (this.next()) {
            this.play(this.next())
            const nowPlaying = await this.nowPlaying()
            if (nowPlaying) await this.message.channel.send(nowPlaying)
        } else {
            const defSong = defaults.songs[Math.floor(Math.random()*defaults.songs.length)]
            const file = await this.download(defSong)
            await this.queueAdd(defSong, file)
            await this.play(file)
            const nowPlaying = await this.nowPlaying()
            if (nowPlaying) await this.message.channel.send(nowPlaying)
        }
    }

    public loop = () => {
        const queue = this.getQueue() as any
        console.log(queue[0]?.looping)
        if (queue?.[0]) {
            if (queue[0]?.looping === false) {
                queue[0]?.looping === true
            } else {
                queue[0]?.looping === false
            }
        }
    }

    public songPickerYT = async (query: string, first?: boolean) => {
        const discord = this.discord
        const message = this.message
        const embeds = new Embeds(discord, message)
        const results = await this.youtube.videos.search({q: query, maxResults: 15}).then((r) => r.items)
        const links = results.map((r) => `https://www.youtube.com/watch?v=${r.id.videoId}`)
        if (first) return links[0]
        const titles = results.map((r) => r.snippet.title)
        const images = results.map((r) => r.snippet.thumbnails.high.url)
        const songArray: MessageEmbed[] = []
        for (let i = 0; i < links.length; i+=3) {
            let description = ""
            for (let j = 0; j < 3; j++) {
                if (!titles[i+j]) break
                description += `${discord.getEmoji(`${j+1}n`)} => [**${titles[i+j]}**](${links[i+j]})\n`
            }
            const songEmbed = embeds.createEmbed()
            songEmbed
            .setAuthor("youtube", "https://cdn4.iconfinder.com/data/icons/social-media-2210/24/Youtube-512.png", "https://www.youtube.com/")
            .setTitle(`**Youtube Search** ${discord.getEmoji("vigneXD")}`)
            .setThumbnail(images[i])
            .setDescription(description)
            .setFooter(`Page ${Math.floor(i/3) + 1}/${Math.ceil(links.length / 3)}`, message.author.displayAvatarURL({format: "png", dynamic: true}))
            songArray.push(songEmbed)
        }
        return this.playReactionEmbed(songArray, links)
    }

    public songPickerSC = async (query: string, first?: boolean) => {
        const discord = this.discord
        const message = this.message
        const embeds = new Embeds(discord, message)
        const results = await this.soundcloud.tracks.search({q: query})
        const links = results.map((r) => r.permalink_url)
        if (first) return links[0]
        const titles = results.map((r) => r.title)
        const images = results.map((r) => r.artwork_url)
        const songArray: MessageEmbed[] = []
        for (let i = 0; i < links.length; i+=3) {
            let description = ""
            for (let j = 0; j < 3; j++) {
                if (!titles[i+j]) break
                description += `${discord.getEmoji(`${j+1}n`)} => [**${titles[i+j]}**](${links[i+j]})\n`
            }
            const songEmbed = embeds.createEmbed()
            songEmbed
            .setAuthor("soundcloud", "https://i1.sndcdn.com/avatars-000681921569-32qkcn-t500x500.jpg", "https://www.soundcloud.com/")
            .setTitle(`**Soundcloud Search** ${discord.getEmoji("vigneXD")}`)
            .setThumbnail(images[i])
            .setDescription(description)
            .setFooter(`Page ${Math.floor(i/3) + 1}/${Math.ceil(links.length / 3)}`, message.author.displayAvatarURL({format: "png", dynamic: true}))
            songArray.push(songEmbed)
        }
        return this.playReactionEmbed(songArray, links)
    }

    public playReactionEmbed = async (songArray: MessageEmbed[], links: string[]) => {
        const message = this.message
        const discord = this.discord
        if (!songArray[0]) return null
        const msg = await message.channel.send(songArray[0])
        const reactions = ["right", "left", "1n", "2n", "3n", "random"]
        await msg.react(discord.getEmoji(reactions[0]))
        await msg.react(discord.getEmoji(reactions[1]))
        await msg.react(discord.getEmoji(reactions[2]))
        if (links[1]) await msg.react(discord.getEmoji(reactions[3]))
        if (links[2]) await msg.react(discord.getEmoji(reactions[4]))
        await msg.react(discord.getEmoji(reactions[5]))
        const rightCheck = (reaction: MessageReaction, user: User) => reaction.emoji === this.discord.getEmoji("right") && user.bot === false
        const leftCheck = (reaction: MessageReaction, user: User) => reaction.emoji === this.discord.getEmoji("left") && user.bot === false
        const oneCheck = (reaction: MessageReaction, user: User) => reaction.emoji === this.discord.getEmoji("1n") && user.bot === false
        const twoCheck = (reaction: MessageReaction, user: User) => reaction.emoji === this.discord.getEmoji("2n") && user.bot === false
        const threeCheck = (reaction: MessageReaction, user: User) => reaction.emoji === this.discord.getEmoji("3n") && user.bot === false
        const randomCheck = (reaction: MessageReaction, user: User) => reaction.emoji === this.discord.getEmoji("random") && user.bot === false

        const right = msg.createReactionCollector(rightCheck)
        const left = msg.createReactionCollector(leftCheck)
        const one = msg.createReactionCollector(oneCheck)
        const two = msg.createReactionCollector(twoCheck)
        const three = msg.createReactionCollector(threeCheck)
        const random = msg.createReactionCollector(randomCheck)
        const numCollectors = [one, two, three]

        let page = 0
        left.on("collect", async (reaction: MessageReaction, user: User) => {
            if (page === 0) {
                page = songArray.length - 1
            } else {
                page--
            }
            msg.edit(songArray[page])
            await reaction.users.remove(user)
        })
        right.on("collect", async (reaction: MessageReaction, user: User) => {
            if (page === songArray.length - 1) {
                page = 0
            } else {
                page++
            }
            msg.edit(songArray[page])
            await reaction.users.remove(user)
        })
        let finalLink = ""
        await new Promise((resolve) => {
            for (let i = 0; i < numCollectors.length; i++) {
                numCollectors[i].on("collect", async (reaction: MessageReaction, user: User) => {
                    const link = links[numMap[i+1][page]]
                    numCollectors.forEach((c) => c.stop())
                    await reaction.users.remove(user)
                    finalLink = link
                    resolve()
                })
            }
            random.on("collect", async (reaction: MessageReaction, user: User) => {
                const rand = Math.floor(Math.random()*links.length)
                random.stop()
                await reaction.users.remove(user)
                finalLink = links[rand]
                resolve()
            })
        })
        return finalLink
    }

    public parseYTDuration = (duration: string) => {
        const matches = duration.match(/[0-9]+[HMS]/g)
        if (!matches) return "0:00"
        let hours = "0"
        let minutes = "00"
        let seconds = "00"
        matches.forEach(function(part) {
            const unit = part.charAt(part.length-1)
            const amount = String(parseInt(part.slice(0, -1), 10))
            switch (unit) {
                case "H":
                    hours = amount
                    break
                case "M":
                    minutes = amount
                    break
                case "S":
                    seconds = Number(amount) < 10 ? `0${amount}` : amount
                    break
                default:
            }
        })

        const text = `${hours === "0" ? "" : `${hours}:`}${minutes}:${seconds}`
        return text
    }

    public parseSCDuration(duration: number) {
        duration = Number(duration)
        let seconds = Math.floor((duration / 1000) % 60) as any
        let minutes = Math.floor((duration / (1000 * 60)) % 60) as any
        let hours = Math.floor((duration / (1000 * 60 * 60)) % 24) as any

        hours = (hours === 0) ? "" : ((hours < 10) ? "0" + hours + ":" : hours + ":")
        minutes = (minutes < 10) ? "0" + minutes : minutes
        seconds = (seconds < 10) ? "0" + seconds : seconds
        return `${hours}${minutes}:${seconds}`
    }
}
