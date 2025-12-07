from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS so the Chrome extension can access it

# Load lightweight sentence embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

@app.route("/embed", methods=["POST"])
def embed():
    data = request.get_json()
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        embedding = model.encode(text).tolist()
        return jsonify({"embedding": embedding})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5005, debug=True)
