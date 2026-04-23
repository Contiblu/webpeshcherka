// === server.js — Бизнес-шлюз "Лекси" ===
const WebSocket = require("ws");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const fs = require('fs');
const path = require('path');

const PORT = 8081;

// --- НАСТРОЙКИ GITHUB (для заказов) ---
const GITHUB_TOKEN = "PLACEHOLDER"; 
const REPO_ORDERS = "Contiblu/lexi"; 
const BRANCH = "master"; 

// --- НАСТРОЙКА ЛОКАЛЬНОГО ПУТИ (для мерча) ---
const ART_PROJECT_PATH = 'C:\\Users\\Андреи\\art';

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); 

// Функция для отправки заказов в GitHub
async function uploadOrderToGithub(contentObject) {
    try {
        const fileName = `_data/orders/${Date.now()}.json`;
        const contentBase64 = Buffer.from(JSON.stringify(contentObject, null, 2)).toString('base64');
        const url = `https://api.github.com/repos/${REPO_ORDERS}/contents/${fileName}`;
        
        await axios.put(url, {
            message: "New order via Gateway",
            content: contentBase64,
            branch: BRANCH
        }, {
            headers: { 
                Authorization: `token ${GITHUB_TOKEN}`,
                "Content-Type": "application/json"
            }
        });
        return true;
    } catch (err) {
        console.error("❌ Ошибка GitHub API (заказы):", err.message);
        return false;
    }
}

// --- МАРШРУТ: НОВЫЙ ТОВАР (ОТ ОПЕРАТОРА В ПАПКУ ART) ---
app.post("/api/product", async (req, res) => {
    const { title, price, category, imageName, imageData } = req.body;
    console.log(`📦 Поступил товар: ${title}`);

    try {
        // 1. Сохраняем картинку
        const base64Image = imageData.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Image, 'base64');
        const imgFileName = `${Date.now()}_${imageName}`;
        
        const fullImgDir = path.join(ART_PROJECT_PATH, 'assets', 'images', 'merch');
        const fullImgPath = path.join(fullImgDir, imgFileName);

        if (!fs.existsSync(fullImgDir)) fs.mkdirSync(fullImgDir, { recursive: true });
        fs.writeFileSync(fullImgPath, imageBuffer);

        // 2. Создаем JSON товара
        const productData = {
            title,
            price: Number(price),
            category,
            image: `/assets/images/merch/${imgFileName}`,
            date: new Date().toISOString()
        };

        const fullProductDir = path.join(ART_PROJECT_PATH, 'merch', category);
        const fullProductPath = path.join(fullProductDir, `${Date.now()}.json`);

        if (!fs.existsSync(fullProductDir)) fs.mkdirSync(fullProductDir, { recursive: true });
        fs.writeFileSync(fullProductPath, JSON.stringify(productData, null, 2), 'utf8');

        console.log(`✅ Сохранено локально: ${fullProductPath}`);
        res.send({ status: "success", message: "Товар успешно сохранен в папку ART!" });

    } catch (err) {
        console.error("❌ Ошибка сохранения:", err);
        res.status(500).send({ status: "error", message: err.message });
    }
});

// --- МАРШРУТ: НОВЫЙ ЗАКАЗ (ИЗ КОНСТРУКТОРА В GITHUB) ---
app.post("/api/order", async (req, res) => {
    console.log("📦 Получен новый заказ...");
    const success = await uploadOrderToGithub(req.body);
    
    if (success) {
        broadcast(JSON.stringify({ author: "SYSTEM", text: "🔥 Новый заказ в системе!", time: new Date().toLocaleTimeString() }));
        res.send({ status: "success" });
    } else {
        res.status(500).send({ status: "error" });
    }
});

// --- WEBSOCKET ЧАТ ---
const wss = new WebSocket.Server({ port: 8080 });
let sockets = [];
wss.on("connection", (ws) => {
    sockets.push(ws);
    ws.on("message", (msg) => broadcast(msg.toString()));
    ws.on("close", () => { sockets = sockets.filter((s) => s !== ws); });
});
function broadcast(message) {
    sockets.forEach((c) => { if (c.readyState === WebSocket.OPEN) c.send(message); });
}

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📂 Локальная папка сайта: ${ART_PROJECT_PATH}`);
});
