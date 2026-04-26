Понимаю, Андрей. В таком деле лучше иметь один монолитный кусок кода, чем собирать конструктор из кусков, пока одной рукой принимаешь посылку, а другой тыкаешь в клавиатуру.

Лови полный, обновленный и максимально «живучий» код для butcher.py. Я объединил всё: авторизацию, новый алгоритм поиска целей и систему отчетов в логи.

Python
import os
import json
import gspread
import requests
from bs4 import BeautifulSoup
from google.oauth2.service_account import Credentials
import time

# 1. Авторизация (Ключи из сейфа GitHub)
def get_gspread_client():
    try:
        service_account_info = json.loads(os.environ.get('GOOGLE_API_KEY'))
        scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
        creds = Credentials.from_service_account_info(service_account_info, scopes=scopes)
        return gspread.authorize(creds)
    except Exception as e:
        print(f"❌ Ошибка авторизации: {e}")
        return None

# 2. Логика Охотника: Вынимаем данные даже если сайт сопротивляется
def harvest_targets(query):
    print(f"🕵️‍♂️ Бонд зашел на Satu.kz. Запрос: {query}")
    # Формируем URL так, чтобы поиск был именно по Алматы (добавили регион в запрос)
    url = f"https://satu.kz/search?search_term={query.replace(' ', '+')}+алматы"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            print(f"📡 Сервер ответил странно: {response.status_code}")
            return []
            
        soup = BeautifulSoup(response.text, 'html.parser')
        # Ищем все блоки товаров/услуг
        items = soup.select('div[data-qaid="product_block"]')
        print(f"🔍 Найдено потенциальных блоков: {len(items)}")
        
        leads = []
        for item in items:
            # Ищем ссылку и название внутри блока
            link_elem = item.find('a', href=True)
            if not link_elem: continue
            
            # Пытаемся вытащить имя компании или название услуги
            name = link_elem.get('title') or link_elem.get_text().strip()
            link = link_elem['href']
            if not link.startswith('http'):
                link = "https://satu.kz" + link
                
            # Описание (обычно там цена или краткая инфа)
            desc_elem = item.select_one('span[data-qaid="product_price"]')
            desc = desc_elem.get_text().strip() if desc_elem else "Уточняйте цену"
            
            if name and len(name) > 5:
                leads.append([
                    name,           # A: Потенциал
                    "Новый",        # B: Статус
                    "Satu.kz",      # C: Площадка
                    link,           # D: Контакт/Ссылка
                    time.strftime("%d.%m.%Y"), # E: Дата захвата
                    f"Найдено по запросу: {query}. {desc}" # F: Заметки
                ])
                print(f"🎯 Нашел цель: {name[:40]}...")
            
            if len(leads) >= 10: break # Не жадничаем, берем по 10 лучших с каждого запроса
            
        return leads
    except Exception as e:
        print(f"⚠️ Сбой при парсинге: {e}")
        return []

# 3. Главный цикл
def main():
    client = get_gspread_client()
    if not client: return
    
    try:
        spreadsheet = client.open("STITCH_DATABASE_V1")
        sheet = spreadsheet.worksheet("MEAT")
        
        # Список запросов, которые приведут нас к "Золотым мальчикам"
        queries = [
            "пошив чехлов", 
            "реставрация кожи", 
            "автоателье",
            "перетяжка салона"
        ]
        
        total_added = 0
        for q in queries:
            new_leads = harvest_targets(q)
            if new_leads:
                sheet.append_rows(new_leads)
                total_added += len(new_leads)
                print(f"🚀 Записано в MEAT: {len(new_leads)} строк")
            else:
                print(f"💨 По запросу '{q}' ничего не выгорело.")
            time.sleep(5) # Пауза для маскировки
            
        print(f"🏁 Операция окончена. Всего добыто целей: {total_added}")
        
    except Exception as e:
        print(f"❌ Критическая ошибка в штабе: {e}")

if __name__ == "__main__":
    main()
