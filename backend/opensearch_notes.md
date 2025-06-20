# OpenSearch

## Basics

- documents are JSON files that store information as text or structured data.
- A document can be thought of as a row from a traditional database, i.e. - A DB of students, each doc (row) could be an individual student

``` JSON
{
  "name": "John Doe",
  "gpa": 3.89,
  "grad_year": 2022
}
```
- An *index* is a collection of *documents*

### Clusters and Nodes
- OpenSearch is meant to be a distributed Search Engine
- Each server where it is run is known as a *node*
- however many *nodes* are in your search engine make up your *cluster*
- 
