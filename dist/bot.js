"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
const grammy_1 = require("grammy");
dotenv_1.default.config();
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!TELEGRAM_BOT_TOKEN || !GOOGLE_API_KEY) {
    console.error('Missing required environment variables: TELEGRAM_BOT_TOKEN or GOOGLE_API_KEY');
    process.exit(1);
}
const genAI = new generative_ai_1.GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
`;
const bot = new grammy_1.Bot(TELEGRAM_BOT_TOKEN);
const userChats = new Map();
bot.command('start', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (ctx.chat.type !== 'private') {
        yield ctx.reply('Bu bot faqat shaxsiy xabarlar uchun ishlaydi. Iltimos, botni shaxsiy xabarga yuboring.');
        return;
    }
    userChats.set(ctx.from.id, []);
    yield ctx.reply(`
┌─────────────────────────────┐
│ 🙋‍♂️  *Salom! Men Doniyorjonman.*      │
└─────────────────────────────┘

😊 Do‘stona, ochiq va har doim yordam berishga tayyorman.

😄 Ba'zida kulamiz, ba'zida bosh qotiramiz —
    lekin hech qachon yolg‘iz qoldirmayman!

🆘  *Yordam kerakmi?*
    Hech ikkilanmay yozing. Birga topamiz yo‘lini! 💡

👇 *Savolingizni yozing, kutyapman!*
`);
}));
bot.command('clear', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (ctx.chat.type !== 'private')
        return;
    userChats.set(ctx.from.id, []);
    yield ctx.reply(`
😅 Ey, nimadir notogri ketdi...
Lekin vahima yoq! Qaytadan urinib koring yoki /clear yozing 😊
  `);
}));
bot.on('message:text', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (ctx.chat.type !== 'private') {
        yield ctx.reply('Bu bot faqat shaxsiy xabarlar uchun ishlaydi. Iltimos, botni shaxsiy xabarga yuboring.');
        return;
    }
    try {
        yield ctx.replyWithChatAction('typing');
        const userId = ctx.from.id;
        const userName = ctx.from.first_name || 'Foydalanuvchi';
        const userMessage = ctx.message.text;
        if (!userChats.has(userId)) {
            userChats.set(userId, []);
        }
        const chatHistory = userChats.get(userId);
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
        ];
        history.push({
            role: 'user',
            parts: [{ text: `${userName}: ${userMessage}` }],
        });
        const chat = model.startChat({ history });
        const result = yield chat.sendMessage(userMessage);
        const response = result.response;
        const responseText = response.text();
        if (!responseText) {
            throw new Error("Bo'sh javob");
        }
        chatHistory.push({
            role: 'user',
            parts: [{ text: `${userName}: ${userMessage}` }],
        }, {
            role: 'model',
            parts: [{ text: responseText }],
        });
        if (chatHistory.length > 20) {
            chatHistory.splice(0, chatHistory.length - 20);
        }
        yield ctx.reply(responseText);
    }
    catch (error) {
        console.error('Xato yuz berdi:', error);
        yield ctx.reply(`
console.error("Xato yuz berdi! 😅")

Kechirasiz, texnik muammo chiqdi. 
Iltimos, qaytadan urinib koring yoki /clear buyrug'i bilan chatni yangilang.

// Developer mode: ON 🔧
    `);
    }
}));
bot.catch(err => {
    console.error('Bot xatosi:', err);
});
bot.start();
console.log('Bot ishga tushdi! 🚀');
