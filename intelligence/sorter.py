import os
import json
import gspread
from google.oauth2.service_account import Credentials

def get_gspread_client():
    service_account_info = json.loads(os.environ.get('GOOGLE_API_KEY'))
    creds = Credentials.from_service_account_info(service_account_info, ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'])
    return gspread.authorize(creds)

def main():
    client = get_gspread_client()
    spreadsheet = client.open("STITCH_DATABASE_V1")
    
    raw_sheet = spreadsheet.worksheet("MEAT")
    pot_sheet = spreadsheet.worksheet("GOLDENBOYS")
    comp_sheet = spreadsheet.worksheet("ANGRYBOYS")
    
    data = raw_sheet.get_all_values()[1:] 
    if not data:
        print("📭 Лист MEAT пуст. Сортировать нечего.")
        return

    golden_boys = []
    angry_boys = []
    
    # Ключевые слова для фильтрации конкурентов
    comp_keywords = ['кесте', 'вышив', 'шеврон', 'логотип', 'embroidery', 'нашив', 'patch']
    
    for row in data:
        # Анализируем название (A) и заметки Мясника (F)
        text_for_analysis = (row[0] + " " + row[5]).lower()
        
        # Подготавливаем строку для вставки (копируем всё, кроме последней колонки)
        new_row = row[:5]
        
        if any(word in text_for_analysis for word in comp_keywords):
            # Рецензия для ANGRYBOYS
            new_row.append("⚠️ Завистник: обнаружены услуги вышивки. Требуется анализ цен и качества.")
            angry_boys.append(new_row)
        else:
            # Рецензия для GOLDENBOYS
            new_row.append("💎 Потенциал: профильное ателье/сервис. Нужен поиск WhatsApp для оффера по вышивке.")
            golden_boys.append(new_row)

    # Раскладываем по местам
    if golden_boys:
        pot_sheet.append_rows(golden_boys)
        print(f"💰 Добавлено {len(golden_boys)} потенциалов в GOLDENBOYS.")
    
    if angry_boys:
        comp_sheet.append_rows(angry_boys)
        print(f"🔥 Добавлено {len(angry_boys)} конкурентов в ANGRYBOYS.")

    # Зачистка MEAT
    raw_sheet.delete_rows(2, len(data) + 1)
    print("🧹 Цех MEAT пуст и вымыт. Смена Сортировщика окончена.")

if __name__ == "__main__":
    main()
