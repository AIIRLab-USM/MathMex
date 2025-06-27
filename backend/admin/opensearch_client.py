from opensearchpy import OpenSearch, RequestsHttpConnection

class OpenSearchClient:
    def __init__(self, host, port, username, password):
        """
        Initializes the OpenSearch client and connects to the cluster.
        """
        self.client = OpenSearch(
            hosts=[{'host': host, 'port': port}],
            http_auth=(username, password),
            use_ssl=True,
            verify_certs=True,
            connection_class=RequestsHttpConnection
        )

    def check_health(self):
        """
        Checks the health of the OpenSearch cluster.
        """
        return self.client.cluster.health()

    def create_index(self, index_name):
        """
        Creates a new index in OpenSearch.
        """
        if not self.client.indices.exists(index=index_name):
            self.client.indices.create(index=index_name)
            return True
        return False

    def add_document(self, index_name, document):
        """
        Adds a new document to the specified index.
        """
        response = self.client.index(index=index_name, body=document)
        return response.get('_id')

    def search(self, index_name, query):
        """
        Searches for documents in the specified index.
        """
        search_body = {
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": ["*"]
                }
            }
        }
        response = self.client.search(index=index_name, body=search_body)
        return response['hits']['hits']
