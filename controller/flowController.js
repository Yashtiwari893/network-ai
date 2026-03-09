const mongoConnection = require("../utilities/connetion");
const responseManager = require("../utilities/responseManager");
const flowModel = require("../models/flow.model");
const userModel = require("../models/user.model");
const connectionRequestModel = require("../models/connectionRequest.model");
const constants = require("../utilities/constants");
const categoryModel = require("../models/category.model");
const axios = require("axios");
const { GoogleGenAI } = require('@google/genai')
const mongoose = require("mongoose");

exports.checkUserProfile = async (req, res) => {
  try {
    const primary = mongoConnection.useDb(constants.DEFAULT_DB);
    const { phone } = req.body;
    if (!phone) {
      return responseManager.onBadRequest("Phone number required", res);
    }
    const user = await primary
      .model(constants.MODELS.user, userModel)
      .findOne({ phone: phone })
      .select("name company_name bio interests consent phone link1 link2");

    if (user) {
      return responseManager.onSuccess("Profile exists", user, res);
    } else {
      return responseManager.notFoundRequest("Profile not found", res);
    }
  } catch (error) {
    console.log(":::::error:::::", error);
    return responseManager.internalServer(error, res);
  }
};

async function main(textToEmbed) {
  const embedding = await getEmbedding(textToEmbed);
  return embedding
}


function formatPhoneFor11za(phone) {
  if (!phone) return phone;
  const cleaned = phone.toString().replace(/\D/g, ''); // sirf digits rakhne ke liye
  // Already 12 digit with 91 prefix
  if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned;
  // 10 digit Indian number — add 91
  if (cleaned.length === 10) return '91' + cleaned;
  // Koi aur format — as-is return karo
  return cleaned;
}

async function getEmbedding(text) {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // Call embedContent
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
    });
    if (!response.embeddings || response.embeddings.length === 0) {
      console.error("No embeddings returned");
      return null;
    }

    // Return the vector values (first embedding)
    return response.embeddings[0].values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
}

exports.addUservector = async (req, res) => {
  try {
    const primary = mongoConnection.useDb(constants.DEFAULT_DB);
    let { name, company_name, category, consent, phone, link1, link2, bio } = req.body;
    console.log(":::::req.body:::::", JSON.stringify(req.body));
    // Ensure category is an array
    if (!Array.isArray(category)) {
      category = [category];
    }

    let bio_vector = null;
    bio_vector = await main(bio);

    const obj = {
      name,
      company_name,
      category,
      consent,
      phone,
      link1,
      link2,
      bio,
      bio_vector,
      recommendationsShown: [],
      searchCount: 0
    };

    const userData = await primary
      .model(constants.MODELS.user, userModel)
      .create(obj);

    // console.log("User created successfully:", userData._id);
    return responseManager.onSuccess("Data added successfully", userData, res);
  } catch (error) {
    console.error("Error adding user:", error?.response?.data || error);
    return responseManager.internalServer(error, res);
  }
};

exports.addUser = async (req, res) => {
  try {
    const primary = mongoConnection.useDb(constants.DEFAULT_DB);
    let { name, company_name, category, consent, phone, link1, link2, bio } = req.body;

    if (!Array.isArray(category)) {
      category = [category];
    }

    let bio_vector = null;
    bio_vector = await main(bio);

    const obj = {
      name,
      company_name,
      category,
      consent,
      phone,
      link1,
      link2,
      bio,
      bio_vector,
    };

    const userData = await primary
      .model(constants.MODELS.user, userModel)
      .create(obj);

    console.log("User created successfully:", userData._id);
    return responseManager.onSuccess("Data added successfully", userData, res);
  } catch (error) {
    console.error("Error adding user:", error?.response?.data || error);
    return responseManager.internalServer(error, res);
  }
};

// exports.addUser = async (req, res) => {
//     try {
//         const primary = mongoConnection.useDb(constants.DEFAULT_DB);
//         let { name, company_name, category, consent, phone, link1, link2, bio } = req.body;
//         console.log('=======req.body', JSON.stringify(req.body))

//         const categoryArray = category
//             ? category.split(',').map(item => item.trim())
//             : [];
//         const obj = {
//             name,
//             company_name,
//             category: categoryArray,
//             consent,
//             phone,
//             link1,
//             link2,
//             bio
//         };
//         const userData = await primary
//             .model(constants.MODELS.user, userModel)
//             .create(obj);
//         return responseManager.onSuccess("Data added successfully", userData, res);
//     } catch (error) {
//         console.log(":::::error:::::", error);
//         return responseManager.internalServer(error, res);
//     }
// };

exports.updateUser = async (req, res) => {
  try {
    const primary = mongoConnection.useDb(constants.DEFAULT_DB);
    const { mobile } = req.params;

    const User = primary.model(constants.MODELS.user, userModel);

    const existingUser = await User.findOne({ phone: mobile }).lean();
    if (!existingUser) {
      return responseManager.onBadRequest("User not found", res);
    }

    let { phone, name, company_name, category, consent, link1, link2, bio } = req.body;
    console.log("=======req.body", JSON.stringify(req.body));

    if (category && !Array.isArray(category)) {
      category = [category];
    }

    const updateData = {
      ...(phone && { phone }),
      ...(name && { name }),
      ...(company_name && { company_name }),
      ...(category && { category }),
      ...(consent && { consent }),
      ...(link1 && { link1 }),
      ...(link2 && { link2 }),
      ...(bio && { bio })
    };

    if (bio) {
      try {
        const bio_vector = await main(bio);
        updateData.bio_vector = bio_vector;
        console.log("BIO Generated");
      } catch (err) {
        console.error("Error generating bio_vector:", err);
        return responseManager.internalServer("Failed to generate bio vector", res);
      }
    }

    const updatedUser = await User.findOneAndUpdate(
      { phone: mobile },
      { $set: updateData },
      { new: true }
    );

    return responseManager.onSuccess("Data updated successfully", updatedUser, res);
  } catch (error) {
    console.error(":::::error:::::", error);
    return responseManager.internalServer(error, res);
  }
};

// exports.updateUser = async (req, res) => {
//   try {
//     const primary = mongoConnection.useDb(constants.DEFAULT_DB);
//     let { mobile } = req.params;

//     const existingUser = await primary
//       .model(constants.MODELS.user, userModel)
//       .findOne({ phone: mobile })
//       .lean();

//     if (!existingUser) {
//       return responseManager.onBadRequest("User not found", res);
//     }
//     let { phone, name, company_name, category, consent, link1, link2, bio } = req.body;
//     console.log("=======req.body", JSON.stringify(req.body));

//     const updateData = {
//       ...(phone && { phone }),
//       ...(name && { name }),
//       ...(company_name && { company_name }),
//       ...(category && { category }),
//       ...(consent && { consent }),
//       ...(link1 && { link1 }),
//       ...(link2 && { link2 }),
//       ...(bio && { bio }),
//     };
//     const userData = await primary
//       .model(constants.MODELS.user, userModel)
//       .findOneAndUpdate(
//         { phone: mobile },
//         { $set: updateData },
//         { new: true }
//       );
//     return responseManager.onSuccess("Data updated successfully", userData, res);
//   } catch (error) {
//     console.log(":::::error:::::", error);
//     return responseManager.internalServer(error, res);
//   }
// };

exports.searchUser = async (req, res) => {
  try {
    const primary = mongoConnection.useDb(constants.DEFAULT_DB);
    const { search } = req.body;

    if (!search || search.trim() === "") {
      return responseManager.onBadRequest("Search term required", res);
    }
    const companyData = await primary.model(constants.MODELS.user, userModel).find({
      company_name: { $regex: search, $options: "i" }
    }).select("name company_name consent phone link1 link2");
    if (companyData.length > 0) {
      return responseManager.onSuccess("Search result", companyData, res);
    } else {
      return responseManager.onBadRequest("Data not found", res);
    }
  } catch (error) {
    console.log(":::::error:::::", error);
    return responseManager.internalServer(error, res);
  }
};

exports.searchUserByCategoryAndBio = async (req, res) => {
  try {
    const primary = mongoConnection.useDb(constants.DEFAULT_DB);
    let { categorySearch, bioSearch, phone } = req.body;

    if ((!categorySearch || categorySearch.length === 0) && (!bioSearch || bioSearch.trim() === "")) {
      return responseManager.onBadRequest("At least one search term required", res);
    }

    let query = {};
    if (categorySearch && categorySearch.length > 0) {
      if (typeof categorySearch === "string") {
        categorySearch = categorySearch.split(',').map(c => c.trim());
      }
      query.category = { $in: categorySearch.map(c => new RegExp(c, "i")) };
    }

    if (bioSearch && bioSearch.trim() !== "") {
      query.bio = { $regex: bioSearch, $options: "i" };
    }
    if (phone && phone.trim() !== "") {
      query.phone = { $ne: phone.trim() };
    }

    let users = await primary
      .model(constants.MODELS.user, userModel)
      .find({ ...query, alreadyShown: { $ne: true } })
      .sort({ searchCount: 1 })
      .lean();

    if (users.length === 0) {
      await primary
        .model(constants.MODELS.user, userModel)
        .updateMany(query, { $set: { alreadyShown: false } });

      users = await primary
        .model(constants.MODELS.user, userModel)
        .find(query)
        .sort({ searchCount: 1 })
        .lean();
    }

    if (users.length === 0) {
      return responseManager.onBadRequest("Data not found", res);
    }

    const minCount = users[0].searchCount;
    const candidates = users.filter(u => u.searchCount === minCount);
    const randomUser = candidates[Math.floor(Math.random() * candidates.length)];

    await primary
      .model(constants.MODELS.user, userModel)
      .updateOne(
        { _id: randomUser._id },
        { $inc: { searchCount: 1 }, $set: { alreadyShown: true } }
      );
    return responseManager.onSuccess("Search result", randomUser, res);
  } catch (error) {
    console.log(":::::error:::::", error);
    return responseManager.internalServer(error, res);
  }
};

exports.getCategoryByUser = async (req, res) => {
  try {
    const primary = mongoConnection.useDb(constants.DEFAULT_DB);
    const { phone } = req.body;
    const userData = await primary.model(constants.MODELS.user, userModel).findOne({ phone: phone }).select("category").lean();
    if (!userData) {
      return responseManager.onBadRequest("Data not found", res);
    }
    return responseManager.onSuccess("Data get successfully!", userData, res);
  } catch (error) {
    console.log(":::::error:::::", error);
    return responseManager.internalServer(error, res);
  }
}

// exports.getRecommendations = async (req, res) => {
//   const { userId } = req.body;
//   const primary = mongoConnection.useDb(constants.DEFAULT_DB);
//   const User = primary.model(constants.MODELS.user, userModel);

//   const SIM_THRESHOLD = 0.75; // minimum similarity
//   const TOP_N = 1;            // only 1 record at a time
//   const NUM_CANDIDATES = 200;

//   try {
//     const currentUser = await User.findById(userId).lean();
//     if (!currentUser) return res.status(404).json({ message: "User not found" });

//     const queryVec = Array.isArray(currentUser.bio_vector)
//       ? currentUser.bio_vector.map(Number)
//       : [];
//     if (!queryVec.length)
//       return res.status(400).json({ message: "User has no valid bio_vector" });

//     const categoryArray = Array.isArray(currentUser.category)
//       ? currentUser.category
//       : (currentUser.category ? [currentUser.category] : []);

//     const shownIds = (currentUser.recommendationsShown || []).map(id =>
//       mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
//     );
//     const userObjectId = new mongoose.Types.ObjectId(userId);

//     // --- Step 1: Fetch candidates excluding self and already shown
//     const pipeline = [
//       {
//         $vectorSearch: {
//           index: "vector_index",
//           path: "bio_vector",
//           queryVector: queryVec,
//           numCandidates: NUM_CANDIDATES,
//           limit: NUM_CANDIDATES,
//           filter: { category: { $in: categoryArray } }
//         }
//       },
//       { $addFields: { vsScore: { $meta: "vectorSearchScore" } } },
//       {
//         $match: {
//           _id: { $ne: userObjectId, $nin: shownIds }
//         }
//       },
//       {
//         $project: {
//           name: 1, link1: 1, link2: 1, phone: 1,
//           bio: 1, bio_vector: 1, category: 1
//         }
//       }
//     ];

//     let candidates = await User.aggregate(pipeline);

//     // --- Step 2: Cosine similarity
//     const cosine = (a, b) => {
//       let dot = 0, na = 0, nb = 0;
//       for (let i = 0; i < a.length; i++) {
//         const va = Number(a[i]) || 0, vb = Number(b[i]) || 0;
//         dot += va * vb; na += va * va; nb += vb * vb;
//       }
//       return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : -1;
//     };

//     // --- Step 3: Calculate similarity
//     const withSim = candidates.map(c => {
//       const candVec = Array.isArray(c.bio_vector) ? c.bio_vector.map(Number) : [];
//       return { ...c, similarity: cosine(queryVec, candVec) };
//     });

//     // --- Step 4: Filter strong matches & sort
//     let recommendations = withSim
//       .filter(x => x.similarity >= SIM_THRESHOLD)
//       .sort((a, b) => b.similarity - a.similarity)
//       .slice(0, NUM_CANDIDATES);

//     // --- Step 5: If no new matches, reset and rerun
//     if (recommendations.length === 0 && shownIds.length > 0) {
//       await User.findByIdAndUpdate(userId, { $set: { recommendationsShown: [] } });
//       return exports.getRecommendations(req, res);
//     }

//     // --- Step 6: Pick the next one (first record)
//     let nextRecommendation = recommendations[0];

//     // --- Step 7: If nothing found even after reset
//     if (!nextRecommendation) {
//       return res.json({ message: "No matching recommendations found", recommendations: [] });
//     }

//     // --- Step 8: Save shown recommendation
//     await User.updateOne(
//       { _id: userId },
//       {
//         $addToSet: { recommendationsShown: nextRecommendation._id },
//         $inc: { searchCount: 1 }
//       }
//     );

//     // --- Step 9: Remove bio_vector before sending
//     const { bio_vector, ...safeRecommendation } = nextRecommendation;

//     return res.json({
//       recommendations: [safeRecommendation],
//       totalShown: (currentUser.recommendationsShown?.length || 0) + 1,
//       searchCount: (currentUser.searchCount || 0) + 1
//     });

//   } catch (error) {
//     console.error("Error getting recommendations:", error);
//     return res.status(500).json({ message: "Server error", error: error.message });
//   }
// };


// New
// exports.getRecommendations = async (req, res) => {
//   const { userId } = req.body;
//   const primary = mongoConnection.useDb(constants.DEFAULT_DB);
//   const User = primary.model(constants.MODELS.user, userModel);

//   const SIM_THRESHOLD = 0.75; // strong matches only
//   const TOP_N = 3;             // top 3 users
//   const NUM_CANDIDATES = 200;

//   try {
//     const currentUser = await User.findById(userId).lean();
//     if (!currentUser) return res.status(404).json({ message: "User not found" });

//     const queryVecRaw = currentUser.bio_vector;
//     if (!Array.isArray(queryVecRaw) || !queryVecRaw.length)
//       return res.status(400).json({ message: "User has no valid bio_vector" });

//     const queryVec = queryVecRaw.map(Number);
//     const categoryArray = Array.isArray(currentUser.category)
//       ? currentUser.category
//       : (currentUser.category ? [currentUser.category] : []);

//     // Ensure recommendationsShown exists
//     const shownIds = (currentUser.recommendationsShown || []).map(id => {
//       try { return mongoose.Types.ObjectId(id); } catch { return id; }
//     });

//     const userObjectId = new mongoose.Types.ObjectId(userId);

//     // 🔹 Fetch candidates excluding self and already shown
//     const pipeline = [
//       {
//         $vectorSearch: {
//           index: "vector_index",
//           path: "bio_vector",
//           queryVector: queryVec,
//           numCandidates: NUM_CANDIDATES,
//           limit: NUM_CANDIDATES,
//           filter: { category: { $in: categoryArray } }
//         }
//       },
//       { $addFields: { vsScore: { $meta: "vectorSearchScore" } } },
//       {
//         $match: {
//           _id: { $ne: userObjectId, $nin: shownIds }  // <-- exclude self + shown
//         }
//       },
//       {
//         $project: {
//           name: 1, link1: 1, link2: 1, phone: 1,
//           bio: 1, bio_vector: 1, category: 1, vsScore: 1
//         }
//       }
//     ];

//     const candidates = await User.aggregate(pipeline);

//     // 🔹 Cosine similarity
//     const cosine = (a, b) => {
//       if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return -1;
//       let dot = 0, na = 0, nb = 0;
//       for (let i = 0; i < a.length; i++) {
//         const va = Number(a[i]) || 0;
//         const vb = Number(b[i]) || 0;
//         dot += va * vb;
//         na += va * va;
//         nb += vb * vb;
//       }
//       if (na === 0 || nb === 0) return -1;
//       return dot / (Math.sqrt(na) * Math.sqrt(nb));
//     };

//     // 🔹 Compute similarity
//     let withSim = candidates.map(c => {
//       const candVec = Array.isArray(c.bio_vector) ? c.bio_vector.map(Number) : [];
//       const sim = (candVec.length === queryVec.length) ? cosine(queryVec, candVec) : -1;
//       return { ...c, similarity: sim };
//     });

//     // 🔹 Keep only strong matches
//     let recommendations = withSim
//       .filter(x => x.similarity >= SIM_THRESHOLD)
//       .sort((a, b) => b.similarity - a.similarity)
//       .slice(0, TOP_N);

//     // 🔹 If no matches left (all already shown), reset shown and rerun
//     if (recommendations.length === 0 && shownIds.length > 0) {
//       await User.findByIdAndUpdate(currentUser._id, { $set: { recommendationsShown: [] } });

//       const rerunPipeline = [
//         {
//           $vectorSearch: {
//             index: "vector_index",
//             path: "bio_vector",
//             queryVector: queryVec,
//             numCandidates: NUM_CANDIDATES,
//             limit: NUM_CANDIDATES,
//             filter: { category: { $in: categoryArray } }
//           }
//         },
//         { $addFields: { vsScore: { $meta: "vectorSearchScore" } } },
//         {
//           $match: { _id: { $ne: userObjectId } } // still exclude self
//         },
//         {
//           $project: {
//             name: 1, link1: 1, link2: 1, phone: 1,
//             bio: 1, bio_vector: 1, category: 1, vsScore: 1
//           }
//         }
//       ];

//       const rerunCandidates = await User.aggregate(rerunPipeline);

//       const rerunWithSim = rerunCandidates.map(c => {
//         const candVec = Array.isArray(c.bio_vector) ? c.bio_vector.map(Number) : [];
//         const sim = (candVec.length === queryVec.length) ? cosine(queryVec, candVec) : -1;
//         return { ...c, similarity: sim };
//       });

//       recommendations = rerunWithSim
//         .filter(x => x.similarity >= SIM_THRESHOLD)
//         .sort((a, b) => b.similarity - a.similarity)
//         .slice(0, TOP_N);
//     }

//     if (recommendations.length === 0)
//       return res.json({ message: "No matching bio profiles found", recommendations: [] });

//     // 🔹 Save shown recommendations
//     const newRecommendedIds = recommendations.map(r => r._id);
//     await User.updateOne(
//       { _id: currentUser._id },
//       {
//         $addToSet: { recommendationsShown: { $each: newRecommendedIds } },
//         $inc: { searchCount: 1 }
//       }
//     );

//     // Remove bio_vector before sending
//     const safeRecommendations = recommendations.map(r => {
//       const { bio_vector, ...rest } = r;
//       return rest;
//     });

//     return res.json({
//       recommendations: safeRecommendations,
//       totalShown: (currentUser.recommendationsShown?.length || 0) + safeRecommendations.length,
//       searchCount: (currentUser.searchCount || 0) + 1
//     });

//   } catch (error) {
//     console.error("Error getting recommendations:", error);
//     return res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// Old
// -----------------------------------------------------------------------------
// new chatbot-style semantic search
// -----------------------------------------------------------------------------
exports.chatbotSearch = async (req, res) => {
  try {
    const { query, phone, excludeIds } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return responseManager.onBadRequest('Query text required', res);
    }

    const primary = mongoConnection.useDb(constants.DEFAULT_DB);
    const User = primary.model(constants.MODELS.user, userModel);
    const ConnectionRequest = primary.model(constants.MODELS.connectionRequest, connectionRequestModel);

    const queryVec = await main(query);
    if (!Array.isArray(queryVec) || queryVec.length === 0) {
      return responseManager.internalServer(new Error('Embedding generation failed'), res);
    }

    // ── Layer 1: Frontend seenIds ───────────────────────────────────────────────
    const excludeObjectIds = Array.isArray(excludeIds)
      ? excludeIds
          .flatMap(id => String(id).split(','))
          .map(id => id.trim())
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id))
      : [];

    // ── Layer 2: Sent connection requests ──────────────────────────────────────
    let sentUserIds = [];
    if (phone) {
      const sentRequests = await ConnectionRequest.find({
        senderPhone: phone.toString().trim(),
        status: { $in: ['pending', 'accepted'] }
      }).select('receiverPhone').lean();

      const sentPhones = sentRequests.map(r => r.receiverPhone).filter(Boolean);
      if (sentPhones.length > 0) {
        const sentUsers = await User.find({ phone: { $in: sentPhones } }).select('_id').lean();
        sentUserIds = sentUsers.map(u => new mongoose.Types.ObjectId(u._id));
      }
    }

    // ── Merge exclusions ────────────────────────────────────────────────────────
    const allExcludedSet = new Set([
      ...excludeObjectIds.map(id => id.toString()),
      ...sentUserIds.map(id => id.toString())
    ]);
    const allExcludedIds = [...allExcludedSet]
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    const matchConditions = {};
    if (phone) matchConditions.phone = { $ne: phone.toString().trim() };
    if (allExcludedIds.length > 0) matchConditions._id = { $nin: allExcludedIds };

    const pipeline = [
      {
        $vectorSearch: {
          index: constants.VECTOR_INDEX,
          path: 'bio_vector',
          queryVector: queryVec,
          numCandidates: 50,
          limit: 10
        }
      },
      { $addFields: { score: { $meta: 'vectorSearchScore' } } },
      ...(Object.keys(matchConditions).length > 0 ? [{ $match: matchConditions }] : []),
      { $limit: 5 },
      { $project: { name: 1, company_name: 1, phone: 1, category: 1, bio: 1, link1: 1, score: 1 } }
    ];

    const results = await User.aggregate(pipeline, { maxTimeMS: 30000, allowDiskUse: true });

    if (!results || results.length === 0) {
      return responseManager.onSuccess('No matching profiles found', [], res);
    }

    return responseManager.onSuccess('Search results', results, res);
  } catch (error) {
    console.error('chatbotSearch error:', error);
    return responseManager.internalServer(error, res);
  }
};


// -----------------------------------------------------------------------------
// existing recommendation handler follows
// -----------------------------------------------------------------------------
exports.getRecommendations = async (req, res) => {
  const { userId, excludeIds } = req.body;
  const primary = mongoConnection.useDb(constants.DEFAULT_DB);
  const User = primary.model(constants.MODELS.user, userModel);
  const ConnectionRequest = primary.model(constants.MODELS.connectionRequest, connectionRequestModel);

  const SIM_THRESHOLD = 0.75;
  const TOP_N = 1;
  const NUM_CANDIDATES = 200;

  try {
    const currentUser = await User.findById(userId).lean();
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const queryVecRaw = currentUser.bio_vector;
    if (!Array.isArray(queryVecRaw) || queryVecRaw.length === 0) {
      return res.status(400).json({ message: 'User has no valid bio_vector' });
    }

    const queryVec = queryVecRaw.map(Number);
    const categoryArray = Array.isArray(currentUser.category)
      ? currentUser.category
      : (currentUser.category ? [currentUser.category] : []);

    // ── Layer 1: DB-tracked shown IDs ──────────────────────────────────────────
    const shownIds = (currentUser.recommendationsShown || [])
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    // ── Layer 2: Frontend seenIds ("id1,id2,id3" string or array) ──────────────
    const extraExcludeIds = Array.isArray(excludeIds)
      ? excludeIds
          .flatMap(id => String(id).split(','))
          .map(id => id.trim())
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id))
      : [];

    // ── Layer 3: Sent connection requests from DB ───────────────────────────────
    const sentRequests = await ConnectionRequest.find({
      senderPhone: currentUser.phone,
      status: { $in: ['pending', 'accepted'] }
    }).select('receiverPhone').lean();

    const sentPhones = sentRequests.map(r => r.receiverPhone).filter(Boolean);
    const sentUsers = sentPhones.length > 0
      ? await User.find({ phone: { $in: sentPhones } }).select('_id').lean()
      : [];
    const sentUserIds = sentUsers.map(u => new mongoose.Types.ObjectId(u._id));

    // ── Merge all exclusions ────────────────────────────────────────────────────
    const allExcludedSet = new Set([
      ...shownIds.map(id => id.toString()),
      ...extraExcludeIds.map(id => id.toString()),
      ...sentUserIds.map(id => id.toString())
    ]);
    const allExcludedIds = [...allExcludedSet]
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    const userObjectId = new mongoose.Types.ObjectId(userId);

    console.log(`[Recs] ${currentUser.phone} | shown=${shownIds.length} | sentReqs=${sentUserIds.length} | frontendExclude=${extraExcludeIds.length} | totalExcluded=${allExcludedIds.length}`);

    console.log(`[Recs] ${currentUser.phone} | Category Filter:`, categoryArray);

    // ── Pipeline builder ────────────────────────────────────────────────────────
    const buildPipeline = (excludeList) => {
      const pipeline = [
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'bio_vector',
            queryVector: queryVec,
            numCandidates: NUM_CANDIDATES,
            limit: NUM_CANDIDATES
          }
        },
        { $addFields: { vsScore: { $meta: 'vectorSearchScore' } } },
        {
          $match: {
            _id: { $ne: userObjectId }
          }
        },
        { $project: { name: 1, link1: 1, link2: 1, phone: 1, bio: 1, bio_vector: 1, category: 1, vsScore: 1 } }
      ];

      // Add category filter only if user has categories
      if (categoryArray.length > 0) {
        pipeline[0].$vectorSearch.filter = { category: { $in: categoryArray } };
      }

      // Add NIN exclusion if list is not empty
      if (excludeList.length > 0) {
        pipeline[2].$match._id = { $ne: userObjectId, $nin: excludeList };
      }

      return pipeline;
    };

    // ── Cosine similarity ───────────────────────────────────────────────────────
    const cosine = (a, b) => {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return -1;
      let dot = 0, na = 0, nb = 0;
      for (let i = 0; i < a.length; i++) {
        const va = Number(a[i]) || 0, vb = Number(b[i]) || 0;
        dot += va * vb; na += va * va; nb += vb * vb;
      }
      return (na && nb) ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : -1;
    };

    const scoreAndPick = (candidates) => {
      if (!candidates || candidates.length === 0) return [];
      const withSim = candidates.map(c => ({
        ...c,
        similarity: cosine(queryVec, (c.bio_vector || []).map(Number))
      }));
      let filtered = withSim.filter(x => x.similarity >= SIM_THRESHOLD);
      if (!filtered.length) {
        for (const t of [0.70, 0.65, 0.60, 0.50]) {
          filtered = withSim.filter(x => x.similarity >= t);
          if (filtered.length) break;
        }
      }
      if (!filtered.length) filtered = withSim; // last resort: any result
      return filtered.sort((a, b) => b.similarity - a.similarity).slice(0, TOP_N);
    };

    // ── First attempt with all exclusions ──────────────────────────────────────
    let candidates = [];
    try {
      candidates = await User.aggregate(buildPipeline(allExcludedIds));
    } catch (aggErr) {
      console.error('[Recs] Aggregate failed! Check Atlas Index:', aggErr.message);
      // Fallback: search without filter if filter failed
      if (categoryArray.length > 0) {
        console.log('[Recs] Retrying without category filter...');
        const fallbackPipeline = buildPipeline(allExcludedIds);
        delete fallbackPipeline[0].$vectorSearch.filter;
        candidates = await User.aggregate(fallbackPipeline);
      } else {
        throw aggErr;
      }
    }

    let recommendations = scoreAndPick(candidates);

    // ── No results found ────────────────────────────────────────────────────────
    if (recommendations.length === 0) {
      console.log(`[Recs] No matching profiles found for ${currentUser.phone}`);
      return responseManager.onSuccess('No more recommendations available', [], res);
    }

    // ── Persist shown IDs to DB ────────────────────────────────────────────────
    const newRecommendedIds = recommendations.map(r => r._id);
    await User.findByIdAndUpdate(currentUser._id, {
      $addToSet: { recommendationsShown: { $each: newRecommendedIds } },
      $inc: { searchCount: 1 }
    });

    const safeRecommendations = recommendations.map(({ bio_vector, ...rest }) => rest);

    return responseManager.onSuccess('Recommendations found', safeRecommendations, res);

  } catch (error) {
    console.error('getRecommendations error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// =============================================================================
// CONNECTION REQUEST FLOW
// =============================================================================

/**
 * Helper: 11za API se WhatsApp template send karo
 *
 * @param {Object} opts
 * @param {string} opts.sendto          - Receiver ka phone (e.g. "919876543210")
 * @param {string} opts.name            - Receiver ka naam (11za logs ke liye)
 * @param {string} opts.templateName    - 11za mein registered template name
 * @param {string[]} opts.data          - Body variables array ["{{1}}", "{{2}}"...]
 * @param {string|string[]} [opts.buttonValue] - URL button suffix ya quick reply payload
 * @param {string} [opts.headerdata]    - Header variable (optional)
 * @param {string} [opts.language]      - Language code, default "en"
 * @param {string} [opts.tags]          - Comma-separated tags (optional)
 */
async function send11zaTemplate({ sendto, name, templateName, data, buttonValue, headerdata, language = "en", tags }) {
  const payload = {
    authToken:     process.env.IVY_11ZA_AUTH_TOKEN,
    name:          name || "",
    sendto:        sendto,
    originWebsite: process.env.IVY_11ZA_ORIGIN || "www.11za.com",
    templateName:  templateName,
    language:      language,
    data:          data || []
  };

  // Optional fields — sirf tab include karo jab provided ho
  if (buttonValue !== undefined && buttonValue !== null && buttonValue !== "") {
    payload.buttonValue = buttonValue;
  }
  if (headerdata !== undefined && headerdata !== null && headerdata !== "") {
    payload.headerdata = headerdata;
  }
  if (tags) {
    payload.tags = tags;
  }

  console.log(`[11za] Sending template "${templateName}" to ${sendto}`);

  const response = await axios.post(
    "https://api.11za.in/apis/template/sendTemplate",
    payload,
    { headers: { "Content-Type": "application/json" } }
  );

  console.log(`[11za] Template sent to ${sendto}:`, response.data);
  return response.data;
}

/**
 * POST /sendConnectionRequest
 * Body: { senderPhone, receiverPhone }
 *
 * Step 1-2 of the 7-step flow:
 *  - User A taps "Send Request" in the 11za flow
 *  - Creates a connection_request doc with status "pending"
 *  - Returns requestId + receiverPhone so 11za can send ivy_connection_request
 *    template to User B
 */
exports.sendConnectionRequest = async (req, res) => {
  try {
    const { senderPhone, receiverPhone } = req.body;

    if (!senderPhone || !receiverPhone) {
      return responseManager.onBadRequest(
        "senderPhone and receiverPhone are required",
        res
      );
    }

    if (senderPhone.trim() === receiverPhone.trim()) {
      return responseManager.onBadRequest(
        "Sender and receiver cannot be the same user",
        res
      );
    }

    const primary = mongoConnection.useDb(constants.DEFAULT_DB);
    const ConnectionRequest = primary.model(
      constants.MODELS.connectionRequest,
      connectionRequestModel
    );
    const User = primary.model(constants.MODELS.user, userModel);

    // Verify both users exist
    const [senderUser, receiverUser] = await Promise.all([
      // Fetch full profile for both users — company_name, bio, link1 needed for template
      User.findOne({ phone: senderPhone.trim() }).select("name phone company_name bio link1").lean(),
      User.findOne({ phone: receiverPhone.trim() }).select("name phone").lean()
    ]);

    if (!senderUser) {
      return responseManager.notFoundRequest("Sender user not found", res);
    }
    if (!receiverUser) {
      return responseManager.notFoundRequest("Receiver user not found", res);
    }

    // Check for existing pending request between these two users
    const existingRequest = await ConnectionRequest.findOne({
      senderPhone:   senderPhone.trim(),
      receiverPhone: receiverPhone.trim(),
      status:        "pending"
    }).lean();

    if (existingRequest) {
      return responseManager.onBadRequest(
        "A pending connection request already exists between these users",
        res
      );
    }

    // Create the connection request
    const newRequest = await ConnectionRequest.create({
      senderPhone:   senderPhone.trim(),
      receiverPhone: receiverPhone.trim(),
      status:        "pending"
    });

    console.log("Connection request created:", newRequest._id);

    // ✅ 11za API se ivy_connection_request template User B (receiver) ko bhejo
    //
    // Template variables (from screenshot):
    //   VARIABLE_1 = receiverName   → "Hi {{1}},"
    //   VARIABLE_2 = senderName     → "{{2}} wants to connect..."
    //   VARIABLE_3 = senderCompany  → "Company: {{3}}"
    //   VARIABLE_4 = senderBio      → "About: {{4}}"
    //   VARIABLE_5 = senderLink     → "Profile: {{5}}"
    //
    // Buttons:
    //   [Accept Request] payload = "ACCEPT_<requestId>"
    //   [Cancel]         payload = "CANCEL_<requestId>"
    try {
      const templateResult = await send11zaTemplate({
        sendto:       formatPhoneFor11za(newRequest.receiverPhone),
        name:         receiverUser.name || "",
        templateName: "ivy_connection_request",
        data: [
          receiverUser.name         || "User", // VARIABLE_1
          senderUser.name           || "User", // VARIABLE_2
          senderUser.company_name   || "No Company", // VARIABLE_3
          senderUser.bio            || "No Bio", // VARIABLE_4
          senderUser.link1          || ""        // VARIABLE_5
        ],
        buttonValue: [
          `ACCEPT_${newRequest._id}`,   // Button 1: Accept Request
          `CANCEL_${newRequest._id}`    // Button 2: Cancel
        ]
      });

      // ✅ 11za ka messageId DB mein save karo (traceability ke liye)
      const messageId = templateResult?.Data?.messageId || templateResult?.messageId || null;
      if (messageId) {
        await ConnectionRequest.findByIdAndUpdate(newRequest._id, {
          $set: { templateMessageId: messageId }
        });
        console.log("[11za] messageId saved:", messageId);
      }

    } catch (templateErr) {
      // Template fail hona request creation ko fail nahi karega
      // DB record safe hai — sirf log karo
      console.error("[11za] ivy_connection_request template send failed:", templateErr?.response?.data || templateErr.message);
    }

    return responseManager.onSuccess("Connection request sent", {
      requestId:     newRequest._id,
      senderPhone:   newRequest.senderPhone,
      receiverPhone: newRequest.receiverPhone,
      senderName:    senderUser.name || "",
      receiverName:  receiverUser.name || "",
      status:        newRequest.status,
      createdAt:     newRequest.createdAt
    }, res);

  } catch (error) {
    console.error("sendConnectionRequest error:", error);
    return responseManager.internalServer(error, res);
  }
};


/**
 * POST /acceptConnectionRequest
 * Body: { requestId, receiverPhone }
 *
 * Step 4-5 of the 7-step flow:
 *  - User B taps "Accept Request" Quick Reply button in WhatsApp
 *  - Validates that the receiver matches the request
 *  - Updates status to "accepted"
 *  - Returns both users' data so 11za can send ivy_match_confirmed
 *    template to BOTH User A and User B
 */
exports.acceptConnectionRequest = async (req, res) => {
  try {
    let { requestId, receiverPhone } = req.body;

    if (!requestId || !receiverPhone) {
      return responseManager.onBadRequest(
        "requestId and receiverPhone are required",
        res
      );
    }

    // ✅ Auto-strip "ACCEPT_" prefix
    // 11za mein SetVariable: requestId = {{message.text}}
    // message.text hoga "ACCEPT_683abc..." — backend strip kar dega
    if (typeof requestId === "string" && requestId.startsWith("ACCEPT_")) {
      requestId = requestId.replace("ACCEPT_", "").trim();
    }

    // ✅ Phone — sirf trim karo
    // DB mein 10-digit phone stored hai (11za mobileNo_wo_code se aata hai)
    // Isliye DB comparison ke liye 91 ADD NAHI karna — as-is match karo
    // (formatPhoneFor11za sirf template "sendto" field mein use hoga)
    receiverPhone = receiverPhone.trim();

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return responseManager.onBadRequest("Invalid requestId format", res);
    }


    const primary = mongoConnection.useDb(constants.DEFAULT_DB);
    const ConnectionRequest = primary.model(
      constants.MODELS.connectionRequest,
      connectionRequestModel
    );
    const User = primary.model(constants.MODELS.user, userModel);

    // Fetch the request
    const request = await ConnectionRequest.findById(requestId).lean();

    if (!request) {
      return responseManager.notFoundRequest("Connection request not found", res);
    }

    // Security: only the intended receiver can accept
    if (request.receiverPhone !== receiverPhone.trim()) {
      return responseManager.onBadRequest(
        "You are not the intended receiver of this request",
        res
      );
    }

    if (request.status === "accepted") {
      return responseManager.onBadRequest("Request already accepted", res);
    }

    if (request.status === "rejected") {
      return responseManager.onBadRequest("Request has been rejected", res);
    }

    // Update status to accepted
    const updatedRequest = await ConnectionRequest.findByIdAndUpdate(
      requestId,
      { $set: { status: "accepted" } },
      { new: true }
    );

    // Fetch both users' data for the match confirmed template
    const [userA, userB] = await Promise.all([
      User.findOne({ phone: request.senderPhone })
          .select("name phone company_name bio link1 link2 category")
          .lean(),
      User.findOne({ phone: request.receiverPhone })
          .select("name phone company_name bio link1 link2 category")
          .lean()
    ]);

    console.log("Connection request accepted:", requestId);

    // ✅ 11za API se ivy_match_confirmed template DONO users ko bhejo
    //
    // Template variables (from screenshot):
    //   VARIABLE_1 = receiverName        → "Great news, {{1}}!"
    //   VARIABLE_2 = matchedPersonName   → "connected with {{2}}"
    //   VARIABLE_3 = matchedPersonName   → "Name: {{3}}"
    //   VARIABLE_4 = matchedPersonPhone  → "Phone: {{4}}"
    //
    // Button: [Chat Now] → URL = https://wa.me/ + buttonValue (phone number)
    const userAPhone = userA?.phone || request.senderPhone;
    const userBPhone = userB?.phone || request.receiverPhone;
    const userAName  = userA?.name  || 'User';
    const userBName  = userB?.name  || 'User';

    console.log(`[Flow] Notifying A (${userAPhone}) and B (${userBPhone}) about acceptance`);

    // Both template sends parallel mein — faster response
    const templateResults = await Promise.allSettled([
      // → User A ko bhejo  (Chat Now → User B se baat karo)
      send11zaTemplate({
        sendto:       formatPhoneFor11za(userAPhone), // ← 10→12 digit for 11za API
        name:         userAName,
        templateName: "ivy_match_confirmed",
        data: [
          userAName,    // VARIABLE_1 → "Great news, {{1}}!"
          userBName,    // VARIABLE_2 → "connected with {{2}}"
          userBName,    // VARIABLE_3 → "Name: {{3}}"
          formatPhoneFor11za(userBPhone)  // VARIABLE_4 → "Phone: {{4}}" (12-digit display)
        ],
        buttonValue: formatPhoneFor11za(userBPhone)  // Chat Now → wa.me/userBPhone
      }),
      // → User B ko bhejo  (Chat Now → User A se baat karo)
      send11zaTemplate({
        sendto:       formatPhoneFor11za(userBPhone), // ← 10→12 digit for 11za API
        name:         userBName,
        templateName: "ivy_match_confirmed",
        data: [
          userBName,    // VARIABLE_1 → "Great news, {{1}}!"
          userAName,    // VARIABLE_2 → "connected with {{2}}"
          userAName,    // VARIABLE_3 → "Name: {{3}}"
          formatPhoneFor11za(userAPhone)  // VARIABLE_4 → "Phone: {{4}}" (12-digit display)
        ],
        buttonValue: formatPhoneFor11za(userAPhone)  // Chat Now → wa.me/userAPhone
      })
    ]);

    // Log any template failures (non-blocking)
    templateResults.forEach((result, idx) => {
      if (result.status === "rejected") {
        const recipient = idx === 0 ? userAPhone : userBPhone;
        console.error(`[11za] ivy_match_confirmed failed for ${recipient}:`, result.reason?.response?.data || result.reason?.message);
      }
    });

    return responseManager.onSuccess("Connection request accepted", {
      requestId:    updatedRequest._id,
      status:       updatedRequest.status,
      userA: {
        phone:        userAPhone,
        name:         userAName,
        company_name: userA?.company_name || "",
        link1:        userA?.link1 || "",
        link2:        userA?.link2 || ""
      },
      userB: {
        phone:        userBPhone,
        name:         userBName,
        company_name: userB?.company_name || "",
        link1:        userB?.link1 || "",
        link2:        userB?.link2 || ""
      }
    }, res);

  } catch (error) {
    console.error("acceptConnectionRequest error:", error);
    return responseManager.internalServer(error, res);
  }
};


/**
 * POST /getConnectionStatus
 * Body: { requestId }
 *
 * Utility endpoint — 11za ya frontend check kar sake ki request
 * abhi bhi pending hai ya accept/reject ho gayi.
 */
exports.getConnectionStatus = async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return responseManager.onBadRequest("requestId is required", res);
    }

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return responseManager.onBadRequest("Invalid requestId format", res);
    }

    const primary = mongoConnection.useDb(constants.DEFAULT_DB);
    const ConnectionRequest = primary.model(
      constants.MODELS.connectionRequest,
      connectionRequestModel
    );

    const request = await ConnectionRequest.findById(requestId)
      .select("senderPhone receiverPhone status createdAt updatedAt")
      .lean();

    if (!request) {
      return responseManager.notFoundRequest("Connection request not found", res);
    }

    return responseManager.onSuccess("Connection request status", request, res);

  } catch (error) {
    console.error("getConnectionStatus error:", error);
    return responseManager.internalServer(error, res);
  }
};


// =============================================================================
// WEBHOOK — 11za Template Button Reply Handler
// =============================================================================

/**
 * POST /webhook/templateReply
 *
 * 11za yahan POST karega jab User B koi template button tap kare.
 * Event type: "MoMessage::Postback"
 * postback.data = "ACCEPT_<requestId>" ya "CANCEL_<requestId>"
 *
 * IMPORTANT: Pehle 200 OK return karo — phir processing karo.
 * Agar 200 nahi aaya, 11za baar baar retry karega.
 */
exports.templateWebhook = async (req, res) => {
  // ⚠️  VERCEL SERVERLESS FIX:
  // Vercel mein res.send() ke baad function TERMINATE ho jaata hai.
  // Isliye pehle poora kaam karo — DB update + templates bhejo —
  // phir response bhejo. 11za 5-10s wait kar sakta hai.

  try {
    // ✅ x-api-key verify karo — 11za header mein bhejta hai
    const incomingKey = req.headers['x-api-key'] || '';
    const expectedKey = process.env.WEBHOOK_API_KEY || '';

    if (expectedKey && incomingKey !== expectedKey) {
      console.warn('[Webhook] Unauthorized — invalid x-api-key:', incomingKey);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = req.body;
    console.log('[Webhook] Received:', JSON.stringify(body));

    // Sirf button tap events handle karo
    if (body?.event !== 'MoMessage::Postback') {
      console.log('[Webhook] Ignoring event:', body?.event);
      return res.status(200).json({ received: true, skipped: true });
    }


    const payload   = body?.postback?.data || '';
    const fromPhone = (body?.from || '').toString().trim();

    console.log(`[Webhook] payload="${payload}" from="${fromPhone}"`);

    const primary = mongoConnection.useDb(constants.DEFAULT_DB);
    const ConnectionRequest = primary.model(
      constants.MODELS.connectionRequest,
      connectionRequestModel
    );
    const User = primary.model(constants.MODELS.user, userModel);

    // ── ACCEPT ──────────────────────────────────────────────────────────────
    if (payload.startsWith('ACCEPT_')) {
      const requestId = payload.replace('ACCEPT_', '').trim();

      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        console.error('[Webhook] Invalid requestId in ACCEPT payload:', requestId);
        return res.status(200).json({ received: true, error: 'invalid_request_id' });
      }

      const request = await ConnectionRequest.findById(requestId).lean();
      if (!request) {
        console.error('[Webhook] Connection request not found:', requestId);
        return res.status(200).json({ received: true, error: 'request_not_found' });
      }
      if (request.status !== 'pending') {
        console.log('[Webhook] Already processed, status:', request.status);
        return res.status(200).json({ received: true, status: request.status });
      }

      // Status → accepted
      await ConnectionRequest.findByIdAndUpdate(requestId, {
        $set: { status: 'accepted', acceptedAt: new Date() }
      });

      // Dono users ka data fetch karo
      const [userA, userB] = await Promise.all([
        User.findOne({ phone: request.senderPhone })
            .select('name phone company_name bio link1').lean(),
        User.findOne({ phone: request.receiverPhone })
            .select('name phone company_name bio link1').lean()
      ]);

      const userAPhone = userA?.phone || request.senderPhone;
      const userBPhone = userB?.phone || request.receiverPhone;
      const userAName  = userA?.name  || 'User';
      const userBName  = userB?.name  || 'User';

      console.log(`[Webhook] Notifying A (${userAPhone}) and B (${userBPhone}) about acceptance`);

      // ── Notify both users parallelly ─────────────────────────────────────────
      const results = await Promise.allSettled([
        // → User A (Sender) - Notify that B accepted
        send11zaTemplate({
          sendto:       formatPhoneFor11za(userAPhone),
          name:         userAName,
          templateName: 'ivy_match_confirmed',
          data: [
            userAName,
            userBName,
            userBName,
            formatPhoneFor11za(userBPhone)
          ],
          buttonValue: formatPhoneFor11za(userBPhone)
        }),
        // → User B (Receiver) - Confirm their acceptance
        send11zaTemplate({
          sendto:       formatPhoneFor11za(userBPhone),
          name:         userBName,
          templateName: 'ivy_match_confirmed',
          data: [
            userBName,
            userAName,
            userAName,
            formatPhoneFor11za(userAPhone)
          ],
          buttonValue: formatPhoneFor11za(userAPhone)
        })
      ]);

      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          const who = i === 0 ? userAPhone : userBPhone;
          console.error(`[Webhook] ivy_match_confirmed failed for ${who}:`, r.reason?.response?.data || r.reason?.message);
        }
      });

      // ✅ Sab kaam ho gaya — ab response bhejo
      return res.status(200).json({
        received: true,
        action:   'accepted',
        userA:    { name: userAName, phone: userAPhone },
        userB:    { name: userBName, phone: userBPhone }
      });
    }

    // ── CANCEL ──────────────────────────────────────────────────────────────
    if (payload.startsWith('CANCEL_')) {
      const requestId = payload.replace('CANCEL_', '').trim();

      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        console.error('[Webhook] Invalid requestId in CANCEL payload:', requestId);
        return res.status(200).json({ received: true, error: 'invalid_request_id' });
      }

      const request = await ConnectionRequest.findById(requestId).lean();
      if (!request) {
        return res.status(200).json({ received: true, error: 'request_not_found' });
      }
      if (request.status !== 'pending') {
        return res.status(200).json({ received: true, status: request.status });
      }

      // Status → rejected
      await ConnectionRequest.findByIdAndUpdate(requestId, {
        $set: { status: 'rejected' }
      });

      console.log('[Webhook] ❌ Request cancelled:', requestId);

      // Optional: User A ko notify karo
      if (request.senderPhone) {
        await send11zaTemplate({
          sendto:       formatPhoneFor11za(request.senderPhone),
          name:         '',
          templateName: 'ivy_request_declined',
          data:         []
        }).catch(e => console.log('[Webhook] Cancel notify skipped:', e.message));
      }

      // ✅ Sab kaam ho gaya — ab response bhejo
      return res.status(200).json({ received: true, action: 'cancelled' });
    }

    // Unknown payload
    return res.status(200).json({ received: true, skipped: true, payload });

  } catch (error) {
    console.error('[Webhook] Unhandled error:', error);
    // 200 hi bhejo — 11za ko retry nahi karwana
    return res.status(200).json({ received: true, error: 'internal_error' });
  }
};

