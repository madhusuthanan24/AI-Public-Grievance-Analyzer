const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, headers: res.headers, data: json, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function login(email, password) {
  const res = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email, password });
  if (res.status !== 200 || !res.data.token) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return res.data.token;
}

async function runTests() {
  console.log('=== STARTING MODULE 9: DUPLICATE DETECTION TEST SUITE ===\n');
  const results = {};

  // 1. Authenticate users
  const adminToken = await login('admin@grievance.gov', 'Admin@123456');
  const roadOfficerToken = await login('road.officer@grievance.gov', 'Officer@123');
  const citizenToken = await login('citizen@temp.com', 'Citizen@123');

  console.log('Authentication passed for Admin, Officer, and Citizen.\n');

  const authReq = (method, path, token, body = null) => {
    const headers = { 'Authorization': `Bearer ${token}` };
    if (body) headers['Content-Type'] = 'application/json';
    return request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers
    }, body);
  };

  // Base complaint for comparison
  console.log('--- SETUP: Submitting Primary Reference Grievance ---');
  const baseRes = await authReq('POST', '/api/complaints', citizenToken, {
    title: 'Severe deep road crater on 5th Cross Roadway',
    description: 'A deep pothole has opened up causing damage to scooters and heavy transit vehicles near 5th Cross.',
    category: 'Roads',
    location: '5th Cross Roadway, Sector 1',
    priority: 'High'
  });
  console.log('Base grievance created:', baseRes.status, baseRes.data?.grievanceId);
  const baseGrievance = baseRes.data;

  // =========================================================================
  // TEST GROUP A: BASIC DETECTION & SIMILARITY
  // =========================================================================
  console.log('\n--- GROUP A: BASIC DETECTION & SIMILARITY ---');

  // Test 2 & 3: Submit highly similar complaint
  const similarRes = await authReq('POST', '/api/complaints', citizenToken, {
    title: 'Dangerous deep road crater on 5th Cross Roadway',
    description: 'Large deep pothole and cavity on 5th Cross Roadway damaging two-wheelers and scooters.',
    category: 'Roads',
    location: '5th Cross Roadway, Sector 1',
    priority: 'High'
  });
  console.log('Similar grievance submission status:', similarRes.status, similarRes.data?.grievanceId);

  // Check admin duplicate lookup for this new grievance
  const simAdminCheck = await authReq('GET', `/api/complaints/${similarRes.data._id}/duplicates`, adminToken);
  console.log('Duplicate candidates count for similar grievance:', simAdminCheck.data?.duplicateCandidates?.length);
  const topCandidate = simAdminCheck.data?.duplicateCandidates?.[0];
  console.log('Top candidate similarity score:', topCandidate?.similarityScore, 'Level:', topCandidate?.similarityLevel);
  console.log('Top candidate reason:', topCandidate?.reason);

  results['A1_candidates_found'] = simAdminCheck.data?.duplicateCandidates?.length > 0;
  results['A2_high_similarity_score'] = topCandidate?.similarityScore >= 0.70;

  // Test 4: Submit completely unrelated complaint
  const unrelatedRes = await authReq('POST', '/api/complaints', citizenToken, {
    title: 'Hospital pediatric pharmacy lacks essential vitamins',
    description: 'Clinic healthcare dispensary has been out of infant vitamin supplements since yesterday.',
    category: 'Public Health',
    location: 'District Maternity Hospital Wing C',
    priority: 'Medium'
  });
  const unrelAdminCheck = await authReq('GET', `/api/complaints/${unrelatedRes.data._id}/duplicates`, adminToken);
  console.log('Duplicate candidates for unrelated grievance count:', unrelAdminCheck.data?.duplicateCandidates?.length);
  results['A3_unrelated_no_high_match'] = (unrelAdminCheck.data?.duplicateCandidates?.length === 0) ||
    (unrelAdminCheck.data?.duplicateCandidates?.[0]?.similarityScore < 0.50);

  // =========================================================================
  // TEST GROUP B: CATEGORY & LOCATION INTERACTIONS
  // =========================================================================
  console.log('\n--- GROUP B: CATEGORY & LOCATION INTERACTIONS ---');

  // Test B5: Same category + same location + similar description
  const b5Res = await authReq('POST', '/api/complaints', citizenToken, {
    title: 'Huge pothole and broken asphalt on 5th Cross Roadway',
    description: 'Vehicle tires are getting trapped in the deep pothole on 5th Cross Roadway.',
    category: 'Roads',
    location: '5th Cross Roadway, Sector 1'
  });
  const b5Check = await authReq('GET', `/api/complaints/${b5Res.data._id}/duplicates`, adminToken);
  const b5Top = b5Check.data?.duplicateCandidates?.[0];
  console.log('B5 Same category + same location similarity:', b5Top?.similarityScore, b5Top?.similarityLevel);
  results['B5_same_category_same_location'] = b5Top?.similarityScore >= 0.70;

  // Test B6: Same category + different location
  const b6Res = await authReq('POST', '/api/complaints', citizenToken, {
    title: 'Broken asphalt on North Peripheral Highway Mile 42',
    description: 'Road surface is rough and crumbling near North Peripheral Highway Mile 42.',
    category: 'Roads',
    location: 'North Peripheral Highway Mile 42'
  });
  const b6Check = await authReq('GET', `/api/complaints/${b6Res.data._id}/duplicates`, adminToken);
  const b6Top = b6Check.data?.duplicateCandidates?.[0];
  console.log('B6 Same category + different location similarity:', b6Top?.similarityScore || 0);
  results['B6_different_location_lower_similarity'] = !b6Top || b6Top.similarityScore < (b5Top?.similarityScore || 0.70);

  // Test B7: Different category + same location (e.g. Street Light at 5th Cross)
  const b7Res = await authReq('POST', '/api/complaints', citizenToken, {
    title: 'Street light pole non-functional at night',
    description: 'The overhead mercury vapor street lamp bulb is dead leaving the road pitch dark.',
    category: 'Street Lights',
    location: '5th Cross Roadway, Sector 1'
  });
  const b7Check = await authReq('GET', `/api/complaints/${b7Res.data._id}/duplicates`, adminToken);
  const b7CandidateMatches = b7Check.data?.duplicateCandidates || [];
  const roadMatch = b7CandidateMatches.find(c => c.grievanceId === baseGrievance.grievanceId);
  console.log('B7 Different category with same location score:', roadMatch?.similarityScore || 0);
  results['B7_different_category_not_high_duplicate'] = !roadMatch || roadMatch.similarityScore < 0.65;

  // =========================================================================
  // TEST GROUP C: AUTHORIZATION & SECURITY
  // =========================================================================
  console.log('\n--- GROUP C: AUTHORIZATION & SECURITY ---');

  // Test C8: Citizen calls duplicate-review API -> 403
  const citizenReviewAttempt = await authReq('PUT', `/api/complaints/${similarRes.data._id}/duplicate-review`, citizenToken, {
    decision: 'CONFIRMED_DUPLICATE',
    duplicateOf: baseGrievance.grievanceId
  });
  console.log('C8 Citizen duplicate review attempt status:', citizenReviewAttempt.status, '(Expected 403)');
  results['C8_citizen_review_forbidden'] = citizenReviewAttempt.status === 403;

  // Test C9: Officer calls duplicate-review API -> 403
  const officerReviewAttempt = await authReq('PUT', `/api/complaints/${similarRes.data._id}/duplicate-review`, roadOfficerToken, {
    decision: 'CONFIRMED_DUPLICATE',
    duplicateOf: baseGrievance.grievanceId
  });
  console.log('C9 Officer duplicate review attempt status:', officerReviewAttempt.status, '(Expected 403)');
  results['C9_officer_review_forbidden'] = officerReviewAttempt.status === 403;

  // Test C10: Citizen calls GET /duplicates API -> 403
  const citizenGetDupAttempt = await authReq('GET', `/api/complaints/${similarRes.data._id}/duplicates`, citizenToken);
  console.log('C10 Citizen GET duplicates attempt status:', citizenGetDupAttempt.status, '(Expected 403)');
  results['C10_citizen_get_duplicates_forbidden'] = citizenGetDupAttempt.status === 403;

  // =========================================================================
  // TEST GROUP D: ADMIN DECISIONS & HISTORY
  // =========================================================================
  console.log('\n--- GROUP D: ADMIN DECISIONS & HISTORY ---');

  // Test D12: Admin marks NOT_DUPLICATE
  const notDupRes = await authReq('PUT', `/api/complaints/${b6Res.data._id}/duplicate-review`, adminToken, {
    decision: 'NOT_DUPLICATE',
    reviewNote: 'Different road section verified by administrator.'
  });
  console.log('D12 Mark NOT_DUPLICATE status:', notDupRes.status);
  console.log('D12 duplicateReviewStatus:', notDupRes.data?.duplicateReviewStatus);
  console.log('D12 reviewNote:', notDupRes.data?.duplicateReviewNote);
  results['D12_not_duplicate_stored'] = notDupRes.status === 200 &&
    notDupRes.data?.duplicateReviewStatus === 'NOT_DUPLICATE';

  // Test D13 & D14: Admin confirms duplicate of base grievance
  const fakeReviewedAt = '1990-01-01T00:00:00.000Z';
  const confirmDupRes = await authReq('PUT', `/api/complaints/${similarRes.data._id}/duplicate-review`, adminToken, {
    decision: 'CONFIRMED_DUPLICATE',
    duplicateOf: baseGrievance.grievanceId,
    reviewNote: 'Confirmed duplicate of previously reported pothole on 5th Cross.',
    reviewedAt: fakeReviewedAt // Client tampering check
  });
  console.log('D13 Confirm duplicate status:', confirmDupRes.status);
  console.log('D13 duplicateReviewStatus:', confirmDupRes.data?.duplicateReviewStatus);
  console.log('D13 confirmedDuplicateOf:', confirmDupRes.data?.confirmedDuplicateOf);

  results['D13_confirmed_duplicate_stored'] = confirmDupRes.status === 200 &&
    confirmDupRes.data?.duplicateReviewStatus === 'CONFIRMED_DUPLICATE' &&
    confirmDupRes.data?.confirmedDuplicateOf !== null;

  // Test D14: Verify GrievanceHistory has DUPLICATE_REVIEWED
  const lastHistory = confirmDupRes.data?.history?.slice(-1)[0];
  console.log('D14 Last history status:', lastHistory?.status, 'Remark:', lastHistory?.remark);
  results['D14_duplicate_history_created'] = lastHistory?.status === 'DUPLICATE_REVIEWED' &&
    lastHistory?.changedByRole === 'admin';

  // Test D15: Server generated timestamp check
  const reviewTime = new Date(confirmDupRes.data?.duplicateReviewedAt).getTime();
  const isServerTime = Math.abs(Date.now() - reviewTime) < 60000;
  console.log('D15 Server generated reviewedAt (not 1990):', isServerTime, confirmDupRes.data?.duplicateReviewedAt);
  results['D15_server_timestamp_enforced'] = isServerTime;

  // =========================================================================
  // TEST GROUP E: INTEGRITY & NON-AUTO-MERGE
  // =========================================================================
  console.log('\n--- GROUP E: INTEGRITY & NON-AUTO-MERGE ---');

  // Verify complaint fields remain completely untouched
  console.log('E16 Title preserved:', confirmDupRes.data?.title === similarRes.data?.title);
  console.log('E16 Description preserved:', confirmDupRes.data?.description === similarRes.data?.description);
  console.log('E16 Operational status preserved:', confirmDupRes.data?.status === similarRes.data?.status);
  results['E16_integrity_preserved'] =
    confirmDupRes.data?.title === similarRes.data?.title &&
    confirmDupRes.data?.description === similarRes.data?.description &&
    confirmDupRes.data?.status === similarRes.data?.status;

  // Grievance was NOT auto-closed, auto-resolved, or auto-deleted
  const getGrievanceAgain = await authReq('GET', `/api/complaints/${similarRes.data._id}`, adminToken);
  console.log('E17 Complaint still exists and is accessible:', getGrievanceAgain.status === 200);
  console.log('E17 Operational status is not CLOSED/RESOLVED:', getGrievanceAgain.data?.status !== 'RESOLVED' && getGrievanceAgain.data?.status !== 'CLOSED');
  results['E17_not_auto_closed_or_merged'] = getGrievanceAgain.status === 200 &&
    getGrievanceAgain.data?.status !== 'RESOLVED' &&
    getGrievanceAgain.data?.status !== 'CLOSED';

  // =========================================================================
  // TEST GROUP F: CITIZEN VIEW SANITIZATION
  // =========================================================================
  console.log('\n--- GROUP F: CITIZEN VIEW SANITIZATION ---');
  const citizenDetailView = await authReq('GET', `/api/complaints/${similarRes.data._id}`, citizenToken);
  console.log('F18 Citizen can view complaint:', citizenDetailView.status === 200);
  console.log('F18 Citizen does NOT see internal duplicateCandidates array:', citizenDetailView.data?.duplicateCandidates === undefined);
  console.log('F18 Citizen does NOT see internal duplicateReviewNote:', citizenDetailView.data?.duplicateReviewNote === undefined);
  results['F18_citizen_view_sanitized'] = citizenDetailView.status === 200 &&
    citizenDetailView.data?.duplicateCandidates === undefined &&
    citizenDetailView.data?.duplicateReviewNote === undefined;

  // =========================================================================
  // TEST GROUP G: REGRESSION (MODULES 6, 7, 8)
  // =========================================================================
  console.log('\n--- GROUP G: REGRESSION TESTING (MODULES 6, 7, 8) ---');

  // G21: Module 6 Admin Review works
  const mod6Review = await authReq('PUT', `/api/complaints/${similarRes.data._id}/review`, adminToken, {
    notes: 'Admin review completed during Module 9 verification'
  });
  console.log('G21 Module 6 Admin review status:', mod6Review.status, 'isReviewed:', mod6Review.data?.isReviewed);
  results['G21_module6_admin_review'] = mod6Review.status === 200 && mod6Review.data?.isReviewed === true;

  // G22: Module 7 Assignment works
  const mod7Assign = await authReq('PUT', `/api/complaints/${similarRes.data._id}/assign`, adminToken, {
    departmentId: '661ad1100000000000000001',
    officerId: '661ad2200000000000000002'
  });
  console.log('G22 Module 7 Officer assignment status:', mod7Assign.status, 'Status:', mod7Assign.data?.status);
  results['G22_module7_assignment'] = mod7Assign.status === 200 && mod7Assign.data?.status === 'ASSIGNED';

  // G23: Module 8 Officer Processing (ASSIGNED -> IN_PROGRESS -> RESOLVED) works
  const mod8Start = await authReq('PUT', `/api/complaints/${similarRes.data._id}/status`, roadOfficerToken, {
    status: 'IN_PROGRESS'
  });
  console.log('G23 Module 8 Officer Start Processing:', mod8Start.status, mod8Start.data?.status);

  const mod8Resolve = await authReq('PUT', `/api/complaints/${similarRes.data._id}/status`, roadOfficerToken, {
    status: 'RESOLVED',
    resolutionRemark: 'Repair executed by asphalt patching team.',
    officerAction: 'Road surface leveled and hot asphalt applied.'
  });
  console.log('G23 Module 8 Officer Resolve:', mod8Resolve.status, mod8Resolve.data?.status);
  results['G23_module8_officer_processing'] = mod8Start.status === 200 &&
    mod8Resolve.status === 200 &&
    mod8Resolve.data?.status === 'RESOLVED';

  console.log('\n=== MODULE 9 TEST SUITE RESULTS ===');
  console.log(JSON.stringify(results, null, 2));

  const allPassed = Object.values(results).every(v => v === true);
  console.log('\nOVERALL RESULT:', allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
  if (!allPassed) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
