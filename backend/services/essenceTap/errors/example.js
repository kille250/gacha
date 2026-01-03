/**
 * Essence Tap Error Module - Usage Examples
 *
 * This file demonstrates all the factory functions and utilities
 * provided by the error standardization module.
 */

const {
  ErrorCodes,
  EssenceTapError,
  insufficientEssence,
  insufficientShards,
  insufficientFP,
  invalidId,
  notFound,
  alreadyClaimed,
  limitReached,
  notAvailable,
  onCooldown,
  formatErrorResponse,
  handleActionError,
  fromActionResult
} = require('./index');

// ============================================================================
// Example 1: Insufficient Currency Errors
// ============================================================================

function example1_insufficientCurrency() {
  console.log('\n=== Example 1: Insufficient Currency Errors ===\n');

  // Insufficient essence
  const error1 = insufficientEssence(1000, 500);
  console.log('Insufficient Essence:', error1.toJSON());
  // Output:
  // {
  //   success: false,
  //   error: 'Insufficient essence. Required: 1000, Available: 500',
  //   code: 'INSUFFICIENT_ESSENCE',
  //   details: { required: 1000, available: 500 }
  // }

  // Insufficient shards
  const error2 = insufficientShards(50, 20);
  console.log('\nInsufficient Shards:', error2.toJSON());

  // Insufficient FP
  const error3 = insufficientFP(10, 3);
  console.log('\nInsufficient FP:', error3.toJSON());
}

// ============================================================================
// Example 2: Invalid ID Errors
// ============================================================================

function example2_invalidIds() {
  console.log('\n=== Example 2: Invalid ID Errors ===\n');

  // Invalid generator ID
  const error1 = invalidId('generator', 'gen_999');
  console.log('Invalid Generator:', error1.toJSON());
  console.log('Status Code:', error1.status); // 400

  // Invalid upgrade ID
  const error2 = invalidId('upgrade', 'upg_invalid');
  console.log('\nInvalid Upgrade:', error2.toJSON());

  // Invalid character ID
  const error3 = invalidId('character', 'char_unknown');
  console.log('\nInvalid Character:', error3.toJSON());
}

// ============================================================================
// Example 3: Not Found Errors
// ============================================================================

function example3_notFound() {
  console.log('\n=== Example 3: Not Found Errors ===\n');

  // User not found
  const error1 = notFound('user', '12345');
  console.log('User Not Found:', error1.toJSON());
  console.log('Status Code:', error1.status); // 404

  // Boss not found
  const error2 = notFound('boss', 'boss_dragon');
  console.log('\nBoss Not Found:', error2.toJSON());

  // Generic not found (without ID)
  const error3 = notFound('boss encounter');
  console.log('\nBoss Encounter Not Found:', error3.toJSON());
}

// ============================================================================
// Example 4: Already Claimed Errors
// ============================================================================

function example4_alreadyClaimed() {
  console.log('\n=== Example 4: Already Claimed Errors ===\n');

  // Milestone already claimed
  const error1 = alreadyClaimed('milestone', 'lifetime_100k');
  console.log('Milestone Already Claimed:', error1.toJSON());
  console.log('Status Code:', error1.status); // 409 (Conflict)

  // Challenge already claimed
  const error2 = alreadyClaimed('challenge', 'daily_clicks_1000');
  console.log('\nChallenge Already Claimed:', error2.toJSON());
}

// ============================================================================
// Example 5: Limit Reached Errors
// ============================================================================

function example5_limitReached() {
  console.log('\n=== Example 5: Limit Reached Errors ===\n');

  // Weekly FP cap reached
  const error1 = limitReached('weekly FP', 500, 500);
  console.log('Weekly FP Cap:', error1.toJSON());
  console.log('Error Code:', error1.code); // WEEKLY_FP_CAP_REACHED

  // Infusion limit reached
  const error2 = limitReached('infusion', 10, 10);
  console.log('\nInfusion Limit:', error2.toJSON());
  console.log('Error Code:', error2.code); // INFUSION_LIMIT_REACHED

  // Exchange limit reached
  const error3 = limitReached('exchange', 5, 5);
  console.log('\nExchange Limit:', error3.toJSON());
  console.log('Error Code:', error3.code); // EXCHANGE_LIMIT_REACHED

  // Generic limit (without amounts)
  const error4 = limitReached('daily attempts');
  console.log('\nDaily Attempts Limit:', error4.toJSON());
}

// ============================================================================
// Example 6: Not Available Errors
// ============================================================================

function example6_notAvailable() {
  console.log('\n=== Example 6: Not Available Errors ===\n');

  // Upgrade not available
  const error1 = notAvailable('upgrade', 'Requires 10 generators');
  console.log('Upgrade Locked:', error1.toJSON());
  console.log('Error Code:', error1.code); // UPGRADE_LOCKED

  // Generator not available
  const error2 = notAvailable('generator', 'Requires 1000 lifetime essence');
  console.log('\nGenerator Locked:', error2.toJSON());
  console.log('Error Code:', error2.code); // GENERATOR_LOCKED

  // Ability on cooldown
  const error3 = notAvailable('ability', 'Cooldown active');
  console.log('\nAbility On Cooldown:', error3.toJSON());
  console.log('Error Code:', error3.code); // ON_COOLDOWN

  // Character not owned
  const error4 = notAvailable('character', 'Not owned');
  console.log('\nCharacter Not Owned:', error4.toJSON());
  console.log('Error Code:', error4.code); // CHARACTER_NOT_OWNED
}

// ============================================================================
// Example 7: Cooldown Errors
// ============================================================================

function example7_cooldown() {
  console.log('\n=== Example 7: Cooldown Errors ===\n');

  // Prestige cooldown
  const error1 = onCooldown('prestige', 45000);
  console.log('Prestige Cooldown:', error1.toJSON());
  console.log('Error Code:', error1.code); // PRESTIGE_COOLDOWN
  console.log('Status Code:', error1.status); // 429

  // Gamble cooldown
  const error2 = onCooldown('gamble', 60000);
  console.log('\nGamble Cooldown:', error2.toJSON());
  console.log('Error Code:', error2.code); // GAMBLE_COOLDOWN

  // Boss cooldown
  const error3 = onCooldown('boss', 30000);
  console.log('\nBoss Cooldown:', error3.toJSON());
  console.log('Error Code:', error3.code); // BOSS_COOLDOWN

  // Ability cooldown
  const error4 = onCooldown('ability', 120000);
  console.log('\nAbility Cooldown:', error4.toJSON());
  console.log('Error Code:', error4.code); // ABILITY_COOLDOWN
}

// ============================================================================
// Example 8: Using in Actions
// ============================================================================

function example8_actionPattern() {
  console.log('\n=== Example 8: Using in Actions ===\n');

  // Simulated action function
  function purchaseGenerator({ state: _state, generatorId }) {
    // Validate ID
    if (!generatorId) {
      const error = invalidId('generator', null);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }

    // Check if generator exists
    const generator = { id: 'gen_1', cost: 1000 }; // Simulated
    if (!generator) {
      const error = notFound('generator', generatorId);
      return {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details
      };
    }

    // Check if player has enough essence
    const playerEssence = 500;
    if (playerEssence < generator.cost) {
      const error = insufficientEssence(generator.cost, playerEssence);
      return {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details
      };
    }

    // Success case
    return {
      success: true,
      newState: { essence: playerEssence - generator.cost }
    };
  }

  // Test the action
  const result = purchaseGenerator({
    state: { essence: 500 },
    generatorId: 'gen_1'
  });

  console.log('Purchase Result:', result);
}

// ============================================================================
// Example 9: Format Error Response
// ============================================================================

function example9_formatError() {
  console.log('\n=== Example 9: Format Error Response ===\n');

  // Format EssenceTapError
  const error1 = insufficientEssence(1000, 500);
  const formatted1 = formatErrorResponse(error1);
  console.log('Formatted EssenceTapError:', formatted1);

  // Format generic error
  const error2 = new Error('Something went wrong');
  const formatted2 = formatErrorResponse(error2);
  console.log('\nFormatted Generic Error:', formatted2);
}

// ============================================================================
// Example 10: Handle Action Error (for Express routes)
// ============================================================================

function example10_handleActionError() {
  console.log('\n=== Example 10: Handle Action Error ===\n');

  // Handle EssenceTapError
  const error1 = insufficientEssence(1000, 500);
  const handled1 = handleActionError(error1);
  console.log('Handled EssenceTapError:');
  console.log('  Status:', handled1.status);
  console.log('  Response:', handled1.response);

  // Handle generic error
  const error2 = new Error('Database connection failed');
  const handled2 = handleActionError(error2);
  console.log('\nHandled Generic Error:');
  console.log('  Status:', handled2.status);
  console.log('  Response:', handled2.response);

  // Usage in Express route:
  // try {
  //   // ... action logic
  // } catch (error) {
  //   const { status, response } = handleActionError(error);
  //   res.status(status).json(response);
  // }
}

// ============================================================================
// Example 11: Convert from Legacy Action Result
// ============================================================================

function example11_fromActionResult() {
  console.log('\n=== Example 11: Convert from Legacy Action Result ===\n');

  // Simulate old-style action result
  const oldResult = {
    success: false,
    error: 'Not enough essence',
    code: 'INSUFFICIENT_ESSENCE',
    details: { required: 1000, available: 500 }
  };

  // Convert to EssenceTapError
  const error = fromActionResult(oldResult);
  console.log('Converted Error:', error.toJSON());
  console.log('Status Code:', error.status);
}

// ============================================================================
// Example 12: WebSocket Rejection Format
// ============================================================================

function example12_wsRejection() {
  console.log('\n=== Example 12: WebSocket Rejection Format ===\n');

  const error = insufficientEssence(1000, 500);
  const wsRejection = error.toWSRejection(12345);

  console.log('WebSocket Rejection:', wsRejection);
  // Output:
  // {
  //   clientSeq: 12345,
  //   reason: 'Insufficient essence. Required: 1000, Available: 500',
  //   code: 'INSUFFICIENT_ESSENCE',
  //   required: 1000,
  //   available: 500
  // }
}

// ============================================================================
// Example 13: Creating Custom Errors
// ============================================================================

function example13_customErrors() {
  console.log('\n=== Example 13: Creating Custom Errors ===\n');

  // Create a custom error directly
  const customError = new EssenceTapError(
    ErrorCodes.REQUIREMENTS_NOT_MET,
    'You need to complete the tutorial first',
    { requiredStep: 'tutorial', currentStep: 'intro' }
  );

  console.log('Custom Error:', customError.toJSON());
  console.log('Status Code:', customError.status);
}

// ============================================================================
// Run All Examples
// ============================================================================

if (require.main === module) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Essence Tap Error Module - Usage Examples               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  example1_insufficientCurrency();
  example2_invalidIds();
  example3_notFound();
  example4_alreadyClaimed();
  example5_limitReached();
  example6_notAvailable();
  example7_cooldown();
  example8_actionPattern();
  example9_formatError();
  example10_handleActionError();
  example11_fromActionResult();
  example12_wsRejection();
  example13_customErrors();

  console.log('\nAll examples completed successfully!\n');
}

module.exports = {
  example1_insufficientCurrency,
  example2_invalidIds,
  example3_notFound,
  example4_alreadyClaimed,
  example5_limitReached,
  example6_notAvailable,
  example7_cooldown,
  example8_actionPattern,
  example9_formatError,
  example10_handleActionError,
  example11_fromActionResult,
  example12_wsRejection,
  example13_customErrors
};
