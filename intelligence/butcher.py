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
    print(f"🕵️‍♂️ Бонд ищет потенциалов по запросу: {query}")
    url = f"https://satu.kz/search?search_term={query}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    leads = []
    # Берем блоки компаний, которые реально что-то предлагают
    for item in soup.select('div[data-qaid="product_block"]')[:7]: 
        try:
            name = item.select_one('a[data-qaid="product_name"]').text.strip()
            link = "https://satu.kz" + item.select_one('a[data-qaid="product_name"]')['href']
            desc = item.select_one('span[data-qaid="product_price"]').text.strip() if item.select_one('span[data-qaid="product_price"]') else "Цена не указана"
            
            # Формируем строку строго под наши новые столбцы A-F
            leads.append([
                name,           # A: Потенциал
                "Новый",        # B: Статус
                "Satu.kz",      # C: Площадка
                link,           # D: Контакт/Ссылка
                time.strftime("%d.%m.%Y"), # E: Дата захвата
                f"Предложение: {desc}"      # F: Заметки
            ])
        except:
            continue
    return leads

def main():
    try:
        client = get_gspread_client()
        spreadsheet = client.open("STITCH_DATABASE_V1")
        sheet = spreadsheet.worksheet("MEAT") # Теперь это лист для потенциалов
        
        # Целевые запросы для поиска клиентов (тех, кто заказывает вышивку)
        queries = ["пошив чехлов алматы", "реставрация кожи алматы", "тюнинг салона"]
        
        for q in queries:
            new_leads = harvest_targets(q)
            if new_leads:
                sheet.append_rows(new_leads)
                print(f"✅ В папку 'MEAT' добавлено {len(new_leads)} потенциальных клиентов.")
            time.sleep(3)
            
    except Exception as e:
        print(f"❌ Ошибка в штабе: {e}")

if __name__ == "__main__":
    main()
