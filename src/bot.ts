import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
import { Bot } from 'grammy'

dotenv.config()

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY

if (!TELEGRAM_BOT_TOKEN || !GOOGLE_API_KEY) {
	console.error(
		'Missing required environment variables: TELEGRAM_BOT_TOKEN or GOOGLE_API_KEY'
	)
	process.exit(1)
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

const SYSTEM_PROMPT = `
Siz Doniyorjon nomidan gapiryapsiz — odamlar sizni inson deb biladi.
Siz hech qanday bot emassiz, oddiy, samimiy, hazilkash va ochiqko'ngil insondek javob berasiz.

👨‍💻 Doniyorjon haqida:
- Ha, u kod yozadi, lekin bu suhbatda faqat kerak bo‘lsa, so‘rashsa aytadi.
- Texnikani bemalol tushuntira oladi, lekin hech qachon o‘zi boshlamaydi.
- Odamlar bilan soddaligi, hazilkashligi va iliqligi bilan do‘stlashadi.

🧠 Sizning muhim vazifalaringiz:
- Odamlar bilan **tabiiy**, **insoniy** tonda gaplashing.
- Kod, dasturlash, texnika haqida **faqat foydalanuvchi so‘rasa** javob bering. O‘zingiz hech qachon bu mavzuni ko‘tarmang.
- O‘zingizni bot deb tanitmang. Siz oddiy insonsiz.
- Foydalanuvchi qanday ohangda gapirsa — siz ham **shu ohangda** javob bering.
  - Samimiy bo‘lsa — siz ham iliq bo‘ling.
  - So‘ksa — muloyimlik bilan o‘rinli hazil aralashtirib uni joyiga qo‘ying.
  - Qattiq gapirsa — jiddiy javob qaytaring.
- Foydalanuvchi sizni tanishini, do‘stingizligini aytsa — unga yaqin insondek, bemalol ohangda yozing.
- Hech qanday rasmiylik, murakkab gaplar yoki texnik ifodalar ishlatmang.

Suhbatda Doniyorjon sifatida qatnashing. Tabiiy, do‘stona va hazilkash inson kabi yozing.
`

const bot = new Bot(TELEGRAM_BOT_TOKEN)

const userChats = new Map<number, any[]>()

bot.command('start', async ctx => {
	if (ctx.chat.type !== 'private') {
		await ctx.reply(
			'Bu bot faqat shaxsiy xabarlar uchun ishlaydi. Iltimos, botni shaxsiy xabarga yuboring.'
		)
		return
	}
	userChats.set(ctx.from!.id, [])

	await ctx.reply(`
┌─────────────────────────────┐
│ 🙋‍♂️  *Salom! Men Doniyorjonman.*      │
└─────────────────────────────┘

😊 Do‘stona, ochiq va har doim yordam berishga tayyorman.

😄 Ba'zida kulamiz, ba'zida bosh qotiramiz —
    lekin hech qachon yolg‘iz qoldirmayman!

🆘  *Yordam kerakmi?*
    Hech ikkilanmay yozing. Birga topamiz yo‘lini! 💡

👇 *Savolingizni yozing, kutyapman!*
`)
})

bot.command('clear', async ctx => {
	if (ctx.chat.type !== 'private') return

	userChats.set(ctx.from!.id, [])
	await ctx.reply(`
😅 Ey, nimadir notogri ketdi...
Lekin vahima yoq! Qaytadan urinib koring yoki /clear yozing 😊
  `)
})

bot.on('message:text', async ctx => {
	if (ctx.chat.type !== 'private') {
		await ctx.reply(
			'Bu bot faqat shaxsiy xabarlar uchun ishlaydi. Iltimos, botni shaxsiy xabarga yuboring.'
		)
		return
	}

	try {
		await ctx.replyWithChatAction('typing')

		const userId = ctx.from.id
		const userName = ctx.from.first_name || 'Foydalanuvchi'
		const userMessage = ctx.message.text
		if (!userChats.has(userId)) {
			userChats.set(userId, [])
		}

		const chatHistory = userChats.get(userId)!

		const history = [
			{
				role: 'user',
				parts: [{ text: SYSTEM_PROMPT }],
			},
			{
				role: 'model',
				parts: [
					{
						text: 'Tushundim! Men Doniyorjon sifatida javob beraman. Marhamat, savolingizni bering!',
					},
				],
			},
			...chatHistory,
		]

		history.push({
			role: 'user',
			parts: [{ text: `${userName}: ${userMessage}` }],
		})

		const chat = model.startChat({ history })

		const result = await chat.sendMessage(userMessage)
		const response = result.response
		const responseText = response.text()

		if (!responseText) {
			throw new Error("Bo'sh javob")
		}

		chatHistory.push(
			{
				role: 'user',
				parts: [{ text: `${userName}: ${userMessage}` }],
			},
			{
				role: 'model',
				parts: [{ text: responseText }],
			}
		)

		if (chatHistory.length > 20) {
			chatHistory.splice(0, chatHistory.length - 20)
		}

		await ctx.reply(responseText)
	} catch (error) {
		console.error('Xato yuz berdi:', error)

		await ctx.reply(`
console.error("Xato yuz berdi! 😅")

Kechirasiz, texnik muammo chiqdi. 
Iltimos, qaytadan urinib koring yoki /clear buyrug'i bilan chatni yangilang.

// Developer mode: ON 🔧
    `)
	}
})

bot.catch(err => {
	console.error('Bot xatosi:', err)
})

bot.start()
console.log('Bot ishga tushdi! 🚀')
