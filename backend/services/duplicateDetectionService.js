const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const memoryStore = require('../config/memoryStore');
const { GoogleGenAI } = require('@google/genai');

const MAX_SEARCH_CANDIDATES = 20;

/**
 * Initializes server-side Gemini client with aistudio-build telemetry
 */
const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

/**
 * Strips markdown code fences from JSON text
 */
const cleanJsonResponse = (text = '') => {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
};

/**
 * Converts a numeric score into a standardized similarity level
 */
const getSimilarityLevel = (score) => {
  if (score >= 0.90) return 'Very High';
  if (score >= 0.75) return 'High';
  if (score >= 0.50) return 'Moderate';
  return 'Low';
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'in', 'at', 'of', 'to', 'and', 'or', 'for', 'on',
  'with', 'this', 'that', 'it', 'by', 'as', 'from', 'are', 'was', 'were',
  'has', 'have', 'had', 'been', 'there', 'here', 'please', 'my', 'our',
  'road', 'street', 'near', 'corner', 'junction', 'area', 'city'
]);

/**
 * Tokenize text into normalized significant words
 */
const tokenize = (text = '') => {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
};

/**
 * Calculates Jaccard token overlap between two token arrays
 */
const calculateJaccardSimilarity = (tokensA = [], tokensB = []) => {
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
};

/**
 * Computes deterministic rule-based similarity
 */
const calculateDeterministicSimilarity = (target, candidate) => {
  const targetCategory = (target.category || '').toLowerCase();
  const candidateCategory = (candidate.category || '').toLowerCase();

  // 1. Category comparison (weight: 0.25)
  let categoryScore = 0;
  if (targetCategory && candidateCategory) {
    if (targetCategory === candidateCategory) {
      categoryScore = 1.0;
    } else if (
      (targetCategory.includes('road') && candidateCategory.includes('road')) ||
      (targetCategory.includes('water') && candidateCategory.includes('water')) ||
      (targetCategory.includes('waste') && candidateCategory.includes('waste')) ||
      (targetCategory.includes('sanitat') && candidateCategory.includes('sanitat'))
    ) {
      categoryScore = 0.8;
    }
  }

  // 2. Location comparison (weight: 0.35)
  const targetLocTokens = tokenize(target.location);
  const candLocTokens = tokenize(candidate.location);
  let locationScore = calculateJaccardSimilarity(targetLocTokens, candLocTokens);

  const cleanTargetLoc = (target.location || '').toLowerCase().trim();
  const cleanCandLoc = (candidate.location || '').toLowerCase().trim();
  if (cleanTargetLoc && cleanCandLoc) {
    if (cleanTargetLoc === cleanCandLoc) {
      locationScore = 1.0;
    } else if (cleanTargetLoc.includes(cleanCandLoc) || cleanCandLoc.includes(cleanTargetLoc)) {
      locationScore = Math.max(locationScore, 0.85);
    }
  }

  // 3. Title & Description text comparison (weight: 0.40)
  const targetTitleTokens = tokenize(target.title);
  const candTitleTokens = tokenize(candidate.title);
  const titleScore = calculateJaccardSimilarity(targetTitleTokens, candTitleTokens);

  const targetDescTokens = tokenize(`${target.description || ''} ${target.aiSummary || ''}`);
  const candDescTokens = tokenize(`${candidate.description || ''} ${candidate.aiSummary || ''}`);
  const descScore = calculateJaccardSimilarity(targetDescTokens, candDescTokens);

  const contentScore = (titleScore * 0.5) + (descScore * 0.5);

  // Weighted total deterministic score: Category (0.25) + Location (0.35) + Content (0.40)
  // If categories are completely different, heavily penalize false location matches
  let finalScore = (categoryScore * 0.25) + (locationScore * 0.35) + (contentScore * 0.40);

  if (categoryScore === 0) {
    finalScore = finalScore * 0.4; // Strong penalty if different categories
  }

  // Determine matching factors
  const matchingFactors = [];
  if (categoryScore >= 0.8) matchingFactors.push('same category');
  if (locationScore >= 0.4) matchingFactors.push('same or nearby location');
  if (titleScore >= 0.3 || descScore >= 0.3) matchingFactors.push('similar description');

  let reason = '';
  if (finalScore >= 0.75) {
    reason = `High overlap in reported issue regarding ${candidate.category || 'civic services'} near ${candidate.location || 'the specified location'}.`;
  } else if (finalScore >= 0.50) {
    reason = `Moderate similarity detected with related grievance in ${candidate.category || 'the same department'}.`;
  } else {
    reason = `Partial keyword match with existing grievance.`;
  }

  return {
    score: Math.min(1.0, Math.max(0.0, finalScore)),
    reason,
    matchingFactors
  };
};

/**
 * Semantic comparison via Gemini AI for high-potential candidates
 */
const analyzeCandidateWithGemini = async (ai, target, candidate, baseline) => {
  const prompt = `You are a Municipal Grievance Duplicate Detection Assistant.
Compare the newly submitted grievance against an existing registered grievance.
Determine if both grievances refer to the same or highly similar underlying public issue.

New Grievance:
- Title: "${target.title}"
- Description: "${target.description}"
- Category: "${target.category}"
- Location: "${target.location}"
- AI Summary: "${target.aiSummary || ''}"

Existing Grievance (${candidate.grievanceId}):
- Title: "${candidate.title}"
- Description: "${candidate.description}"
- Category: "${candidate.category}"
- Location: "${candidate.location}"
- AI Summary: "${candidate.aiSummary || ''}"

Instructions:
1. Provide a "similarityScore" strictly between 0.0 (completely unrelated) and 1.0 (identical issue/location).
2. Set "isSimilar": true if similarityScore >= 0.50, else false.
3. Provide a clear 1-2 sentence "reason" explaining why they are or are not similar.
4. List "matchingFactors" (e.g. "same location", "same category", "similar description").

Respond ONLY with a valid JSON object matching:
{
  "isSimilar": true,
  "similarityScore": 0.86,
  "reason": "Both complaints describe a severe road pothole at the same junction.",
  "matchingFactors": ["same category", "same location", "similar description"]
}`;

  const candidateModels = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const rawText = cleanJsonResponse(response.text);
      const parsed = JSON.parse(rawText);

      if (parsed && typeof parsed.similarityScore === 'number') {
        const score = Math.max(0.0, Math.min(1.0, parsed.similarityScore));
        const reason = typeof parsed.reason === 'string' && parsed.reason.trim()
          ? parsed.reason.trim()
          : baseline.reason;
        const matchingFactors = Array.isArray(parsed.matchingFactors)
          ? parsed.matchingFactors
          : baseline.matchingFactors;

        return {
          score,
          reason,
          matchingFactors
        };
      }
    } catch (err) {
      console.warn(`[Duplicate Detection] Model ${modelName} call failed, trying next:`, err.message);
    }
  }

  return baseline;
};

/**
 * Main Duplicate Detection Service
 * Analyzes an incoming complaint against existing grievances in MongoDB or MemoryStore
 */
const detectDuplicates = async (complaint) => {
  if (!complaint) return [];

  const targetId = (complaint._id || '').toString();
  const targetGrievanceId = complaint.grievanceId;

  let candidates = [];

  // 1. Fetch potential comparison candidates
  if (mongoose.connection.readyState === 1) {
    const query = {
      _id: { $ne: complaint._id }
    };

    // Filter by matching category or similar keyword to avoid unbounded table scans
    if (complaint.category) {
      query.$or = [
        { category: complaint.category },
        { location: { $regex: tokenize(complaint.location)[0] || '.*', $options: 'i' } }
      ];
    }

    candidates = await Complaint.find(query)
      .limit(MAX_SEARCH_CANDIDATES)
      .sort({ createdAt: -1 });
  } else {
    // In-memory fallback lookup
    candidates = memoryStore.complaints
      .filter(c => {
        const cId = (c._id || '').toString();
        const isNotSelf = cId !== targetId && c.grievanceId !== targetGrievanceId;
        return isNotSelf;
      })
      .slice(0, MAX_SEARCH_CANDIDATES);
  }

  if (!candidates || candidates.length === 0) {
    return [];
  }

  // 2. Perform baseline deterministic similarity on all candidates
  const scoredCandidates = [];
  for (const cand of candidates) {
    const baseline = calculateDeterministicSimilarity(complaint, cand);
    scoredCandidates.push({
      candidate: cand,
      score: baseline.score,
      reason: baseline.reason,
      matchingFactors: baseline.matchingFactors
    });
  }

  // Filter to top candidate contenders (score >= 0.35)
  const contenders = scoredCandidates
    .filter(item => item.score >= 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // 3. If Gemini is available, enhance the top contenders with semantic analysis
  const ai = getAIClient();
  const finalMatches = [];

  for (const item of contenders) {
    let finalScore = item.score;
    let finalReason = item.reason;
    let finalFactors = item.matchingFactors;

    if (ai) {
      try {
        const aiAssessment = await analyzeCandidateWithGemini(ai, complaint, item.candidate, item);
        finalScore = aiAssessment.score;
        finalReason = aiAssessment.reason;
        finalFactors = aiAssessment.matchingFactors;
      } catch (err) {
        console.warn('[Duplicate Detection] Semantic AI fallback to deterministic:', err.message);
      }
    }

    // Retain candidates with similarityScore >= 0.50 (or top if >= 0.45)
    if (finalScore >= 0.45) {
      finalMatches.push({
        complaintId: item.candidate._id,
        grievanceId: item.candidate.grievanceId,
        similarityScore: Math.round(finalScore * 100) / 100,
        similarityLevel: getSimilarityLevel(finalScore),
        reason: finalReason,
        matchingFactors: finalFactors,
        detectedAt: new Date()
      });
    }
  }

  // Sort by similarity score descending, max 5 candidates
  return finalMatches
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 5);
};

module.exports = {
  detectDuplicates,
  getSimilarityLevel,
  calculateDeterministicSimilarity
};
