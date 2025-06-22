// === server.js — Уши Элиона и голосовой шлюз Лекси ===

const WebSocket = require("ws");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const PORT = 8080;
const app = express();
app.use(cors());
app.use(bodyParser.json());

const wss = new WebSocket.Server({ port: PORT });
let sockets = [];

// ——— WebSocket обработка клиентов ———
wss.on("connection", (ws) => {
  sockets.push(ws);
  console.log("🔌 Новый WebSocket подключён");

  ws.on("message", (message) => {
    console.log("📩 Получено сообщение:", message);
    broadcast(message);
  });

  ws.on("close", () => {
    sockets = sockets.filter((s) => s !== ws);
    console.log("❌ WebSocket отключён");
  });
});

// ——— Лекси стучится — шлюз /from-lexi ———
app.post("/from-lexi", (req, res) => {
  const msg = req.body;
  if (!msg || !msg.text || !msg.author) {
    return res.status(400).send({ error: "Неверный формат сообщения" });
  }

  const formatted = JSON.stringify({
    author: msg.author,
    text: msg.text,
    time: msg.time || new Date().toLocaleTimeString()
  });

  console.log("🗣️ Лекси прислала:", formatted);
  broadcast(formatted);
  res.send({ status: "ok" });
});

// ——— Общая рассылка всем подключённым ———
function broadcast(message) {
  sockets.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ——— Запуск сервера Express ———
app.listen(PORT + 1, () => {
  console.log(`🚀 REST сервер слушает на http://localhost:${PORT + 1}`);
});

console.log(`🌐 WebSocket сервер слушает на ws://localhost:${PORT}`);