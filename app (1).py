import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    # Таблица заказов
    cursor.execute('''CREATE TABLE IF NOT EXISTS orders 
                      (id INTEGER PRIMARY KEY AUTOINCREMENT, customer TEXT, text TEXT, status TEXT DEFAULT 'Ожидает')''')
    # Таблица сообщений
    cursor.execute('''CREATE TABLE IF NOT EXISTS messages 
                      (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, sender TEXT, text TEXT, role TEXT)''')
    # Проверка на наличие колонки status (на случай обновления старой базы)
    try:
        cursor.execute("ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'Ожидает'")
    except:
        pass
    conn.commit()
    conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    name = data.get("name", "Гость")
    code = data.get("code", "")
    role = "moderator" if code == "Immoderator12" else "user"
    return jsonify({"name": name, "role": role})

@app.route('/api/order', methods=['POST'])
def create_order():
    data = request.json
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("INSERT INTO orders (customer, text, status) VALUES (?, ?, 'Ожидает')", 
                   (data.get("name"), data.get("text")))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})

@app.route('/api/orders', methods=['GET'])
def get_orders():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, customer, text, status FROM orders ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return jsonify([{"id": r[0], "customer": r[1], "text": r[2], "status": r[3]} for r in rows])

@app.route('/api/order/status', methods=['POST'])
def update_status():
    data = request.json
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE orders SET status = ? WHERE id = ?", (data.get("status"), data.get("order_id")))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})

@app.route('/api/chat/<int:order_id>', methods=['GET'])
def get_chat(order_id):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT sender, text, role FROM messages WHERE order_id = ? ORDER BY id ASC", (order_id,))
    rows = cursor.fetchall()
    conn.close()
    return jsonify([{"sender": r[0], "text": r[1], "role": r[2]} for r in rows])

@app.route('/api/chat/send', methods=['POST'])
def send_msg():
    data = request.json
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("INSERT INTO messages (order_id, sender, text, role) VALUES (?, ?, ?, ?)", 
                   (data.get("order_id"), data.get("sender"), data.get("text"), data.get("role")))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=10000)
