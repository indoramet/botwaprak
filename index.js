const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const QRCode = require('qrcode');
const moment = require('moment');
const schedule = require('node-schedule');
require('dotenv').config();

// Inisialisasi Express
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Konfigurasi keamanan
const DELAY_BETWEEN_MESSAGES = 3000; // 3 detik delay antar pesan
const MAX_MESSAGES_PER_INTERVAL = 10; // maksimal 10 pesan per interval
const INTERVAL_RESET = 60000; // reset counter setiap 1 menit
const MESSAGE_QUEUE = [];
let messageCounter = 0;
let lastMessageTime = 0;

// Admin numbers configuration
const ADMIN_NUMBERS = [
    '6287781009836@c.us'
];

// Dynamic commands storage
const dynamicCommands = {
    laporan1: 'praktikum pertemuan pertama belum diadakan',
    laporan2: 'praktikum pertemuan kedua belum diadakan',
    laporan3: 'praktikum pertemuan ketiga belum diadakan',
    laporan4: 'praktikum pertemuan keempat belum diadakan',
    laporan5: 'praktikum pertemuan kelima belum diadakan',
    laporan6: 'praktikum pertemuan keenam belum diadakan',
    laporan7: 'praktikum pertemuan ketujuh belum diadakan',
    asistensi1: 'asistensi pertemuan pertama belum diadakan',
    asistensi2: 'asistensi pertemuan kedua belum diadakan',
    asistensi3: 'asistensi pertemuan ketiga belum diadakan',
    asistensi4: 'asistensi pertemuan keempat belum diadakan',
    asistensi5: 'asistensi pertemuan kelima belum diadakan',
    asistensi6: 'asistensi pertemuan keenam belum diadakan',
    asistensi7: 'asistensi pertemuan ketujuh belum diadakan',
    software: 'https://s.id/softwarepraktikum',
    template: 'https://s.id/templatebdX',
    asistensi: 'Untuk melihat jadwal asistensi gunakan command !asistensi1 sampai !asistensi7 sesuai dengan pertemuan yang ingin dilihat',
    tugasakhir: 'link tugas akhir belum tersedia',
    jadwal: 'https://s.id/kapanpraktikum',
    nilai: 'belum bang.',
    izin: 'Jika berhalangan hadir praktikum:\n1. Hubungi asisten praktikum melalui WhatsApp\n2. Berikan alasan yang jelas dan bukti pendukung (jika ada)\n3. Tunggu konfirmasi dari asisten\n4. Jika disetujui, anda akan dijadwalkan untuk praktikum susulan\n\nPenting:\n- Izin harus diajukan minimal 1 hari sebelum jadwal praktikum\n- Praktikum susulan hanya untuk alasan yang valid (sakit, kegiatan akademik, dll)\n- Ketidakhadiran tanpa izin akan mengurangi nilai'
};

// Scheduled messages storage
const scheduledMessages = new Map();

// Recurring messages storage
const recurringMessages = new Map();

// Fungsi untuk mengelola antrian pesan
const processMessageQueue = async () => {
    if (MESSAGE_QUEUE.length > 0 && Date.now() - lastMessageTime >= DELAY_BETWEEN_MESSAGES) {
        const { number, message, socket } = MESSAGE_QUEUE.shift();
        try {
            if (messageCounter < MAX_MESSAGES_PER_INTERVAL) {
                await client.sendMessage(number, message);
                messageCounter++;
                lastMessageTime = Date.now();
                socket.emit('broadcastStatus', {
                    success: true,
                    message: 'Pesan berhasil dikirim!'
                });
            } else {
                MESSAGE_QUEUE.unshift({ number, message, socket }); // Kembalikan ke antrian
                console.log('Rate limit reached, waiting...');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('broadcastStatus', {
                success: false,
                message: 'Gagal mengirim pesan. Pastikan nomor valid dan terdaftar di WhatsApp.'
            });
        }
    }
};

// Reset counter setiap interval
setInterval(() => {
    messageCounter = 0;
}, INTERVAL_RESET);

// Proses antrian setiap interval
setInterval(processMessageQueue, DELAY_BETWEEN_MESSAGES);

// Inisialisasi client WhatsApp dengan pengaturan keamanan
const isRailway = process.env.RAILWAY_STATIC_URL !== undefined;

const clientConfig = {
    authStrategy: new LocalAuth({
        dataPath: isRailway ? '/tmp/.wwebjs_auth' : './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--ignore-certificate-errors',
            '--ignore-certificate-errors-spki-list',
            '--allow-running-insecure-content'
        ],
        executablePath: isRailway ? '/usr/bin/google-chrome-stable' : undefined,
        timeout: 100000,
        defaultViewport: {
            width: 1920,
            height: 1080
        }
    },
    qrMaxRetries: 5,
    authTimeoutMs: 60000,
    restartOnAuthFail: true
};

const client = new Client(clientConfig);

// Menyimpan socket yang aktif
let activeSocket = null;

// Event saat client socket terhubung
io.on('connection', (socket) => {
    console.log('Web client connected');
    activeSocket = socket;

    // Handle broadcast request dengan rate limiting
    socket.on('broadcast', async (data) => {
        const { target, message } = data;
        // Format nomor telepon
        const formattedNumber = target.includes('@c.us') ? target : `${target}@c.us`;
        
        // Tambahkan ke antrian pesan
        MESSAGE_QUEUE.push({
            number: formattedNumber,
            message,
            socket
        });
    });

    socket.on('disconnect', () => {
        console.log('Web client disconnected');
        if (activeSocket === socket) {
            activeSocket = null;
        }
    });
});

// Event saat QR code tersedia untuk di scan
client.on('qr', async (qr) => {
    console.log('QR RECEIVED');
    try {
        const qrImage = await QRCode.toDataURL(qr);
        io.emit('qr', `<img src="${qrImage}" alt="QR Code" />`);
    } catch (err) {
        console.error('Error generating QR code:', err);
    }
});

// Event saat client siap
client.on('ready', () => {
    console.log('Client is ready!');
    io.emit('ready');
});

// Event saat autentikasi berhasil
client.on('authenticated', () => {
    console.log('Authenticated');
    io.emit('authenticated');
});

// Map untuk menyimpan waktu pesan terakhir dari setiap pengirim
const lastUserMessage = new Map();

// Event saat menerima pesan dengan rate limiting
client.on('message', async msg => {
    const now = Date.now();
    const lastTime = lastUserMessage.get(msg.from) || 0;
    
    // Minimal 2 detik delay antara respons ke pengguna yang sama
    if (now - lastTime < 2000) {
        console.log('Rate limiting response to:', msg.from);
        return;
    }

    // Update waktu pesan terakhir
    lastUserMessage.set(msg.from, now);

    // Kirim pesan ke web interface untuk ditampilkan di log
    if (activeSocket) {
        activeSocket.emit('message', {
            from: msg.from,
            body: msg.body,
            time: moment().format('HH:mm:ss')
        });
    }

    const command = msg.body.toLowerCase();
    const isAdmin = ADMIN_NUMBERS.includes(msg.from);

    // Handle pertanyaan umum dengan delay
    setTimeout(async () => {
        try {
            // Cek apakah pesan dari grup
            const chat = await msg.getChat();
            
            // Admin commands
            if (isAdmin) {
                // Set dynamic command
                if (command.startsWith('!setcmd ')) {
                    const [, cmdName, ...cmdValueArr] = msg.body.split(' ');
                    const cmdValue = cmdValueArr.join(' ');
                    if (cmdName && cmdValue) {
                        dynamicCommands[cmdName.toLowerCase()] = cmdValue;
                        await msg.reply(`Command ${cmdName} has been set to: ${cmdValue}`);
                        return;
                    }
                }
                
                // Schedule message
                else if (command.startsWith('!schedule ')) {
                    const [, time, target, ...messageArr] = msg.body.split(' ');
                    const message = messageArr.join(' ');
                    
                    if (time && target && message) {
                        try {
                            const job = schedule.scheduleJob(time, async function() {
                                try {
                                    const formattedNumber = target.includes('@c.us') ? target : `${target}@c.us`;
                                    await client.sendMessage(formattedNumber, message);
                                    scheduledMessages.delete(job.name);
                                } catch (err) {
                                    console.error('Error sending scheduled message:', err);
                                }
                            });
                            
                            if (job) {
                                scheduledMessages.set(job.name, {
                                    time,
                                    target,
                                    message
                                });
                                await msg.reply(`Message scheduled for ${time} to ${target}`);
                            } else {
                                await msg.reply('Invalid schedule format. Use format: "!schedule YYYY-MM-DD HH:mm:ss number message"');
                            }
                        } catch (err) {
                            await msg.reply('Error scheduling message. Please check the format and try again.');
                        }
                        return;
                    }
                }
                
                // List scheduled messages
                else if (command === '!listschedule') {
                    let response = 'Scheduled messages:\n';
                    for (const [jobName, details] of scheduledMessages) {
                        response += `\n${jobName}:\nTime: ${details.time}\nTarget: ${details.target}\nMessage: ${details.message}\n`;
                    }
                    await msg.reply(response || 'No scheduled messages');
                    return;
                }
                
                // Cancel scheduled message
                else if (command.startsWith('!cancelschedule ')) {
                    const jobName = msg.body.split(' ')[1];
                    const job = schedule.scheduledJobs[jobName];
                    if (job) {
                        job.cancel();
                        scheduledMessages.delete(jobName);
                        await msg.reply(`Scheduled message ${jobName} has been cancelled`);
                    } else {
                        await msg.reply('Schedule not found');
                    }
                    return;
                }
                
                // List all dynamic commands
                else if (command === '!listcmd') {
                    let response = 'Dynamic commands:\n';
                    for (const [cmd, value] of Object.entries(dynamicCommands)) {
                        response += `\n!${cmd}: ${value}`;
                    }
                    await msg.reply(response);
                    return;
                }
                
                // Delete dynamic command
                else if (command.startsWith('!delcmd ')) {
                    const cmdName = msg.body.split(' ')[1].toLowerCase();
                    if (dynamicCommands[cmdName]) {
                        delete dynamicCommands[cmdName];
                        await msg.reply(`Command ${cmdName} has been deleted`);
                    } else {
                        await msg.reply('Command not found');
                    }
                    return;
                }

                // Schedule recurring message
                else if (command.startsWith('!schedulerec ')) {
                    const [, pattern, target, ...messageArr] = msg.body.split(' ');
                    const message = messageArr.join(' ');
                    
                    if (pattern && target && message) {
                        try {
                            const job = schedule.scheduleJob(pattern, async function() {
                                try {
                                    const formattedNumber = target.includes('@c.us') ? target : `${target}@c.us`;
                                    await client.sendMessage(formattedNumber, message);
                                } catch (err) {
                                    console.error('Error sending recurring message:', err);
                                }
                            });
                            
                            if (job) {
                                recurringMessages.set(job.name, {
                                    pattern,
                                    target,
                                    message
                                });
                                await msg.reply(`Recurring message scheduled with pattern ${pattern} to ${target}`);
                            } else {
                                await msg.reply('Invalid schedule pattern. Use cron pattern format (e.g. "0 8 * * *" for daily 8 AM)');
                            }
                        } catch (err) {
                            await msg.reply('Error scheduling recurring message. Please check the format and try again.');
                        }
                        return;
                    }
                }

                // List recurring messages
                else if (command === '!listrec') {
                    let response = 'Recurring messages:\n';
                    for (const [jobName, details] of recurringMessages) {
                        response += `\n${jobName}:\nPattern: ${details.pattern}\nTarget: ${details.target}\nMessage: ${details.message}\n`;
                    }
                    await msg.reply(response || 'No recurring messages');
                    return;
                }

                // Cancel recurring message
                else if (command.startsWith('!cancelrec ')) {
                    const jobName = msg.body.split(' ')[1];
                    const job = schedule.scheduledJobs[jobName];
                    if (job) {
                        job.cancel();
                        recurringMessages.delete(jobName);
                        await msg.reply(`Recurring message ${jobName} has been cancelled`);
                    } else {
                        await msg.reply('Recurring schedule not found');
                    }
                    return;
                }

                // Broadcast to multiple numbers
                else if (command.startsWith('!broadcast ')) {
                    const [, ...messageArr] = msg.body.split(' ');
                    const message = messageArr.join(' ');
                    
                    if (message) {
                        const media = await msg.getMedia();
                        const numbers = await msg.getChat().then(chat => chat.participants.map(p => p.id._serialized));
                        
                        let successCount = 0;
                        let failCount = 0;
                        
                        for (const number of numbers) {
                            try {
                                if (media) {
                                    await client.sendMessage(number, media, { caption: message });
                                } else {
                                    await client.sendMessage(number, message);
                                }
                                successCount++;
                                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES));
                            } catch (err) {
                                console.error(`Error broadcasting to ${number}:`, err);
                                failCount++;
                            }
                        }
                        
                        await msg.reply(`Broadcast complete!\nSuccess: ${successCount}\nFailed: ${failCount}`);
                        return;
                    }
                }

                // Admin help command
                else if (command === '!adminhelp') {
                    const adminCommands = `Admin Commands:
!setcmd <command> <value> - Set/update dynamic command
!delcmd <command> - Delete dynamic command
!listcmd - List all dynamic commands
!schedule <time> <target> <message> - Schedule one-time message
!schedulerec <pattern> <target> <message> - Schedule recurring message
!listschedule - List scheduled messages
!listrec - List recurring messages
!cancelschedule <jobName> - Cancel scheduled message
!cancelrec <jobName> - Cancel recurring message
!broadcast <message> - Broadcast message to all group members

Schedule pattern examples:
- "0 8 * * *" - Every day at 8 AM
- "0 */2 * * *" - Every 2 hours
- "0 8,12,15 * * *" - Every day at 8 AM, 12 PM, and 3 PM
- "0 8 * * 1-5" - Every weekday at 8 AM`;
                    
                    await msg.reply(adminCommands);
                    return;
                }
            }

            // Regular commands (existing code)
            if (!chat.isGroup || (chat.isGroup && msg.mentionedIds.includes(client.info.wid._serialized))) {
                // Check dynamic commands first
                if (command.startsWith('!') && dynamicCommands[command.substring(1)]) {
                    await msg.reply(dynamicCommands[command.substring(1)]);
                    
                    // Special handling for !izin command - send sticker
                    if (command === '!izin') {
                        try {
                            const stickerPath = path.join(__dirname, 'assets', 'izin.jpeg');
                            const media = MessageMedia.fromFilePath(stickerPath);
                            await client.sendMessage(msg.from, media, { sendMediaAsSticker: true });
                        } catch (err) {
                            console.error('Error sending sticker:', err);
                        }
                    }
                    return;
                }

                // Hanya respons jika mention bot atau pesan pribadi
                if (!chat.isGroup || (chat.isGroup && msg.mentionedIds.includes(client.info.wid._serialized))) {
                    if (command === '!jadwal' || command === 'kapan praktikum?') {
                        await msg.reply(dynamicCommands.jadwal);
                    }
                    else if (command === '!nilai' || command === 'nilai praktikum?') {
                        await msg.reply(dynamicCommands.nilai);
                    }
                    else if (command === '!sesi' || command === 'sesi praktikum?') {
                        await msg.reply('Praktikum sesi satu : 15:15 - 16:05\nPraktikum sesi dua : 16:10 - 17:00\nPraktikum sesi tiga : 20:00 - 20:50');
                    }
                    else if (command === '!laporan' || command === 'bagaimana cara upload laporan?') {
                        await msg.reply('Untuk mengupload laporan:\n1. ubah file word laporan menjadi pdf\n2. cek link upload laporan sesuai dengan pertemuan ke berapa command contoh !laporan1\n3. klik link upload laporan\n4. upload laporan\n5. Tunggu sampai kelar\nJANGAN SAMPAI MENGUMPULKAN LAPORAN TERLAMBAT -5%!!!');
                }
                else if (command === '!help' || command === '!bantuan') {
                    await msg.reply(`Daftar perintah yang tersedia:
!jadwal - Informasi jadwal praktikum
!laporan - Cara upload laporan
!sesi - Informasi sesi praktikum
!nilai - Informasi nilai praktikum
!izin - Informasi izin tidak hadir praktikum
!asistensi - Informasi jadwal asistensi
!software - Link download software praktikum
!template - Link template laporan
!tugasakhir - Informasi tugas akhir
!laporan1 sampai !laporan7 - Link upload laporan per pertemuan
!asistensi1 sampai !asistensi7 - Jadwal asistensi per pertemuan`);
                }
            } else if (chat.isGroup && command.startsWith('!')) {
                // Jika di grup tapi tidak di-mention, beri tahu cara menggunakan bot
                await msg.reply('Untuk menggunakan bot di grup, mohon mention bot terlebih dahulu.\nContoh: @bot !help');
                }
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }, Math.random() * 1000 + 1000); // Random delay 1-2 detik
});

// Event saat ada error
client.on('auth_failure', msg => {
    console.error('Authentication failure:', msg);
    if (activeSocket) {
        activeSocket.emit('error', 'Authentication failed. Please scan the QR code again.');
    }
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason);
    if (activeSocket) {
        activeSocket.emit('disconnected', 'WhatsApp disconnected. Please refresh the page.');
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Route untuk halaman utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Mulai server pada port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

// Inisialisasi koneksi WhatsApp
console.log('Starting WhatsApp client initialization...');
console.log('Running on Railway:', isRailway);
client.initialize().catch(err => {
    console.error('Failed to initialize WhatsApp client:', err);
}); 