import {Message} from "discord.js"
import {Command} from "../../structures/Command"
import {Permission} from "../../structures/Permission"
import {Embeds} from "./../../structures/Embeds"
import {Kisaragi} from "./../../structures/Kisaragi"

export default class Reload extends Command {
    constructor() {
        super({
            aliases: [],
            cooldown: 3
        })
    }

    public run = async (discord: Kisaragi, message: Message, args: string[]) => {
      const perms = new Permission(discord, message)
      const embeds = new Embeds(discord, message)

      if (!perms.checkBotDev()) return
      const reloadEmbed = embeds.createEmbed()
      const commandName = args[1]
      const commandDir = args[2]

      if (!args[1]) {
      return message.channel.send(reloadEmbed
      .setDescription(`Correct usage is =>reload (command) (dir)`))
    }

      delete require.cache[require.resolve(`../${commandDir}/${commandName}.js`)]

      require(`../${commandDir}/${commandName}.js`)
      message.channel.send(reloadEmbed
      .setDescription(`The command **${commandName}** has been reloaded!`))
  }
}
