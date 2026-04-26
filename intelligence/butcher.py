import os
import json
import gspread
import requests
from bs4 import BeautifulSoup
from google.oauth2.service_account import Credentials
import time
import re

def get_gspread_client():
    service_account_info = json.loads(os.environ.get('GOOGLE_API_KEY'))
    scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    creds = Credentials.from_service_account_info(service_account_info, scopes=scopes)
    return gspread.authorize(creds)

def harvest_targets(query):
    print(f"🕵️‍♂️ Бонд применяет грубую силу к Satu. Запрос: {query}")
    # Пробуем десктопную версию с имитацией реального браузера
    url = f"https://satu.kz/search?search_term={query.replace(' ', '+')}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=20)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Находим все блоки товаров. Satu любит менять классы, поэтому ищем по qaid
        items = soup.find_all('div', {'data-qaid': 'product_block'})
        print(f"🔍 В поле зрения попало объектов: {len(items)}")
        
        leads = []
        for item in items:
            # Вынимаем ВЕСЬ текст из блока и чистим его
            raw_text = item.get_text(separator=' ').strip()
            # Пытаемся найти ссылку
            link_tag = item.find('a', href=True)
            link = "https://satu.kz" + link_elem['href'] if (link_elem := item.find('a', href=True)) else "Нет ссылки"
            
            # Из сырого текста берем первую строку - обычно это название компании или товара
            lines = [l.strip() for l in raw_text.split('\n') if len(l.strip()) > 3]
            name = lines[0] if lines else "Не удалось распознать"
            
            if name != "Не удалось распознать" and len(name) > 5:
                leads.append([
                    name[:100],      # A: Потенциал (обрезаем если слишком длинно)
                    "Новый",         # B: Статус
                    "Satu.kz",       # C: Локация
                    link,            # D: Контакт/Ссылка
                    time.strftime("%d.%m.%Y"), # E: Дата захвата
                    f"Сырые данные: {raw_text[:150]}..." # F: Заметки (берем кусок текста для инфы)
                ])
                print(f"🎯 Захвачено: {name[:30]}")
        
        return leads
    except Exception as e:
        print(f"⚠️ Ошибка при допросе Satu: {e}")
        return []

def main():
    client = get_gspread_client()
    spreadsheet = client.open("STITCH_DATABASE_V1")
    sheet = spreadsheet.worksheet("MEAT")
    
    # Расширяем список запросов, раз мы "дожимаем"
    queries = ["пошив чехлов алматы", "перетяжка салона", "вышивка логотипов"]
    
    for q in queries:
        new_data = harvest_targets(q)
        if new_data:
            sheet.append_rows(new_data)
            print(f"🚀 В MEAT добавлено {len(new_data)} туш.")
        time.sleep(7) # Увеличим задержку, раз Satu такой хитрый

if __name__ == "__main__":
    main()
