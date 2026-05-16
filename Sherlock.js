#!/usr/bin/env node
const https = require('https'), http = require('http')
const username = process.argv[2]
if (!username) return console.log('sherlock <username>')

// База сайтов. Каждый сайт - это имя, урл и фразы которые
// означают "чела тут нет". Для клвтыф сайтов прописал паттерны,
// для остальных - смотрим только HTTP-статус (работает так себе, но мне похуй)

const sites = [
  // Соцсети
  { name: 'Instagram',    url: `https://instagram.com/${username}`, patterns: ['page isn\'t available', 'not found'] },
  { name: 'Twitter',      url: `https://x.com/${username}`, patterns: ['this account doesn\'t exist', 'page doesn\'t exist'] },
  { name: 'Reddit',       url: `https://reddit.com/user/${username}`, patterns: ['page not found', 'sorry'] },
  { name: 'TikTok',       url: `https://tiktok.com/@${username}`, patterns: ['couldn\'t find this account'] },
  { name: 'VK',           url: `https://vk.com/${username}`, patterns: ['page not found', 'not found'] },
  { name: 'Facebook',     url: `https://facebook.com/${username}`, patterns: ['page not found'] },
  { name: 'Pinterest',    url: `https://pinterest.com/${username}`, patterns: ['not found'] },
  { name: 'Snapchat',     url: `https://snapchat.com/add/${username}` },
  { name: 'LinkedIn',     url: `https://linkedin.com/in/${username}`, patterns: ['page not found'] },
  { name: 'Telegram',     url: `https://t.me/${username}`, patterns: ['no username'] },
  { name: 'WhatsApp',     url: `https://wa.me/${username}` },
  { name: 'Discord',      url: `https://discord.com/users/${username}` },
  { name: 'Mastodon.social', url: `https://mastodon.social/@${username}` },
  
  // Для программистов (если челик програмист - 100% будет тут)
  { name: 'GitHub',       url: `https://github.com/${username}`, patterns: ['not found', 'find a user'] },
  { name: 'GitLab',       url: `https://gitlab.com/${username}`, patterns: ['not found'] },
  { name: 'BitBucket',    url: `https://bitbucket.org/${username}` },
  { name: 'CodePen',      url: `https://codepen.io/${username}` },
  { name: 'Replit',       url: `https://replit.com/@${username}` },
  { name: 'Codecademy',   url: `https://codecademy.com/profiles/${username}` },
  { name: 'LeetCode',     url: `https://leetcode.com/${username}` },
  { name: 'HackerRank',   url: `https://hackerrank.com/${username}` },
  { name: 'Dev.to',       url: `https://dev.to/${username}` },
  { name: 'npm',          url: `https://npmjs.com/~${username}` },
  
  // Видео и стримы
  { name: 'YouTube',      url: `https://youtube.com/@${username}`, patterns: ['not found'] },
  { name: 'Twitch',       url: `https://twitch.tv/${username}`, patterns: ['not found'] },
  { name: 'Vimeo',        url: `https://vimeo.com/${username}` },
  { name: 'Dailymotion',  url: `https://dailymotion.com/${username}` },
  { name: 'Kick',         url: `https://kick.com/${username}` },
  
  // Гэй мерские
  { name: 'Steam',        url: `https://steamcommunity.com/id/${username}` },
  { name: 'Roblox',       url: `https://roblox.com/user.aspx?username=${username}` },
  { name: 'Chess.com',    url: `https://chess.com/member/${username}` },
  { name: 'Lichess',      url: `https://lichess.org/@/${username}` },
  { name: 'Minecraft',    url: `https://namemc.com/profile/${username}` },
  { name: 'FortniteTracker', url: `https://fortnitetracker.com/profile/all/${username}` },
  
  // Музыка
  { name: 'Spotify',      url: `https://open.spotify.com/user/${username}` },
  { name: 'SoundCloud',   url: `https://soundcloud.com/${username}` },
  { name: 'Last.fm',      url: `https://last.fm/user/${username}` },
  
  // дизайн
  { name: 'DeviantArt',   url: `https://deviantart.com/${username}` },
  { name: 'Behance',      url: `https://behance.net/${username}` },
  { name: 'Dribbble',     url: `https://dribbble.com/${username}` },
  { name: 'ArtStation',   url: `https://artstation.com/${username}` },
  { name: 'Flickr',       url: `https://flickr.com/people/${username}` },
  { name: '500px',        url: `https://500px.com/p/${username}` },
  
  // блоги
  { name: 'Medium',       url: `https://medium.com/@${username}` },
  { name: 'Patreon',      url: `https://patreon.com/${username}` },
  { name: 'Substack',     url: `https://substack.com/@${username}` },
  { name: 'WordPress',    url: `https://${username}.wordpress.com` },
  { name: 'Blogger',      url: `https://${username}.blogspot.com` },
]


const colors = {
  found:    '\x1b[32m[+]\x1b[0m',   // зелёненький :3
  notfound: '\x1b[31m[-]\x1b[0m',   // красный :<
  error:    '\x1b[33m[?]\x1b[0m',   // жёлтый :|
}

// Проверка одного сайта. Возвращает true, false или null 
function check(url, patterns) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http
    
    const req = client.get(url, { 
      timeout: 5000,                              // ждём 5 сек, потом забиваем
      headers: { 'User-Agent': 'Mozilla/5.0' }   // прикидываемся браузером, а то забанят...
    }, (res) => {
      // 404 - сразу ясно что нету
      if (res.statusCode === 404) return resolve(false)
      // 500+ - сервер лёг, считаем ошибкой
      if (res.statusCode >= 500) return resolve(null)
      
      // Если паттернов нет - тупо верим статусу (200 = есть, остальное = нет)
      if (!patterns || !patterns.length) return resolve(res.statusCode < 400)
      
      // Паттерны есть - качаем HTML и ищем там фразы "не найдено"
      let data = ''
      res.on('data', chunk => data += chunk)   // собираем ответ по кусочкам
      res.on('end', () => {
        const text = data.toLowerCase()
        // Если нашли хоть один паттерн - аккаунта нет
        const found = patterns.some(p => text.includes(p.toLowerCase()))
        resolve(!found)  // !found потому что если паттерн нашёлся - юзера нет
      })
    })
    
    req.on('error', () => resolve(null))      // ошибка сети -> [?]
    req.on('timeout', () => { 
      req.destroy(); resolve(null)            // таймаут -> [?]
    })
    req.end()
  })
}

// Главная функция - обходит все сайты и выводит красиво :3
async function search() {
  console.log(`\n\x1b[1mSherlockJS - search: ${username}\x1b[0m\n`)
  const results = { found: [], notfound: [], errors: [] }
  
  for (const site of sites) {
    // Пишем "Проверяю: bulbagram
    ", потом затираем и пишем результат
    process.stdout.write(`\r\x1b[37mCheck: ${site.name.padEnd(18)}\x1b[0m`)
    const exists = await check(site.url, site.patterns)
    
    const name = site.name.padEnd(18)  // ровняем по ширине для красоты
    if (exists === true) {
      // Зелёный [+] и ссылка
      console.log(`\r${colors.found} ${name} \x1b[4m${site.url}\x1b[0m`)
      results.found.push(site)
    } else if (exists === false) {
      // Не нашли :(
      console.log(`\r${colors.notfound} ${name}`)
      results.notfound.push(site)
    } else {
      // Чёт пошло не так
      console.log(`\r${colors.error} ${name} no response`)
      results.errors.push(site)
    }
  }
  
  // Статистика
  console.log(`\n\x1b[1mResults:\x1b[0m`)
  console.log(`  ${colors.found} Found: ${results.found.length}`)
  console.log(`  ${colors.notfound} Not found: ${results.notfound.length}`)
  console.log(`  ${colors.error} Errors: ${results.errors.length}`)
  
  // Если что-то нашли - выводим ссылки списком
  if (results.found.length) {
    console.log(`\n\x1b[1mLinks:\x1b[0m`)
    results.found.forEach((s, i) => console.log(`  \x1b[36m${i+1}.\x1b[0m ${s.url}`))
  }
}

search()
