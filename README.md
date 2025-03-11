# WhatsApp Bot for Lab Management

A WhatsApp bot built with whatsapp-web.js for managing lab practicum sessions, schedules, and communications.

## Features

- Dynamic command system
- Scheduled messages
- Recurring messages
- Group broadcast
- Admin controls
- Rate limiting and queue system
- Web interface for monitoring

## Deployment on Railway

1. Fork this repository
2. Create a new project on [Railway](https://railway.app/)
3. Connect your GitHub repository
4. Add the following environment variables in Railway:
   - `PORT`: The port for the web server (default: 3000)
   - Add any other environment variables from your .env file

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/indoramet/botwaprak.git
cd botwaprak
```

2. Install dependencies:
```bash
npm install
```

3. Create a .env file with your configuration:
```env
PORT=3000
```

4. Run the bot:
```bash
npm start
```

## Commands

### User Commands
- `!help` - Show all available commands
- `!jadwal` - Check practicum schedule
- `!laporan` - Get report submission guide
- `!sesi` - Check practicum session times
- `!nilai` - Check practicum grades
- `!izin` - Get information about attendance permissions
- `!asistensi` - Get assistance schedule
- `!software` - Get software download links
- `!template` - Get report template
- `!tugasakhir` - Get final project information

### Admin Commands
- `!adminhelp` - Show all admin commands
- `!setcmd <command> <value>` - Set/update dynamic command
- `!delcmd <command>` - Delete dynamic command
- `!listcmd` - List all dynamic commands
- `!schedule <time> <target> <message>` - Schedule one-time message
- `!schedulerec <pattern> <target> <message>` - Schedule recurring message
- `!broadcast <message>` - Broadcast message to group

## License

MIT License

---
*Mit Liebe erschaffen von unlovdman* 