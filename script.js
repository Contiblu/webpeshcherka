// === server.js — Финальная версия для записи в YAML ===
const WebSocket = require("ws");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const fs = require('fs');
const path = require('path');

const PORT = 8081;
const ART_PROJECT_PATH = 'C:\\Users\\Андреи\\art'; // Путь к локальному репо сайта

// Настройки GitHub (только для заказов)
const GITHUB_TOKEN = "PLACEHOLDER"; 
const REPO_ORDERS = "Contiblu/lexi"; 
const BRANCH = "master"; 

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// --- МАРШРУТ: ДОБАВЛЕНИЕ ТОВАРА В YAML ---
app.post("/api/product", async (req, res) => {
    const { title, price, category, imageName, description } = req.body;
    console.log(`📝 Новая запись для YAML: ${title}`);

    try {
        const yamlFilePath = path.join(ART_PROJECT_PATH, '_data', 'merch', `${category}.yml`);

        if (!fs.existsSync(yamlFilePath)) {
            return res.status(404).send({ status: "error", message: `Файл ${category}.yml не найден в _data/merch/` });
        }

        // Генерируем уникальный slug на основе времени
        const slug = `item_${Date.now().toString().slice(-6)}`;
        
        // Формируем блок по твоему образцу (с отступами в 2 пробела)
        const newEntry = `  - slug: ${slug}
    title: "${title}"
    price: "${price}"
    description: "${description || ''}"
    image: /assets/images/merch/${imageName}\n`;

        let fileContent = fs.readFileSync(yamlFilePath, 'utf8');

        // Вставляем новый товар сразу после строки "merch:"
        if (fileContent.includes('merch:')) {
            fileContent = fileContent.replace('merch:', `merch:\n${newEntry}`);
        } else {
            fileContent = `merch:\n${newEntry}${fileContent}`;
        }

        fs.writeFileSync(yamlFilePath, fileContent, 'utf8');

        console.log(`✅ Запись успешно добавлена в ${category}.yml`);
        res.send({ status: "success", message: "Товар успешно добавлен в базу витрины (YAML)!" });

    } catch (err) {
        console.error("❌ Ошибка:", err);
        res.status(500).send({ status: "error", message: err.message });
    }
});

// --- МАРШРУТ: ЗАКАЗЫ (БЕЗ ИЗМЕНЕНИЙ) ---
app.post("/api/order", async (req, res) => {
    try {
        const fileName = `_data/orders/${Date.now()}.json`;
        const contentBase64 = Buffer.from(JSON.stringify(req.body, null, 2)).toString('base64');
        await axios.put(`https://api.github.com/repos/${REPO_ORDERS}/contents/${fileName}`, {
            message: "New order", content: contentBase64, branch: BRANCH
        }, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
        res.send({ status: "success" });
    } catch (e) { res.status(500).send({ status: "error" }); }
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер Lexi на порту ${PORT}`);
    console.log(`📂 Работаю с папкой: ${ART_PROJECT_PATH}`);
});
