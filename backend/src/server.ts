import app from "./app";
import telegramService from "./services/telegram.service";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  // Регистрируем список команд бота в Telegram - чтобы в клиенте
  // при вводе "/" сразу показывалась подсказка
  telegramService.setMyCommands();
});
