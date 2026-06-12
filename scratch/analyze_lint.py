import json
import sys

def main():
    try:
        with open('lint-results.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print("Error reading json:", e)
        return
    
    total_errors = 0
    total_warnings = 0
    rule_counts = {}
    file_counts = []
    
    for item in data:
        file_path = item.get('filePath', '')
        messages = item.get('messages', [])
        
        if not messages:
            continue
            
        file_errors = sum(1 for m in messages if m.get('severity') == 2)
        file_warnings = sum(1 for m in messages if m.get('severity') == 1)
        total_errors += file_errors
        total_warnings += file_warnings
        
        for msg in messages:
            rule_id = msg.get('ruleId', 'unknown')
            rule_counts[rule_id] = rule_counts.get(rule_id, 0) + 1
            
        file_counts.append({
            'file': file_path.split('akitsolution-store-main\\\\')[-1],
            'errors': file_errors,
            'warnings': file_warnings
        })
        
    print(f"Total Errors: {total_errors}, Total Warnings: {total_warnings}")
    print("\nRules:")
    for r, c in sorted(rule_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {r}: {c}")
        
    print("\nTop 10 Files with most issues:")
    for item in sorted(file_counts, key=lambda x: x['errors'] + x['warnings'], reverse=True)[:10]:
        print(f"  {item['file']}: {item['errors']} errors, {item['warnings']} warnings")

if __name__ == '__main__':
    main()
