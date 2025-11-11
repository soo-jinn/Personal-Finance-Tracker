import os
from flask import Flask, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from sqlalchemy import exc
import datetime

# --- Configuration ---

# Get the absolute path of the directory where this script is located
basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__, static_folder='.', static_url_path='')
# Allow requests from any origin
CORS(app) 

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'finance_tracker.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

# --- Database Models (Schema) ---

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    # Relationships
    transactions = db.relationship('Transaction', backref='user', lazy=True, cascade="all, delete-orphan")
    categories = db.relationship('Category', backref='user', lazy=True, cascade="all, delete-orphan")
    goals = db.relationship('Goal', backref='user', lazy=True, cascade="all, delete-orphan")

    def __init__(self, username, password):
        self.username = username
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False) # "Income" or "Expense"
    category_id = db.Column(db.String(50), nullable=False)
    category_name = db.Column(db.String(100), nullable=False)
    category_color = db.Column(db.String(20), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.String(20), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "category_id": self.category_id,
            "category_name": self.category_name,
            "category_color": self.category_color,
            "amount": self.amount,
            "date": self.date,
            "user_id": self.user_id
        }

class Category(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    color = db.Column(db.String(20), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "user_id": self.user_id
        }

class Goal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    target_amount = db.Column(db.Float, nullable=False)
    current_savings = db.Column(db.Float, default=0)
    deadline = db.Column(db.String(20), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "target_amount": self.target_amount,
            "current_savings": self.current_savings,
            "deadline": self.deadline,
            "user_id": self.user_id
        }

def get_user_from_header():
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return None
    return User.query.get(int(user_id))

# --- Authentication Routes ---

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    try:
        new_user = User(username=username, password=password)
        db.session.add(new_user)
        db.session.commit()
        
        # Add default categories for the new user
        default_categories = [
            {'id': 'c1', 'name': 'Food', 'color': '#FF6384'},
            {'id': 'c2', 'name': 'Transportation', 'color': '#36A2EB'},
            {'id': 'c3', 'name': 'Utilities', 'color': '#FFCE56'},
            {'id': 'c4', 'name': 'Entertainment', 'color': '#4BC0C0'},
            {'id': 'c5', 'name': 'Salary', 'color': '#9966FF'},
            {'id': 'c6', 'name': 'Other', 'color': '#C9CBCF'}
        ]
        
        for cat_data in default_categories:
            new_cat = Category(
                id=f"{new_user.id}-{cat_data['id']}", 
                name=cat_data['name'], 
                color=cat_data['color'], 
                user_id=new_user.id
            )
            db.session.add(new_cat)
        
        db.session.commit()
        
        return jsonify({"message": "User registered successfully", "userId": new_user.id}), 201
        
    except exc.IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Username already exists"}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        return jsonify({"message": "Login successful", "userId": user.id, "username": user.username}), 200
    else:
        return jsonify({"error": "Invalid username or password"}), 401

# --- API Routes (Data) ---

@app.route('/api/data', methods=['GET'])
def get_all_data():
    user = get_user_from_header()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    
    transactions = [t.to_dict() for t in user.transactions]
    categories = [c.to_dict() for c in user.categories]
    goals = [g.to_dict() for g in user.goals]
    
    return jsonify({
        "transactions": transactions,
        "categories": categories,
        "goals": goals
    }), 200

# --- Transaction CRUD ---

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    user = get_user_from_header()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
        
    data = request.get_json()
    
    # Get category details
    category = Category.query.filter_by(id=data.get('category_id'), user_id=user.id).first()
    if not category:
        return jsonify({"error": "Category not found"}), 404

    try:
        new_transaction = Transaction(
            type=data.get('type'),
            category_id=category.id,
            category_name=category.name,
            category_color=category.color,
            amount=float(data.get('amount')),
            date=data.get('date'),
            user_id=user.id
        )
        db.session.add(new_transaction)
        db.session.commit()
        return jsonify(new_transaction.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/transactions/<int:id>', methods=['PUT'])
def update_transaction(id):
    user = get_user_from_header()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
        
    transaction = Transaction.query.filter_by(id=id, user_id=user.id).first()
    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404
        
    data = request.get_json()
    
    # Get category details
    category = Category.query.filter_by(id=data.get('category_id'), user_id=user.id).first()
    if not category:
        return jsonify({"error": "Category not found"}), 404
        
    try:
        transaction.type = data.get('type')
        transaction.category_id = category.id
        transaction.category_name = category.name
        transaction.category_color = category.color
        transaction.amount = float(data.get('amount'))
        transaction.date = data.get('date')
        db.session.commit()
        return jsonify(transaction.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/transactions/<int:id>', methods=['DELETE'])
def delete_transaction(id):
    user = get_user_from_header()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
        
    transaction = Transaction.query.filter_by(id=id, user_id=user.id).first()
    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404
        
    try:
        db.session.delete(transaction)
        db.session.commit()
        return jsonify({"message": "Transaction deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/categories', methods=['POST'])
def add_category():
    user = get_user_from_header()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.get_json()
    try:
        new_category = Category(
            id=f"{user.id}-{data.get('id')}", # Create a user-specific unique ID
            name=data.get('name'),
            color=data.get('color'),
            user_id=user.id
        )
        db.session.add(new_category)
        db.session.commit()
        return jsonify(new_category.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/categories/<string:id>', methods=['PUT'])
def update_category(id):
    user = get_user_from_header()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    
    category = Category.query.filter_by(id=id, user_id=user.id).first()
    if not category:
        return jsonify({"error": "Category not found"}), 404
        
    data = request.get_json()
    try:
        category.name = data.get('name')
        category.color = data.get('color')
        db.session.commit()
        return jsonify(category.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/categories/<string:id>', methods=['DELETE'])
def delete_category(id):
    user = get_user_from_header()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    category = Category.query.filter_by(id=id, user_id=user.id).first()
    if not category:
        return jsonify({"error": "Category not found"}), 404
        
    try:

        db.session.delete(category)
        db.session.commit()
        return jsonify({"message": "Category deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/goals', methods=['POST'])
def add_goal():
    user = get_user_from_header()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.get_json()
    try:
        new_goal = Goal(
            name=data.get('name'),
            target_amount=float(data.get('target_amount')),
            current_savings=float(data.get('current_savings', 0)),
            deadline=data.get('deadline'),
            user_id=user.id
        )
        db.session.add(new_goal)
        db.session.commit()
        return jsonify(new_goal.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/goals/<int:id>', methods=['PUT'])
def update_goal(id):
    user = get_user_from_header()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    
    goal = Goal.query.filter_by(id=id, user_id=user.id).first()
    if not goal:
        return jsonify({"error": "Goal not found"}), 404
        
    data = request.get_json()
    try:
        goal.name = data.get('name')
        goal.target_amount = float(data.get('target_amount'))
        goal.current_savings = float(data.get('current_savings'))
        goal.deadline = data.get('deadline')
        db.session.commit()
        return jsonify(goal.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/goals/<int:id>', methods=['DELETE'])
def delete_goal(id):
    user = get_user_from_header()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    goal = Goal.query.filter_by(id=id, user_id=user.id).first()
    if not goal:
        return jsonify({"error": "Goal not found"}), 404
        
    try:
        db.session.delete(goal)
        db.session.commit()
        return jsonify({"message": "Goal deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# --- Serve Frontend ---

@app.route('/')
def serve_frontend():
    # This serves the finance_tracker.html file
    return send_from_directory(app.static_folder, 'finance_tracker.html')

# --- Main Execution ---

if __name__ == '__main__':
    # Create the database and tables if they don't exist
    with app.app_context():
        db.create_all()
    
    # Run the app
    app.run(debug=True)
