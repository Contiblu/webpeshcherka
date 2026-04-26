import os
import json
import gspread
import requests
from bs4 import BeautifulSoup
from google.oauth2.service_account import Credentials
import time

# 1. Авторизация
def get_gspread_client():
    service_account_info = json.loads(os.environ.get('GOOGLE_API_KEY'))
    scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    creds = Credentials.from_service_account_info(service_account_info, scopes=scopes)
    return gspread.authorize(creds)

# 2. Логика "Мясника": Парсинг Satu.kz
def harvest_satu(query):
    print(f"🔎 Охотник вышел на след: {query}")
    url = f"https://satu.kz/search?search_term={query}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    targets = []
    # Ищем блоки компаний на странице поиска
    for item in soup.select('div[data-qaid="product_block"]')[:5]: # Берем первые 5 для теста
        try:
            name = item.select_one('a[data-qaid="product_name"]').text.strip()
            link = item.select_one('a[data-qaid="product_name"]')['href']
            price = item.select_one('span[data-qaid="product_price"]').text.strip() if item.select_one('span[data-qaid="product_price"]') else "По запросу"
            
            targets.append([name, "Satu.kz", price, f"https://satu.kz{link}"])
        except:
            continue
    return targets

def main():
    try:
        client = get_gspread_client()
        spreadsheet = client.open("STITCH_DATABASE_V1")
        sheet = spreadsheet.worksheet("MEAT")
        
        # Список запросов для Алматы
        search_queries = ["вышивка на коже", "автоателье", "перетяжка салона"]
        
        for q in search_queries:
            results = harvest_satu(q)
            if results:
                sheet.append_rows(results)
                print(f"✅ Записано {len(results)} строк по запросу: {q}")
            time.sleep(2) # Пауза, чтобы не забанили
            
    except Exception as e:
        print(f"❌ Критическая ошибка: {e}")

if __name__ == "__main__":
    main()
