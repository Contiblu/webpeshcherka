const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require('fs');
const path = require('path');

const PORT = 8081;
const ART_PROJECT_PATH = 'C:\\Users\\Андреи\\art'; // Путь к локальному репозиторию сайта

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- МАРШРУТ АДМИНКИ: ЗАПИСЬ В YAML ПО СТРУКТУРЕ ---
app.post("/api/product", (req, res) => {
    const { category, title, price, imageName, description } = req.body;
    
    try {
        // 1. Путь к файлу данных (согласно Дереву: _data/merch/...) [cite: 1]
        const yamlFilePath = path.join(ART_PROJECT_PATH, '_data', 'merch', `${category}.yml`);

        if (!fs.existsSync(yamlFilePath)) {
            return res.status(404).json({ error: `Файл ${category}.yml не найден в _data/merch/` });
        }

        // 2. Уникальный ID
        const slug = `item_${Date.now().toString().slice(-6)}`;

        // 3. Формируем путь к изображению (согласно Дереву: assets/images/[категория]/) 
        const imagePath = `/assets/images/${category}/${imageName}`;

        // 4. Формируем блок данных (YAML-формат)
        const newEntry = `  - slug: "${slug}"
    title: "${title}"
    price: "${price}"
    image: "${imagePath}"
    description: "${description || ''}"\n`;

        // 5. Читаем и дополняем файл
        let content = fs.readFileSync(yamlFilePath, 'utf8');
        
        // Вставляем новую запись сразу после "merch:"
        if (content.includes('merch:')) {
            content = content.replace('merch:', `merch:\n${newEntry}`);
        } else {
            content = `merch:\n${newEntry}${content}`;
        }

        fs.writeFileSync(yamlFilePath, content, 'utf8');
        console.log(`✅ Товар "${title}" добавлен в ${category}.yml. Путь фото: ${imagePath}`);
        res.json({ status: "success", message: "Товар успешно внесен в локальный YAML!" });

    } catch (err) {
        console.error("❌ Ошибка:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📂 Рабочая директория: ${ART_PROJECT_PATH}`);
});
