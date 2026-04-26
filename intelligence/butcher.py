import os
import json
import gspread
import requests
from bs4 import BeautifulSoup
from google.oauth2.service_account import Credentials
import time

def get_gspread_client():
    service_account_info = json.loads(os.environ.get('GOOGLE_API_KEY'))
    scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    creds = Credentials.from_service_account_info(service_account_info, scopes=scopes)
    return gspread.authorize(creds)

def harvest_targets(query):
    print(f"🕵️‍♂️ Попытка взлома Satu по запросу: {query}")
    # Используем мобильную версию сайта, её сложнее защитить от парсинга
    url = f"https://satu.kz/search?search_term={query.replace(' ', '+')}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"📡 Статус ответа: {response.status_code}")
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Печатаем кусок кода страницы для диагностики, если ничего не найдено
        items = soup.select('div[data-qaid="product_block"]')
        print(f"🔍 Найдено блоков на странице: {len(items)}")
        
        leads = []
        for item in items[:5]:
            try:
                name_elem = item.select_one('a[data-qaid="product_name"]')
                if not name_elem: continue
                
                name = name_elem.text.strip()
                link = "https://satu.kz" + name_elem['href']
                
                leads.append([
                    name, "Новый", "Satu.kz", link, 
                    time.strftime("%d.%m.%Y"), "Авто-поиск"
                ])
                print(f"➕ Цель обнаружена: {name}")
            except: continue
        return leads
    except Exception as e:
        print(f"⚠️ Ошибка при запросе: {e}")
        return []

def main():
    client = get_gspread_client()
    spreadsheet = client.open("STITCH_DATABASE_V1")
    sheet = spreadsheet.worksheet("MEAT")
    
    queries = ["пошив чехлов алматы", "реставрация кожи"]
    
    for q in queries:
        new_leads = harvest_targets(q)
        if new_leads:
            sheet.append_rows(new_leads)
            print(f"🚀 Записано в таблицу: {len(new_leads)} строк")
        else:
            print(f"💨 Бонд вернулся ни с чем по запросу: {q}")
        time.sleep(5)

if __name__ == "__main__":
    main()
