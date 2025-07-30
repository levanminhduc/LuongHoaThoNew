# 🛡️ **RULE SET 7: BUG PREVENTION & QUALITY ASSURANCE**

## 📋 **OVERVIEW**

Rule Set này đảm bảo AI Assistant luôn code với chất lượng cao, hạn chế tối đa bugs và maintain system stability.

---

## 🔍 **RULE 7.1: MANDATORY PRE-CODING ANALYSIS**

### **Quy tắc:**
```
BEFORE ANY CODE CHANGE → COMPLETE ANALYSIS REQUIRED
```

### **Pre-Coding Checklist (MANDATORY):**
```
□ Requirement clarity: 100% hiểu yêu cầu?
□ Business context: Hiểu impact business?
□ Technical scope: Biết tất cả files affected?
□ Complexity assessment: Đánh giá độ phức tạp (1-10)
□ Breaking change risk: Có risk breaking existing?
□ Data integrity risk: Có risk mất data?
□ Dependencies mapping: List tất cả components liên quan
□ API contract changes: Có thay đổi API?
□ Database schema changes: Có thay đổi DB?
```

### **Risk Assessment Template:**
```
🎯 **IMPACT ANALYSIS:**
- **Complexity Level**: [1-10]
- **Files Affected**: [list]
- **Breaking Changes**: [Yes/No - details]
- **Data Risk**: [Low/Medium/High]
- **Rollback Complexity**: [Easy/Medium/Hard]
- **Testing Required**: [areas to test]
```

---

## 🛡️ **RULE 7.2: DEFENSIVE CODING PRINCIPLES**

### **Quy tắc:**
```
✅ ALWAYS: Input validation, error handling, graceful fallbacks
❌ NEVER: Assume inputs are valid, ignore error cases
```

### **Input Validation Pattern:**
```typescript
function safeFunction(input: any): ReturnType {
  // 1. Type validation
  if (!input || typeof input !== 'expected_type') {
    console.warn('Invalid input:', input)
    return defaultValue
  }
  
  // 2. Format validation
  if (!validationPattern.test(input)) {
    console.warn('Invalid format:', input)
    return input // Return original if invalid
  }
  
  // 3. Try-catch execution
  try {
    const result = processInput(input)
    return result
  } catch (error) {
    console.error('Processing error:', error)
    return fallbackValue
  }
}
```

### **Error Handling Pattern:**
```typescript
async function apiCall(endpoint: string, data: any) {
  try {
    // Validate inputs
    if (!endpoint || !data) {
      throw new Error('Missing required parameters')
    }
    
    // Make request with timeout
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10000) // 10s timeout
    })
    
    // Check response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`API Error: ${response.status} - ${errorData.message}`)
    }
    
    return await response.json()
    
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    }
  }
}
```

---

## 📋 **RULE 7.3: STEP-BY-STEP IMPLEMENTATION**

### **Mandatory Implementation Flow:**
```
Step 1: 🔍 ANALYZE
- Understand requirement 100%
- Map all dependencies
- Identify potential risks

Step 2: 📝 PLAN
- Break down into small steps
- Define rollback strategy
- Prepare test scenarios

Step 3: 🧪 TEST-FIRST
- Write test cases first
- Define expected behaviors
- Cover edge cases

Step 4: 🛠️ IMPLEMENT
- One small change at a time
- Validate after each step
- Maintain working state

Step 5: ✅ VERIFY
- Run all tests
- Check affected features
- Confirm no regressions
```

### **Small Steps Principle:**
```
✅ DO: Make incremental changes
✅ DO: Test after each step
✅ DO: Maintain working state
❌ DON'T: Big bang changes
❌ DON'T: Multiple unrelated changes
❌ DON'T: Skip intermediate testing
```

---

## 🧪 **RULE 7.4: COMPREHENSIVE TESTING STRATEGY**

### **Testing Requirements (MANDATORY):**
```
□ Unit tests for new functions
□ Integration tests for API changes
□ Edge case testing
□ Error scenario testing
□ Performance regression testing
□ User acceptance criteria testing
```

### **Test Coverage Requirements:**
```typescript
// A. Happy Path Tests
test('valid input produces expected output', () => {
  expect(function(validInput)).toBe(expectedOutput)
})

// B. Edge Case Tests
test('boundary conditions', () => {
  expect(function('')).toBe(defaultValue)
  expect(function(null)).toBe(defaultValue)
  expect(function(undefined)).toBe(defaultValue)
})

// C. Error Case Tests
test('invalid input handling', () => {
  expect(function(invalidInput)).toBe(fallbackValue)
  expect(() => function(throwingInput)).not.toThrow()
})

// D. Integration Tests
test('component interaction', () => {
  // Test component A + B working together
})
```

---

## 🔄 **RULE 7.5: ROLLBACK STRATEGY**

### **Quy tắc:**
```
EVERY CHANGE → MUST HAVE ROLLBACK PLAN
```

### **Rollback Documentation Template:**
```
📝 **ROLLBACK INSTRUCTIONS:**

What was changed:
- [File 1]: [Specific changes]
- [File 2]: [Specific changes]

To rollback:
1. [Specific rollback step 1]
2. [Specific rollback step 2]
3. [Verification step]

Git rollback (if committed):
git checkout HEAD~1 [filename]

Complete reset (nuclear option):
git reset --hard HEAD~1

Verification after rollback:
- [Test 1]: Should work normally
- [Test 2]: Should show original behavior
```

---

## ⚠️ **RULE 7.6: QUALITY GATES**

### **Code KHÔNG được deploy nếu:**
```
❌ Không có error handling
❌ Không có input validation
❌ Không có tests
❌ Breaking existing functionality
❌ Performance regression
❌ Security vulnerabilities
❌ Không có rollback plan
❌ Không pass all existing tests
```

### **Pre-Deployment Checklist:**
```
□ All tests pass
□ No console errors
□ Performance acceptable
□ Security review passed
□ Rollback plan documented
□ User acceptance criteria met
□ No breaking changes (unless approved)
□ Documentation updated
```

---

## 🎯 **RULE 7.7: COMMUNICATION PROTOCOL**

### **Before Implementation:**
```
🤔 "Tôi hiểu bạn muốn [X]. 
   - Technical scope: [Y]
   - Business impact: [Z]
   - Risk level: [Low/Medium/High]
   - Estimated time: [duration]
   
   Có đúng không? Có gì cần bổ sung?"
```

### **During Implementation:**
```
📋 "Implementation plan:
   1. [Step 1] - [expected outcome]
   2. [Step 2] - [expected outcome]
   3. [Step 3] - [expected outcome]
   
   Rollback strategy: [plan]
   Testing approach: [strategy]"
```

### **After Implementation:**
```
✅ "Completed:
   - Changes made: [summary]
   - Tests passed: [list]
   - Rollback available: [instructions]
   
   Please test: [specific scenarios]"
```

---

## 🚨 **EMERGENCY PROTOCOLS**

### **If Bug Detected:**
```
1. 🛑 STOP: Don't make more changes
2. 🔍 ASSESS: What exactly broke?
3. 📋 DOCUMENT: What was the last working state?
4. 🔄 ROLLBACK: Provide immediate rollback steps
5. 🔧 FIX: Address root cause properly
6. ✅ VERIFY: Test thoroughly before continuing
```

### **Bug Prevention Mindset:**
```
- Assume everything can fail
- Validate all inputs
- Handle all errors gracefully
- Test edge cases thoroughly
- Document rollback procedures
- Prioritize stability over features
```

---

## 🎯 **SUCCESS CRITERIA**

- ✅ Zero production bugs
- ✅ All changes have rollback plans
- ✅ Comprehensive test coverage
- ✅ Clear error handling
- ✅ Graceful degradation
- ✅ User-friendly error messages

**REMEMBER: Quality over speed. Stability over features. Prevention over fixing.** 🛡️
