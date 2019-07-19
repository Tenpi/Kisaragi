exports.run = async (client: any, message: any, args: string[]) => {

    const unbanEmbed: any = client.createEmbed();
    const perm: any = client.createPermission("BAN_MEMBERS");
    let reason = client.combineArgs(args, 2);

    if (message.member.hasPermission(perm)) {
        let user = message.mentions.users.first();
        if (!reason) {
            reason = "None provided!";
        }
        if (!user) {
            user = args[1];
        }
        
        await message.guild.unban(user, reason);
        unbanEmbed
        .setAuthor("unban", "https://discordemoji.com/assets/emoji/bancat.png")
        .setTitle(`**Member Unbanned** ${client.getEmoji("gabYes")}`)
        .setDescription(`${client.getEmoji("star")}_Successfully unbanned ${await client.fetchUser(user)} for reason:_ **${reason}**`);
        message.channel.send(unbanEmbed);
        
    } else {
        unbanEmbed
        .setDescription("You do not have the ban members permission!");
        message.channel.send(unbanEmbed);
        return;
    }
}