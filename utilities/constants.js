const constants = {
  DEFAULT_DB: "exhibitor",
  VECTOR_INDEX: "vector_index", // Atlas Vector Search index name

  MODELS: {
    user:               "user",
    category:           "category",
    connectionRequest:  "connectionrequest",     // maps to connection_requests via Mongoose pluralisation
    seenRecommendation: "seenrecommendation",    // NEW — seen_recommendations collection
    dailyLimit:         "dailylimit",            // NEW — daily_limits collection
  },

  // ─── Recommendation Rules ────────────────────────────────────────────
  DAILY_RECOMMENDATION_LIMIT: 5,                // Ek user ek din mein max 5 recommendations

  RECOMMENDATION_CATEGORIES: ["Startup", "Investor", "Others"],

  // ─── 11za WhatsApp Template Names ───────────────────────────────────
  TEMPLATES: {
    connectionRequest: "ivy_connection_request", // User B ko request notification
    matchConfirmed:    "ivy_match_confirmed",     // Dono ko connection confirmed
    requestDeclined:   "ivy_request_declined",    // User A ko reject notification (optional)
  }
};

module.exports = constants;
