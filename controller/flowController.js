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

    // input validation
    if (!query || typeof query !== 'string' || !query.trim()) {
      return responseManager.onBadRequest('Query text required', res);
    }

    const primary = mongoConnection.useDb(constants.DEFAULT_DB);
    const User = primary.model(constants.MODELS.user, userModel);

    // generate vector for incoming text
    const queryVec = await main(query);
    if (!Array.isArray(queryVec) || queryVec.length === 0) {
      // embedding failure, treat as server error
      return responseManager.internalServer(new Error('Embedding generation failed'), res);
    }

    // Build excludeIds filter — convert valid strings to ObjectId, skip invalid ones
    const excludeObjectIds = Array.isArray(excludeIds)
      ? excludeIds
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id))
      : [];

    // Build $match stage to exclude self (by phone) and excludeIds
    const matchConditions = {};
    if (phone) matchConditions.phone = { $ne: phone };
    if (excludeObjectIds.length > 0) {
      matchConditions._id = { $nin: excludeObjectIds };
    }

    // build aggregation pipeline for vector search
    const pipeline = [
      {
        $vectorSearch: {
          index: constants.VECTOR_INDEX,
          path: 'bio_vector',
          queryVector: queryVec,
          numCandidates: 50,
          limit: 10  // fetch more so post-filter still gives enough results
        }
      },
      { $addFields: { score: { $meta: 'vectorSearchScore' } } },
      ...(Object.keys(matchConditions).length > 0 ? [{ $match: matchConditions }] : []),
      { $limit: 5 },
      { $project: { name: 1, company_name: 1, phone: 1, category: 1, bio: 1, link1: 1, score: 1 } }
    ];

    // Execute aggregation with options
    const results = await User.aggregate(pipeline, { 
      maxTimeMS: 30000,
      allowDiskUse: true 
    });

    if (!results || results.length === 0) {
      // return success with empty list per requirement
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
  // Constants
  const SIM_THRESHOLD = 0.75;
  const TOP_N = 1;
  const NUM_CANDIDATES = 200;

  try {
    const currentUser = await User.findById(userId).lean();
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const queryVecRaw = currentUser.bio_vector;
    if (!Array.isArray(queryVecRaw) || queryVecRaw.length === 0) {
      return res.status(400).json({ message: "Current user does not have a valid bio_vector" });
    }

    const queryVec = queryVecRaw.map(v => Number(v));

    const categoryArray = Array.isArray(currentUser.category)
      ? currentUser.category
      : (currentUser.category ? [currentUser.category] : []);

    const shownIds = (currentUser.recommendationsShown || []).map(id => {
      try { return mongoose.Types.ObjectId(id); } catch (e) { return id; }
    });

    // Merge DB-tracked shownIds with frontend-provided excludeIds (dedup by string)
    const extraExcludeIds = Array.isArray(excludeIds)
      ? excludeIds
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id))
      : [];

    const allExcludedIds = [
      ...shownIds,
      ...extraExcludeIds.filter(
        exId => !shownIds.some(s => s.toString() === exId.toString())
      )
    ];

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Vector search pipeline
    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_index",
          path: "bio_vector",
          queryVector: queryVec,
          numCandidates: NUM_CANDIDATES,
          limit: NUM_CANDIDATES,
          filter: {
            category: { $in: categoryArray }
          }
        }
      },
      { $addFields: { vsScore: { $meta: "vectorSearchScore" } } },
      {
        $match: {
          $and: [
            { _id: { $ne: userObjectId } },
            { _id: { $nin: allExcludedIds } }  // excludes both DB-tracked + frontend-provided IDs
          ]
        }
      },
      { $project: { name: 1, link1: 1, link2: 1, phone: 1, bio: 1, bio_vector: 1, category: 1, vsScore: 1 } }
    ];

    const candidates = await User.aggregate(pipeline);

    // Cosine similarity helper
    const cosine = (a, b) => {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return -1;
      let dot = 0, na = 0, nb = 0;
      for (let i = 0; i < a.length; i++) {
        const va = Number(a[i]) || 0;
        const vb = Number(b[i]) || 0;
        dot += va * vb;
        na += va * va;
        nb += vb * vb;
      }
      if (na === 0 || nb === 0) return -1;
      return dot / (Math.sqrt(na) * Math.sqrt(nb));
    };

    const withSim = candidates.map(c => {
      const candVec = Array.isArray(c.bio_vector) ? c.bio_vector.map(Number) : [];
      const sim = (candVec.length === queryVec.length) ? cosine(queryVec, candVec) : -1;
      return { ...c, similarity: sim };
    });

    let filtered = withSim.filter(x => x.similarity >= SIM_THRESHOLD);
    filtered.sort((a, b) => b.similarity - a.similarity);

    const relaxThresholds = [0.70, 0.65, 0.60];
    if (filtered.length === 0) {
      for (const t of relaxThresholds) {
        filtered = withSim.filter(x => x.similarity >= t);
        if (filtered.length) break;
      }
    }

    let recommendations = filtered.slice(0, TOP_N);

    // Reset if all users shown
    if (recommendations.length === 0 && shownIds.length > 0) {
      await User.findByIdAndUpdate(currentUser._id, { $set: { recommendationsShown: [], searchCount: 0 } });

      const resetPipeline = [
        {
          $vectorSearch: {
            index: "vector_index",
            path: "bio_vector",
            queryVector: queryVec,
            numCandidates: NUM_CANDIDATES,
            limit: NUM_CANDIDATES,
            filter: {
              category: { $in: categoryArray }
            }
          }
        },
        { $addFields: { vsScore: { $meta: "vectorSearchScore" } } },
        {
          $match: { _id: { $ne: userObjectId } }
        },
        { $project: { name: 1, link1: 1, link2: 1, phone: 1, bio: 1, bio_vector: 1, category: 1, vsScore: 1 } }
      ];

      const candidates2 = await User.aggregate(resetPipeline);
      const withSim2 = candidates2.map(c => {
        const candVec = Array.isArray(c.bio_vector) ? c.bio_vector.map(Number) : [];
        const sim = (candVec.length === queryVec.length) ? cosine(queryVec, candVec) : -1;
        return { ...c, similarity: sim };
      });

      withSim2.sort((a, b) => b.similarity - a.similarity);
      recommendations = withSim2.filter(x => x.similarity >= SIM_THRESHOLD).slice(0, TOP_N);

      if (recommendations.length === 0) {
        recommendations = withSim2.slice(0, TOP_N);
      }
    }

    if (recommendations.length === 0) {
      return res.json({ message: "No matching profiles found", recommendations: [] });
    }

    // Persist shown recommendations
    const newRecommendedIds = recommendations.map(r => r._id);
    await User.findByIdAndUpdate(currentUser._id, {
      $addToSet: { recommendationsShown: { $each: newRecommendedIds } },
      $inc: { searchCount: 1 }
    });
    const safeRecommendations = recommendations.map(r => {
      const { bio_vector, ...rest } = r; // bio_vector remove
      return rest;
    });
    return res.json({
      recommendations: safeRecommendations,
      totalShown: (currentUser.recommendationsShown || []).length + safeRecommendations.length,
      searchCount: (currentUser.searchCount || 0) + 1
    });

  } catch (error) {
    console.error("Error getting recommendations:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// =============================================================================
// CONNECTION REQUEST FLOW
// =============================================================================

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
      User.findOne({ phone: senderPhone.trim() }).select("name phone").lean(),
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
    const { requestId, receiverPhone } = req.body;

    if (!requestId || !receiverPhone) {
      return responseManager.onBadRequest(
        "requestId and receiverPhone are required",
        res
      );
    }

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

    // Response contains everything 11za needs to send ivy_match_confirmed
    // to BOTH users — userA_phone for User A's message, userB_phone for User B
    return responseManager.onSuccess("Connection request accepted", {
      requestId:    updatedRequest._id,
      status:       updatedRequest.status,
      userA: {
        phone:        userA?.phone || request.senderPhone,
        name:         userA?.name  || "",
        company_name: userA?.company_name || "",
        link1:        userA?.link1 || "",
        link2:        userA?.link2 || ""
      },
      userB: {
        phone:        userB?.phone || request.receiverPhone,
        name:         userB?.name  || "",
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