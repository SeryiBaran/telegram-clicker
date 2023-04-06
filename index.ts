import {
  Bot,
  Context,
  Keyboard,
  NextFunction,
  SessionFlavor,
  session,
} from "grammy";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  throw new Error("Нет токена!");
}
const WORKER_EARNS = 2;
const MAX_BALANCE = 100000;

enum BUTTONS {
  EARN = "Заработать",
  BUY_WORKER = "Купить работника",
  BUY_WORKER_MAX = "Купить работников на все деньги",
  ORDER_TO_WORK = "Отдать приказ работать",
  INFO = "Инфо о персонаже",
  HELP = "Справка",
  RESET = "Сброс игры",
}

const START_MESSAGE = `Привет\\!

Это простая игра\\-кликер в виде Telegram бота про ||~фрилансеров работающих за еду~|| карьеру успешного бизнесмена Петровича\\.

Чтобы начать \\- нажми *"${BUTTONS.HELP}"*
`;
const HELP_MESSAGE = `Вы петрович\\.

Цель игры \\- заработать ${MAX_BALANCE} 💵\\. На этом все, у автора не хватило мозгов придумать что\\-то ещё\\.

*Кнопки*

*"${BUTTONS.EARN}"* \\- пополняет кошелек на 1 💵\\.

*"${BUTTONS.BUY_WORKER}"* \\- за 30 💵 у вас появляется работник приносящий ${WORKER_EARNS} 💵 за нажатие кнопки "${BUTTONS.ORDER_TO_WORK}"\\.
`;

interface SessionData {
  balance: number;
  workersCount: number;
}

type SessionContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<SessionContext>(TOKEN);

function initial(): SessionData {
  return { balance: 0, workersCount: 0 };
}

function winMiddleware(ctx: SessionContext, next: NextFunction) {
  if (ctx.session.balance >= MAX_BALANCE) {
    ctx.reply("Поздравляю, в выиграли! А я не сумел придумать концовку.");
    return;
  }
  next();
}

bot.use(session({ initial }));

// // prettier-ignore
const keyboard = new Keyboard()
  .text(BUTTONS.EARN)
  .text(BUTTONS.BUY_WORKER)
  .row()
  .text(BUTTONS.BUY_WORKER_MAX)
  .text(BUTTONS.ORDER_TO_WORK)
  .row()
  .text(BUTTONS.INFO)
  .text(BUTTONS.HELP)
  .row()
  .text(BUTTONS.RESET);

const handlers = {
  start(ctx: SessionContext) {
    ctx.reply(START_MESSAGE, {
      parse_mode: "MarkdownV2",
      reply_markup: keyboard,
    });
  },
  earn(ctx: SessionContext) {
    ctx.session.balance++;
    ctx.reply(`Вы заработали 1 💵!`);
  },
  buyWorker(ctx: SessionContext) {
    if (ctx.session.balance < 30) {
      ctx.reply(`Недостаточно денег! Нужно 30, у вас ${ctx.session.balance}`);
      return;
    }
    ctx.session.balance -= 30;
    ctx.session.workersCount++;
    ctx.reply(`Вы купили работника за 30 💵!`);
  },
  buyWorkerMax(ctx: SessionContext) {
    if (ctx.session.balance < 30) {
      ctx.reply(
        `Недостаточно денег! Нужно больше 30, у вас ${ctx.session.balance}`
      );
      return;
    }

    const numberOfWorkersForBuy = Math.floor(ctx.session.balance / 30);

    ctx.session.balance -= 30 * numberOfWorkersForBuy;
    ctx.session.workersCount += numberOfWorkersForBuy;

    ctx.reply(
      `Вы купили ${numberOfWorkersForBuy} работников за ${
        30 * numberOfWorkersForBuy
      } 💵!`
    );
  },
  orderToWork(ctx: SessionContext) {
    if (ctx.session.workersCount < 1) {
      ctx.reply("Нету рабочих!");
      return;
    }
    ctx.session.balance += ctx.session.workersCount * WORKER_EARNS;
    ctx.reply(`Вы заработали ${ctx.session.workersCount * WORKER_EARNS} 💵`);
  },
  info(ctx: SessionContext) {
    const info = `*Информация о персонаже*  
Баланс: ${ctx.session.balance} 💵  
Количество рабочих: ${ctx.session.workersCount}
    `;

    ctx.reply(info, {
      parse_mode: "MarkdownV2",
    });
  },
  help(ctx: SessionContext) {
    ctx.reply(HELP_MESSAGE, {
      parse_mode: "MarkdownV2",
    });
  },
  reset(ctx: SessionContext) {
    ctx.session = initial();
    ctx.reply("Игра сброшена!");
  },
};

bot.command("start", handlers.start);

bot.hears(BUTTONS.EARN, winMiddleware, handlers.earn);
bot.hears(BUTTONS.BUY_WORKER, winMiddleware, handlers.buyWorker);
bot.hears(BUTTONS.BUY_WORKER_MAX, winMiddleware, handlers.buyWorkerMax);
bot.hears(BUTTONS.ORDER_TO_WORK, winMiddleware, handlers.orderToWork);
bot.hears(BUTTONS.INFO, handlers.info);
bot.hears(BUTTONS.HELP, handlers.help);
bot.hears(BUTTONS.RESET, handlers.reset);

bot.start();
