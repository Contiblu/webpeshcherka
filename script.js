const WebSocket = require("ws");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const fs = require('fs');
const path = require('path');

const PORT = 8081;
const ART_PROJECT_PATH = 'C:\\Users\\Андреи\\art'; 

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- МАРШРУТ: ПРОСТАЯ ЗАПИСЬ В YAML ---
app.post("/api/product", async (req, res) => {
    const { title, price, category, imagePath, description } = req.body;
    
    try {
        const yamlFilePath = path.join(ART_PROJECT_PATH, '_data', 'merch', `${category}.yml`);

        if (!fs.existsSync(yamlFilePath)) {
            return res.status(404).send({ status: "error", message: `Файл ${category}.yml не найден` });
        }

        // Генерация slug
        const slug = `item_${Date.now().toString().slice(-6)}`;
        
        // Формируем блок СТРОГО по твоему образцу (отступы важны!)
        const newEntry = `  - slug: ${slug}
    title: "${title}"
    price: "${price}"
    image: ${imagePath}
    description: ${description || ''}\n`;

        let fileContent = fs.readFileSync(yamlFilePath, 'utf8');

        // Вставляем сразу под "merch:"
        if (fileContent.includes('merch:')) {
            fileContent = fileContent.replace('merch:', `merch:\n${newEntry}`);
        } else {
            fileContent = `merch:\n${newEntry}${fileContent}`;
        }

        fs.writeFileSync(yamlFilePath, fileContent, 'utf8');

        console.log(`✅ Добавлена запись в ${category}.yml: ${title}`);
        res.send({ status: "success", message: "Запись добавлена в YAML!" });

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
// Заказы и Чат (оставляем как есть)
app.post("/api/order", async (req, res) => { /* твоя логика axios в GitHub */ res.send({status:"ok"}); });
app.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}. Путь к сайту: ${ART_PROJECT_PATH}`));
app.listen(PORT, () => {
    console.log(`🚀 Сервер Lexi на порту ${PORT}`);
    console.log(`📂 Работаю с папкой: ${ART_PROJECT_PATH}`);
});
