const { GoogleGenAI } = require('@google/genai');
const Department = require('../models/Department');
const memoryStore = require('../config/memoryStore');
const mongoose = require('mongoose');

// Canonical 12 Categories allowed in Module 5
const ALLOWED_CATEGORIES = [
  'Roads',
  'Water Supply',
  'Electricity',
  'Sanitation',
  'Waste Management',
  'Public Transport',
  'Street Lights',
  'Drainage',
  'Public Health',
  'Education',
  'Government Services',
  'Other'
];

// Consistent Department Mapping specified in Module 5.7
const DEPARTMENT_MAP = {
  'Roads': 'Road Maintenance',
  'Water Supply': 'Water Supply',
  'Electricity': 'Electricity',
  'Sanitation': 'Sanitation',
  'Waste Management': 'Waste Management',
  'Public Transport': 'Public Transport',
  'Street Lights': 'Street Lighting',
  'Drainage': 'Drainage',
  'Public Health': 'Public Health',
  'Education': 'Education',
  'Government Services': 'Government Services',
  'Other': 'General Services'
};

const ALLOWED_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

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
 * Deterministic keyword-based fallback analysis (Module 5.14)
 * Engaged when GEMINI_API_KEY is absent, API request fails, or output is unparseable.
 */
const getFallbackAnalysis = ({ title = '', description = '', location = '', userCategory = '' }) => {
  const combined = `${title} ${description}`.toLowerCase();

  let category = 'Other';
  let priority = 'MEDIUM';
  let reason = 'Deterministic rule-based keyword classification applied.';
  let recommendedAction = 'Inspect the reported civic issue and determine appropriate action.';
  let issue = title || 'Reported public grievance';

  if (userCategory && ALLOWED_CATEGORIES.includes(userCategory)) {
    category = userCategory;
  } else if (/\b(pothole|road|asphalt|traffic|pavement|crater|highway|bridge|sidewalk|divider)\b/.test(combined)) {
    category = 'Roads';
    recommendedAction = 'Inspect the reported road defect and schedule asphalt patch repair if confirmed.';
    issue = 'Pothole or road surface damage';
  } else if (/\b(water|pipeline|leak|burst|potable|drinking water|contamination|water supply|no water)\b/.test(combined)) {
    category = 'Water Supply';
    recommendedAction = 'Check pipeline integrity and restore water supply service.';
    issue = 'Water supply interruption or pipeline leak';
  } else if (/\b(street\s*light|lamp|pole light|dark street|lights not working)\b/.test(combined)) {
    category = 'Street Lights';
    recommendedAction = 'Inspect streetlight fixture and replace faulty bulb or wiring.';
    issue = 'Faulty or non-functional streetlight';
  } else if (/\b(electric|power|wire|blackout|transformer|voltage|shock|electrocution)\b/.test(combined)) {
    category = 'Electricity';
    recommendedAction = 'Dispatch electrical line technicians for field evaluation.';
    issue = 'Electrical infrastructure issue';
  } else if (/\b(garbage|trash|waste|rubbish|dump|bin|overflowing)\b/.test(combined)) {
    category = 'Waste Management';
    recommendedAction = 'Dispatch waste collection team and clear accumulated refuse.';
    issue = 'Garbage accumulation or overflowing bin';
  } else if (/\b(drainage|drain|sewer|sewage|manhole|gutter|blocked drain)\b/.test(combined)) {
    category = 'Drainage';
    recommendedAction = 'Clear clogged drainage lines and ensure unrestricted flow.';
    issue = 'Drainage obstruction or sewage overflow';
  } else if (/\b(sanitation|hygiene|public toilet|foul smell|stench)\b/.test(combined)) {
    category = 'Sanitation';
    recommendedAction = 'Sanitize affected public premises and address hygiene issue.';
    issue = 'Sanitation or hygiene problem';
  } else if (/\b(bus|transit|transport|metro|stop)\b/.test(combined)) {
    category = 'Public Transport';
    recommendedAction = 'Forward report to public transport operations desk.';
    issue = 'Public transportation service concern';
  } else if (/\b(hospital|clinic|doctor|dengue|malaria|epidemic|health|medicine)\b/.test(combined)) {
    category = 'Public Health';
    recommendedAction = 'Alert municipal public health inspection personnel.';
    issue = 'Public health or medical concern';
  } else if (/\b(school|college|education|teacher|classroom|student)\b/.test(combined)) {
    category = 'Education';
    recommendedAction = 'Forward to education department liaison.';
    issue = 'Educational institution facility issue';
  } else if (/\b(certificate|office|ration|pension|bureaucracy|documents|portal)\b/.test(combined)) {
    category = 'Government Services';
    recommendedAction = 'Forward query to civic service desk for citizen assistance.';
    issue = 'Government service inquiry or delay';
  }

  // Priority detection guidelines
  if (/\b(live wire|spark|electrocution|explosion|fire|hazard|danger|flood|collapse|toxic|poison|fatal|immediate danger)\b/.test(combined)) {
    priority = 'CRITICAL';
    reason = 'Classified as CRITICAL due to potential public safety or emergency indicators.';
  } else if (/\b(severe|urgent|major|overflowing|blocked|burst|two days|heavy|high risk|traffic accident)\b/.test(combined)) {
    priority = 'HIGH';
    reason = 'Classified as HIGH due to significant public service impact or multi-day disruption.';
  } else if (/\b(minor|cosmetic|slow|low|inquiry|query|small)\b/.test(combined)) {
    priority = 'LOW';
    reason = 'Classified as LOW for minor issues with limited public impact.';
  } else {
    priority = 'MEDIUM';
    reason = 'Classified as MEDIUM for standard public service attention.';
  }

  const department = DEPARTMENT_MAP[category] || 'General Services';

  return {
    category,
    department,
    priority,
    summary: `${title} reported at ${location}. Requires administrative review.`,
    reason,
    recommendedAction,
    confidence: 0.70,
    isFallback: true,
    extractedEntities: {
      location: location || '',
      issue: issue || title || '',
      service: category || '',
      date: ''
    }
  };
};

/**
 * Rigorous backend validation for AI analysis output (Module 5.13)
 */
const validateAIAnalysis = (raw, context) => {
  const fallback = getFallbackAnalysis(context);
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  // 1. Validate Category
  let category = fallback.category;
  if (raw.category && typeof raw.category === 'string') {
    const matched = ALLOWED_CATEGORIES.find(c => c.toLowerCase() === raw.category.trim().toLowerCase());
    if (matched) {
      category = matched;
    }
  }

  // If citizen provided a valid category, respect it
  if (context.userCategory && ALLOWED_CATEGORIES.includes(context.userCategory)) {
    category = context.userCategory;
  }

  // 2. Validate Department (always aligned to DEPARTMENT_MAP)
  const department = DEPARTMENT_MAP[category] || 'General Services';

  // 3. Validate Priority
  let priority = 'MEDIUM';
  if (raw.priority && typeof raw.priority === 'string') {
    const upperPri = raw.priority.trim().toUpperCase();
    if (ALLOWED_PRIORITIES.includes(upperPri)) {
      priority = upperPri;
    }
  }

  // 4. Validate Summary (1-3 sentences, factual, no hallucinations)
  let summary = typeof raw.summary === 'string' && raw.summary.trim().length > 5
    ? raw.summary.trim().slice(0, 500)
    : `${context.title} reported at ${context.location}.`;

  // 5. Validate Reason
  let reason = typeof raw.reason === 'string' && raw.reason.trim().length > 5
    ? raw.reason.trim().slice(0, 500)
    : `Assessed as ${priority} priority for ${category} department review.`;

  // 6. Validate Recommended Action
  let recommendedAction = typeof raw.recommendedAction === 'string' && raw.recommendedAction.trim().length > 5
    ? raw.recommendedAction.trim().slice(0, 500)
    : `Schedule inspection by ${department} personnel.`;

  // 7. Validate Confidence (0.0 to 1.0)
  let confidence = 0.85;
  if (typeof raw.confidence === 'number' && !isNaN(raw.confidence)) {
    confidence = Math.max(0, Math.min(1, raw.confidence));
  } else if (typeof raw.confidence === 'string') {
    const parsed = parseFloat(raw.confidence);
    if (!isNaN(parsed)) {
      confidence = Math.max(0, Math.min(1, parsed));
    }
  }

  // 8. Validate Extracted Entities
  const rawEntities = raw.extractedEntities || {};
  const extractedEntities = {
    location: typeof rawEntities.location === 'string' ? rawEntities.location.trim().slice(0, 150) : (context.location || ''),
    issue: typeof rawEntities.issue === 'string' ? rawEntities.issue.trim().slice(0, 150) : (context.title || ''),
    service: typeof rawEntities.service === 'string' ? rawEntities.service.trim().slice(0, 150) : category,
    date: typeof rawEntities.date === 'string' ? rawEntities.date.trim().slice(0, 50) : ''
  };

  return {
    category,
    department,
    priority,
    summary,
    reason,
    recommendedAction,
    confidence: Number(confidence.toFixed(2)),
    isFallback: false,
    extractedEntities
  };
};

/**
 * Main AI Grievance Analyzer (Module 5.5 - 5.14)
 * Evaluates Title, Description, and Location using Gemini 3.8 Flash
 * @param {Object} input - { title, description, location, userCategory }
 * @returns {Promise<Object>}
 */
exports.analyzeGrievance = async ({ title, description, location, userCategory }) => {
  const context = { title, description, location, userCategory };
  const ai = getAIClient();

  if (!ai) {
    console.warn('[AI Grievance Analyzer] GEMINI_API_KEY not configured or empty. Using deterministic fallback.');
    return getFallbackAnalysis(context);
  }

  const prompt = `You are the AI Public Grievance Analyzer assisting municipal administration.
Analyze ONLY the citizen's submitted civic grievance details below.
Do not invent facts, do not claim government actions have already occurred, and do not make legal conclusions.

Citizen Grievance Input:
Title: "${title}"
Description: "${description}"
Location: "${location}"
${userCategory ? `Citizen Suggested Category: "${userCategory}"` : ''}

Strict Classification Constraints:
1. "category" must be EXACTLY ONE of:
${ALLOWED_CATEGORIES.map(c => `   - "${c}"`).join('\n')}

2. "department" must be the corresponding department name:
${Object.entries(DEPARTMENT_MAP).map(([cat, dept]) => `   - "${cat}" -> "${dept}"`).join('\n')}

3. "priority" must be EXACTLY ONE of:
   - "LOW": Minor issue with limited public impact.
   - "MEDIUM": Normal public-service issue requiring standard attention.
   - "HIGH": Significant issue affecting many people or an important public service.
   - "CRITICAL": Potential immediate danger, major public safety hazard, severe infrastructure failure, or emergency-level impact.

4. "summary": Concise 1 to 3 factual sentences based strictly on the text.
5. "reason": Clear administrative rationale explaining why this category and priority were selected.
6. "recommendedAction": Practical suggestion for next steps (e.g. "Inspect reported pothole and schedule road repair if confirmed.").
7. "confidence": A numeric decimal between 0.0 and 1.0 reflecting classification certainty.
8. "extractedEntities": Object containing "location", "issue", "service", "date" (use empty string "" if unavailable).

Respond ONLY with a valid JSON object matching this structure:
{
  "category": "Roads",
  "department": "Road Maintenance",
  "priority": "HIGH",
  "summary": "Short summary of the grievance.",
  "reason": "Reason for the selected category and priority.",
  "recommendedAction": "Suggested administrative action.",
  "confidence": 0.91,
  "extractedEntities": {
    "location": "Main Road",
    "issue": "Large pothole",
    "service": "Road maintenance",
    "date": ""
  }
}`;

  // Prioritize reliable available models according to skill guidelines:
  // gemini-flash-latest and gemini-3.1-flash-lite provide low latency and high availability
  const candidateModels = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  for (const modelName of candidateModels) {
    try {
      const callWithTimeout = (promise, ms = 6000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('AI request timeout')), ms))
        ]);
      };

      const response = await callWithTimeout(ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      }));

      const rawText = response.text || '';
      const cleanText = cleanJsonResponse(rawText);

      let parsed;
      try {
        parsed = JSON.parse(cleanText);
      } catch (parseErr) {
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON structure found in Gemini response');
        }
      }

      return validateAIAnalysis(parsed, context);
    } catch (error) {
      const errMsg = error?.message || 'unknown error';
      // Suppress noisy logs if failing over cleanly
      if (modelName === candidateModels[candidateModels.length - 1]) {
        console.warn(`[AI Grievance Analyzer] Model generation failed on ${modelName}:`, errMsg.slice(0, 100));
      }
    }
  }

  console.warn('[AI Grievance Analyzer] All candidate Gemini models unavailable or overloaded, applying safe deterministic fallback.');
  return getFallbackAnalysis(context);
};

/**
 * Resolves a department name or category to an existing Department ObjectId / memory Id (Module 5.7 & 5.16)
 * @param {string} departmentName
 * @param {string} category
 * @returns {Promise<string|null>}
 */
exports.resolveDepartmentId = async (departmentName, category) => {
  try {
    const searchTerms = [
      departmentName,
      DEPARTMENT_MAP[category],
      category
    ].filter(Boolean);

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      for (const term of searchTerms) {
        const dept = await Department.findOne({
          name: { $regex: new RegExp(term, 'i') },
          active: true
        });
        if (dept) return dept._id;
      }
      // General fallback to first active department
      const firstDept = await Department.findOne({ active: true });
      return firstDept ? firstDept._id : null;
    } else {
      // In-memory fallback
      for (const term of searchTerms) {
        const dept = memoryStore.departments.find(d =>
          d.active && new RegExp(term, 'i').test(d.name)
        );
        if (dept) return dept._id;
      }
      return memoryStore.departments[0] ? memoryStore.departments[0]._id : null;
    }
  } catch (err) {
    console.error('[AI Service] Department resolution error:', err);
    return null;
  }
};

module.exports = {
  ALLOWED_CATEGORIES,
  DEPARTMENT_MAP,
  ALLOWED_PRIORITIES,
  analyzeGrievance: exports.analyzeGrievance,
  resolveDepartmentId: exports.resolveDepartmentId,
  getFallbackAnalysis,
  validateAIAnalysis
};
