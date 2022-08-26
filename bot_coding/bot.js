const mongoose = require("mongoose");
const pkg = require("telegraf");
const { Telegraf } = pkg;
const User = require("./user.js");
const fetch = require("node-fetch");

const BOT_TOKEN = `563536<XXXX>:AAFUYXTqrVIRdubKvzELS7Z0o2gQN<XXXXXX>`;
const DB = `mongodb+srv://nlp:<PASSWORD>@cluster0.3irjkue.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB connection successful!"));

const bot = new Telegraf(BOT_TOKEN);

let prevMessageId = null;

function deletePreviousMessage(prevMessageId, chatID, currentMessageID) {
  if (prevMessageId) {
    ctx.deleteMessage(prevMessageId, chatID).catch((e) => console.log(e));
    console.log("Reached here");
  }
  prevMessageId = currentMessageID;
}

bot.start((ctx) => {
  ctx.reply(`Hi ${ctx.message.from.first_name}! Welcome to Profanity Bot`);
  deletePreviousMessage(
    prevMessageId,
    ctx.message.chat.id,
    ctx.message.message_id
  );
});

bot.on("sticker", (ctx) => ctx.reply("Don't send me stickers! I can't understand them🥺"));

bot.on("text", async (ctx) => {
  const user = await User.findOne({ id: ctx.message.from.id });
  if (user === null) {
    try {
      const newUser = new User({
        id: ctx.message.from.id,
        fname: ctx.message.from.first_name,
        username: ctx.message.from.username,
        numberWarnings: 0,
      });
      await newUser.save();
      console.log("User Saved");
    } catch (e) {
      console.log(e);
    }
  } else {
    const currentUser = await User.findOne({ id: ctx.message.from.id });
    const response = await fetch(
      `http://nlp1310.herokuapp.com/predict-review?review=${ctx.message.text}`
    );
    const prediction = await response.json();
    console.log(ctx.message);
    if (prediction.Prediction == "Hate Speech") {
      currentUser.numberWarnings++;
      ctx.reply(`Hate Speech Detected 🚫⛔\nNumber of Warnings: ${currentUser.numberWarnings}\nMessage Deleted`);
      ctx
        .deleteMessage(ctx.message.message_id, ctx.message.chat.id)
        .catch((e) => console.log(e));
      deletePreviousMessage(prevMessageId, ctx.message.chat.id, ctx.message.message_id);
    } else if (prediction.Prediction == "Offensive Language") {
      currentUser.numberWarnings++;
      ctx.reply(`Abusive/Offensive Language Detected 🚫⛔\nNumber of Warnings: ${currentUser.numberWarnings}\nMessage Deleted`);
      ctx
        .deleteMessage(ctx.message.message_id, ctx.message.chat.id)
        .catch((e) => console.log(e));

      deletePreviousMessage(prevMessageId, ctx.message.chat.id, ctx.message.message_id);
    }
    await currentUser.save();
  }
});

bot.launch();