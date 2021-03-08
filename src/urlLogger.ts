import config from "@/config.json";

console.log(config.discordConnection.redirectUrl.split(" ").join(encodeURI(document.URL)));