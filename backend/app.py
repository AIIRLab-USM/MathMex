# app.py
# --- Merged Imports ---
from flask import Flask, jsonify, request
from opensearchpy import OpenSearch, RequestsHttpConnection
import warnings
from flask_cors import CORS
import saytex

# --- Flask App Initialization & CORS ---
app = Flask(__name__)
# Enable Cross-Origin Resource Sharing (CORS) for specified frontend origins
CORS(app, origins=["https://mathmex.com", "https://www.mathmex.com"])

# --- OpenSearch Client Configuration ---
OPENSEARCH_HOST = 'localhost'
OPENSEARCH_PORT = 9200
OPENSEARCH_USER = 'public_user'
OPENSEARCH_PASSWORD = 'ThisIsThePublicUserPassW0rd'
INDEX_NAME = 'public-articles'

# Suppress the security warning from using a self-signed cert in development
warnings.filterwarnings('ignore', message='Unverified HTTPS request')

def get_opensearch_client():
    """Initializes and returns the OpenSearch client."""
    client = OpenSearch(
        hosts=[{'host': OPENSEARCH_HOST, 'port': OPENSEARCH_PORT}],
        http_auth=(OPENSEARCH_USER, OPENSEARCH_PASSWORD),
        use_ssl=True,
        verify_certs=False,
        ssl_show_warn=False,
        connection_class=RequestsHttpConnection
    )
    return client

# --- API Endpoints ---

@app.route("/")
def home():
    """Displays the most recent search terms for debugging purposes."""
    latex = app.config.get("last_latex", None)
    function_latex = app.config.get("last_function_latex", None)
    latex_cleaned = latex.replace("\\ ", " ") if latex else None
    function_latex_cleaned = function_latex.replace("\\ ", " ") if function_latex else None

    msg = "Hello, MathMex & OpenSearch Backend!<br>"
    msg += f"Last CLEANED LaTeX string from frontend: <code>{latex_cleaned if latex_cleaned is not None else 'None'}</code><br>"
    msg += f"Last function/operator from frontend: <code>{function_latex_cleaned if function_latex_cleaned is not None else 'None'}</code><br>"
    return msg

@app.route("/search", methods=["POST"])
def search():
    """
    Receives a search request, queries OpenSearch, and returns the results.
    """
    data = request.get_json()
    latex_query = data.get("latex", "")
    function_latex = data.get("functionLatex", "")

    # Store latest values for the home page debugger
    app.config["last_latex"] = latex_query
    app.config["last_function_latex"] = function_latex
    
    print(f"Received search request with LaTeX: {latex_query}")

    if not latex_query:
        return jsonify({"results": []})

    # Initialize the OpenSearch client
    client = get_opensearch_client()

    # Construct the OpenSearch Query DSL
    query_body = {
        "size": 20,
        "query": {
            "multi_match": {
                "query": latex_query,
                "fields": ["title", "content"]
            }
        }
    }

    try:
        # Execute the search query
        response = client.search(
            body=query_body,
            index=INDEX_NAME
        )
        
        # Format results, adding the functionLatex to each result for the frontend
        results = []
        for hit in response['hits']['hits']:
            result_item = hit['_source']
            # The 'formula' for display is assumed to be the original query latex
            result_item['formula'] = latex_query 
            result_item['functionLatex'] = function_latex 
            results.append(result_item)
            
        return jsonify({"results": results})

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({"error": "Could not connect to or search the database."}), 500


@app.route('/speech-to-latex', methods=['POST'])
def speech_to_latex():
    """Converts a spoken text string into a LaTeX formula."""
    data = request.get_json()
    text = data.get('text')
    if not text:
        return jsonify({'error': 'No text provided'}), 400

    # Pre-process text to be more SayTeX-friendly
    replacements = {
        "plus": "+", "minus": "-", "times": "*", "divided by": "/",
        "over": "/", "equals": "=", "squared": "^2", "cubed": "^3",
    }
    for word, symbol in replacements.items():
        text = text.replace(symbol, word)

    try:
        st = saytex.Saytex()
        latex_string = st.to_latex(text)
        return jsonify({'latex': latex_string})
    except Exception as e:
        print(f"Error during LaTeX conversion: {e}")
        return jsonify({'error': str(e)}), 500

# --- Main execution block ---
if __name__ == '__main__':
    # Use port 5001 to avoid conflicts and run in debug mode for development.
    app.run(port=5001, debug=True)

