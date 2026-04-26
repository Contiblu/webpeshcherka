import os
import json
import gspread
from google.oauth2.service_account import Credentials

# 1. Авторизация через секрет GitHub
def get_gspread_client():
    # Гитхаб подставит наш JSON в переменную окружения
    service_account_info = json.loads(os.environ.get('GOOGLE_API_KEY'))
    
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    
    creds = Credentials.from_service_account_info(service_account_info, scopes=scopes)
    return gspread.authorize(creds)

def main():
    try:
        client = get_gspread_client()
        # Имя твоей таблицы (проверь, чтобы совпадало один в один!)
        spreadsheet = client.open("STITCH_DATABASE_V1")
        sheet = spreadsheet.worksheet("MEAT")
        
        print("✅ Подключение к таблице успешно!")
        
        # Пример записи: Мясник подает признаки жизни
        sheet.append_row(["Тестовый запуск", "Бот в сети", "Ожидание данных", "Всё пучком!"])
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    main()