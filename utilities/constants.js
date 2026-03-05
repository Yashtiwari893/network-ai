const constants = {
    DEFAULT_DB: "exhibitor",
    VECTOR_INDEX: "vector_index", // name of the Atlas vector index
    MODELS: {
        user: "user",
        category: "category",
        connectionRequest: "connectionrequest"  // maps to connection_requests via Mongoose pluralisation
    }
}

module.exports = constants