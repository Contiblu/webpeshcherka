const WebSocket = require("ws");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios"); // Добавь: npm install axios

const PORT = 8080;
const GITHUB_TOKEN = "PLACEHOLDER"; // Для записи в репо напрямую
const REPO = "Contiblu/Contiblu.github.io";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Увеличил лимит для картинок из студии

const yaml = require("js-yaml"); // npm install js-yaml

app.post("/api/product", async (req, res) => {
  const { category, product } = req.body;

  try {
    // 1. Получаем текущий файл категории
    const url = `https://api.github.com/repos/${REPO}/contents/_data/merch/${category}.yml`;

    const file = await axios.get(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });

    const content = Buffer.from(file.data.content, 'base64').toString();
    let data = yaml.load(content) || {};

    if (!data.merch) data.merch = [];

    // 2. Добавляем товар
    data.merch.push(product);

    const newContent = Buffer.from(yaml.dump(data)).toString("base64");

    // 3. Обновляем файл
    await axios.put(url, {
      message: `Add product ${product.title}`,
      content: newContent,
      sha: file.data.sha,
      branch: "main"
    }, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });

    res.send({ ok: true });

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Ошибка");
  }
});

// --- ТРАНСПОРТ ДЛЯ 1С (Пример отправки) ---
async function sendTo1C(orderData) {
    try {
        // Здесь будет адрес твоего опубликованного HTTP-сервиса 1С
        // await axios.post('http://твой-сервер-1с/hs/studio/v1/order', orderData);
        console.log("🛠️ Данные отправлены в очередь 1С");
    } catch (e) {
        console.error("❌ 1С недоступна, сохраняем локально");
    }
}

// --- НОВЫЙ ШЛЮЗ: ПРИЕМ ЗАКАЗА ИЗ СТУДИИ ---
app.post("/api/order", async (req, res) => {
    const order = req.body; // Получаем всё из конструктора (майка, текст, лого)
    
    console.log("📦 Получен новый заказ для обработки...");

    // 1. Отправляем уведомление в чат Лекси через WebSocket
    broadcast(JSON.stringify({
        author: "SYSTEM",
        text: `🔥 Новый заказ! ${order.desc || 'Без описания'}`,
        time: new Date().toLocaleTimeString()
    }));

    // 2. Пушим в GitHub (создаем файл заказа в папке _data/orders/)
    // Это позволит тебе видеть заказы прямо в админке Decap CMS!
    try {
        const fileName = `order-${Date.now()}.json`;
        const content = Buffer.from(JSON.stringify(order)).toString('base64');
        
        // GitHub API запрос для создания файла
        await axios.put(`https://api.github.io/repos/${REPO}/contents/_data/orders/${fileName}`, {
            message: `New order from Studio: ${fileName}`,
            content: content,
            branch: "master"
        }, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        console.log("✅ Заказ зафиксирован в GitHub");
    } catch (err) {
        console.error("⚠️ Ошибка записи в GitHub:", err.message);
    }

    // 3. Стучимся в 1С
    await sendTo1C(order);

    res.send({ status: "Order Received", id: Date.now() });
});

// --- Оставляем твою старую логику Лекси ---
app.post("/from-lexi", (req, res) => {
    const msg = req.body;
    const formatted = JSON.stringify({
        author: msg.author,
        text: msg.text,
        time: new Date().toLocaleTimeString()
    });
    broadcast(formatted);
    res.send({ status: "ok" });
});

// --- WebSocket и Broadcast (без изменений) ---
const wss = new WebSocket.Server({ port: PORT });
let sockets = [];

wss.on("connection", (ws) => {
    sockets.push(ws);
    ws.on("message", (msg) => broadcast(msg));
    ws.on("close", () => { sockets = sockets.filter((s) => s !== ws); });
});

function broadcast(message) {
    sockets.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) client.send(message);
    });
}

app.listen(PORT + 1, () => {
    console.log(`🚀 Бизнес-шлюз запущен на порту ${PORT + 1}`);
});
