# OpenSearch/Flask Backend
### This is a simple Flask backend that provides a REST API for interacting with an OpenSearch cluster.

## Setup

  - Install the required Python packages:

  ``` bash
  pip install -r requirements.txt
  ```
  - Configure the OpenSearch connection:

      - In app.py, update the following variables with your OpenSearch cluster details:
      ``` bash
      OS_HOST: The hostname or IP address of your OpenSearch cluster.

      OS_PORT: The port number of your OpenSearch cluster (usually 9200).

      OS_USERNAME: The username for authentication.

      OS_PASSWORD: The password for authentication.
      ```
## Running the Application

- To run the Flask application, use the following command:
``` bash
python app.py
```
The application will be available at http://127.0.0.1:5000.

## API Endpoints
``` bash
GET /health: Checks the health of the OpenSearch cluster.

POST /index: Creates a new index.

    Body: {"index_name": "your_index_name"}

POST /document: Adds a new document to an index.

    Body: {"index_name": "your_index_name", "document": {"field1": "value1", "field2": "value2"}}

GET /search: Searches for documents in an index.

    Query Parameters: index_name=your_index_name&q=your_query
```