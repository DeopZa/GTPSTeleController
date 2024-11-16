const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const {
    exec
} = require('child_process');
const config = require("./config/config.json");
const token = config.token;

const bot = new TelegramBot(token, {
    polling: true
});

const menuItems = [
    '🟢 Start Server', '📊 Server Status', '📰 Edit news.txt', '📄 Read news.txt', '👥 View Players', '🔍 Get Players List', '💀 Rollback players', '☢ Rollback worlds'
];

const ITEMS_PER_ROW = 2;

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B'; // Bytes
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'; // KB
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'; // MB
    else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'; // GB
}

function CheckDatabase(directoryPath) {
    let totalSize = 0;
    let fileCount = 0;

    const files = fs.readdirSync(directoryPath);

    files.forEach(file => {
        const filePath = path.join(directoryPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
            fileCount++;
            totalSize += stats.size;
        }
    });

    return `Total: ${fileCount}\nSize: ${formatBytes(totalSize)}`
}

const isRunning = (query, cb) => {
    let platform = process.platform;
    let cmd = '';
    switch (platform) {
        case 'win32':
            cmd = `tasklist | findstr ${query}`;
            break;
        case 'darwin':
            cmd = `ps -ax | grep ${query}`;
            break;
        case 'linux':
            cmd = `ps -A`;
            break;
        default:
            break;
    }
    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            return cb(false);
        }
        cb(stdout.toLowerCase().includes(query.toLowerCase()));
    });
};

function createCustomKeyboard() {
    const keyboard = [];

    for (let i = 0; i < menuItems.length; i += ITEMS_PER_ROW) {
        const row = menuItems.slice(i, i + ITEMS_PER_ROW);
        keyboard.push(row);
    }

    return {
        reply_markup: {
            keyboard: keyboard,
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Please select an option:', createCustomKeyboard());
});
console.log('GTTeleController by DeopZa#0148\nedit aja lagi ngentot gw mau tidur!');
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    switch (true) {
        case (text === menuItems[0]):
            exec(`start "" "${config.exe_location}"`, (err, stdout, stderr) => {
                if (err) {
                    bot.sendMessage(chatId, `Error starting exe check your config.json`);
                    return;
                }
                if (stdout) console.log(stdout);
                if (stderr) console.error(stderr);
                bot.sendMessage(chatId, '🟢 Server started!');
            });
            break;

        case (text === menuItems[1]):
            isRunning(config.exe_location, (isRunningStatus) => {
                const stats = isRunningStatus ? "Online" : "Offline";
                fs.readFile(config.online_location, 'utf8', function read(err, onlinexd) {
                    if (err) {
                        return console.log("File not Found!")
                    }
                    const onlinecount = onlinexd;
                    bot.sendMessage(chatId, `📊 Server Status: ${stats}\n\nTotal Online Players: ${onlinecount}\n\n📊 Database Information:\n\n👥 Players ${CheckDatabase(config.players_location)}\n\n🌍 Worlds ${CheckDatabase(config.worlds_location)}\n\n🛡 Guilds ${CheckDatabase(config.guilds_location)}`);
                });
            });
            break;

        case (text === menuItems[2]):
            fs.readFile(config.news_location, 'utf8', (err, data) => {
                if (err) {
                    bot.sendMessage(chatId, 'Sorry, there was an error reading news.txt.');
                } else {
                    bot.sendMessage(chatId, `${data}`);
                    bot.sendMessage(chatId, '📰 Edit news.txt', {
                        reply_markup: {
                            inline_keyboard: [
                                [{
                                    text: 'Edit news.txt',
                                    callback_data: 'edit_news'
                                }]
                            ]
                        }
                    });
                }
            });
            break;

        case (text === menuItems[3]):
            fs.readFile(config.news_location, 'utf8', (err, data) => {
                if (err) {
                    bot.sendMessage(chatId, 'Sorry, there was an error reading news.txt.');
                } else {
                    bot.sendMessage(chatId, data);
                }
            });
            break;

        case (text === menuItems[4]):
            bot.sendMessage(chatId, '👥 View Players', {
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: 'Search player name',
                            callback_data: 'view_player'
                        }]
                    ]
                }
            });
            break;

        case (text === menuItems[5]):
            fs.readdir(config.players_location, (err, files) => {
                if (err) {
                    console.error('Error reading directory:', err);
                    return;
                }

                const PlayerList = files.map(file =>
                    path.join(config.players_location, file)
                    .replace('players\\', '')
                    .replace(/_/g, '')
                    .replace('.json', '')
                );

                const outputFilePath = path.join(__dirname, 'player_list.txt');
                const fileContent = `Player List:\n${PlayerList.join('\n')}`;

                fs.writeFile(outputFilePath, fileContent, (err) => {
                    if (err) {
                        console.error('Error writing to file:', err);
                        return;
                    }

                    bot.sendDocument(chatId, outputFilePath)
                        .then(() => {
                            console.log('Modified player list sent successfully!');
                        })
                        .catch((err) => {
                            console.error('Error sending document:', err);
                        });
                });
            });
            break;

        default:
            bot.sendMessage(chatId, 'Please select an option from the keyboard below.');
    }
});


bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const callbackData = callbackQuery.data;

    if (callbackData === 'edit_news') {
        bot.sendMessage(chatId, 'Please send the new content for news.txt:');

        bot.once('message', (msg) => {
            const newNewsContent = msg.text;

            fs.writeFile(config.news_location, newNewsContent, (err) => {
                if (err) {
                    bot.sendMessage(chatId, 'Failed to update news.txt. Please try again later.');
                } else {
                    bot.sendMessage(chatId, 'news.txt has been updated successfully! 📄');
                }
            })
        })
    } else if (callbackData == "view_player") {
        bot.sendMessage(chatId, 'Please send player name:');
        bot.once('message', (msg) => {
            const playerName = msg.text;
            fs.access(config.players_location + `/${playerName}_.json`, fs.F_OK, (err) => {
                if (err) {
                    return bot.sendMessage(chatId, "Player Not Found!")
                }

                var contents = fs.readFileSync(config.players_location + `/${playerName}_.json`);
                var playerDetails = JSON.parse(contents);
                let playerInfo = `👤 ${playerName}'s Information\n`;
                playerInfo += `💎 Gems: ${playerDetails.gems || 'N/A'}\n`;
                playerInfo += `📈 Level: ${playerDetails.level || 'N/A'}\n`;
                playerInfo += `📍 Ip Address: ${playerDetails.ip || 'N/A'}\n`;
                playerInfo += `🔑 2FA: ${playerDetails['2fa'] || 'N/A'}\n`;
                playerInfo += `🔐 Password: ${playerDetails.pass || 'N/A'}\n`;
                playerInfo += `✉ Email: ${playerDetails.email || 'N/A'}\n`;
                playerInfo += `🏡 Home World: ${playerDetails.home_world || 'N/A'}\n`;
                if (playerDetails.worlds_owned && playerDetails.worlds_owned.length > 0) {
                    playerInfo += `🌍 Worlds Owned: ${playerDetails.worlds_owned.join(', ')}\n`;
                } else {
                    playerInfo += `🌍 Worlds Owned: None\n`;
                }
                return bot.sendMessage(chatId, playerInfo);
            })
        })
    }
});
