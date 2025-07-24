---
type: "always_apply"
---

# ⚡ **RULE SET 4: QUY TRÌNH LÀM VIỆC AN TOÀN**

## 📋 **OVERVIEW**

Rule Set này đảm bảo mọi thay đổi được thực hiện một cách an toàn, có thể kiểm soát và có thể rollback.

---

## 🔧 **RULE 4.1: SAFE WORKFLOW PROTOCOL**

### **5-Step Safe Workflow:**
```
1. 🔍 UNDERSTAND: Analyze current state
2. 📋 PLAN: Break down into small steps
3. 🔧 IMPLEMENT: One step at a time
4. ✅ TEST: Verify each step
5. 📚 DOCUMENT: Provide rollback instructions
```

### **Step 1: UNDERSTAND**
```
□ Current functionality working?
□ Dependencies identified?
□ Impact radius assessed?
□ Existing patterns understood?
□ User requirements clear?
```

### **Step 2: PLAN**
```
□ Break into small, testable steps
□ Identify potential risks
□ Plan testing approach
□ Prepare rollback strategy
□ Estimate time/complexity
```

### **Step 3: IMPLEMENT**
```
□ One logical change at a time
□ Maintain working state between steps
□ Follow existing patterns
□ Add appropriate comments
□ Keep changes focused
```

### **Step 4: TEST**
```
□ Verify each step works
□ Test affected functionality
□ Check for console errors
□ Validate user experience
□ Confirm no regressions
```

### **Step 5: DOCUMENT**
```
□ Explain what was changed
□ Provide rollback instructions
□ Note any side effects
□ Suggest follow-up testing
□ Document any assumptions
```

---

## 📦 **RULE 4.2: INCREMENTAL CHANGES**

### **Quy tắc:**
```
✅ Make small, testable changes
✅ One feature/fix per iteration
✅ Verify each step works
❌ Big bang changes
❌ Multiple unrelated changes together
```

### **Change size guidelines:**
```
🟢 SMALL (Preferred):
- Single component modification
- Styling adjustments
- Text/content changes
- Simple bug fixes

🟡 MEDIUM (Acceptable):
- New component creation
- Feature additions
- API endpoint changes
- Database schema updates

🔴 LARGE (Avoid):
- Multiple component refactoring
- Architecture changes
- Major feature overhauls
- Breaking API changes
```

### **Implementation strategy:**
```
For LARGE changes:
1. Break into SMALL/MEDIUM chunks
2. Implement incrementally
3. Test after each chunk
4. Get user feedback between chunks
5. Adjust plan based on results
```

---

## ✅ **RULE 4.3: TESTING PROTOCOLS**

### **After each significant change:**
```
□ Suggest running the application
□ Recommend testing affected features
□ Provide test scenarios
□ Check for console errors
□ Verify responsive design (if UI changes)
```

### **Testing templates:**

#### **Basic Testing:**
```
🧪 "Để test thay đổi này:
   1. Chạy: npm run dev
   2. Truy cập: [specific URL/page]
   3. Test: [specific functionality]
   4. Kiểm tra console có errors không
   5. Verify: [expected behavior]"
```

#### **Feature Testing:**
```
🧪 "Test scenarios cho feature mới:
   
   ✅ Happy path:
   - [Step 1]: [Expected result]
   - [Step 2]: [Expected result]
   
   ⚠️ Edge cases:
   - [Edge case 1]: [Expected behavior]
   - [Edge case 2]: [Expected behavior]
   
   🚫 Error cases:
   - [Error scenario]: [Expected error handling]"
```

#### **Regression Testing:**
```
🧪 "Kiểm tra không bị regression:
   1. [Existing feature 1]: Vẫn hoạt động bình thường
   2. [Existing feature 2]: Không bị ảnh hưởng
   3. [Core functionality]: Vẫn working as expected"
```

---

## 🔄 **RULE 4.4: ROLLBACK PROCEDURES**

### **Always provide rollback information:**
```
📝 "ROLLBACK INSTRUCTIONS:
   
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
   git reset --hard HEAD~1"
```

### **Rollback complexity levels:**

#### **EASY Rollback:**
```
🟢 Single file changes:
- Copy-paste previous code
- Undo specific lines
- Revert styling changes
```

#### **MEDIUM Rollback:**
```
🟡 Multiple file changes:
- Revert each file individually
- Check dependencies
- Restart development server
```

#### **HARD Rollback:**
```
🔴 Complex changes:
- Database rollback required
- Multiple interdependent changes
- Configuration changes involved
- May require git reset
```

### **Rollback templates:**

#### **Simple Rollback:**
```
🔄 "Để rollback thay đổi này:
   1. Trong file [filename], thay đổi dòng [line number]:
      Từ: [new code]
      Về: [original code]
   2. Save file
   3. Refresh browser"
```

#### **Complex Rollback:**
```
🔄 "COMPLEX ROLLBACK REQUIRED:
   
   Files to revert:
   1. [File 1]: [Specific changes to undo]
   2. [File 2]: [Specific changes to undo]
   
   Steps:
   1. [Detailed step 1]
   2. [Detailed step 2]
   3. Restart: npm run dev
   4. Test: [verification steps]
   
   If issues persist:
   git checkout HEAD~1 [affected files]"
```

---

## 🚨 **RULE 4.5: RISK ASSESSMENT**

### **Risk levels:**
```
🟢 LOW RISK:
- UI styling changes
- Text content updates
- Component prop additions
- Non-breaking additions

🟡 MEDIUM RISK:
- Component logic changes
- New API endpoints
- Database queries
- State management updates

🔴 HIGH RISK:
- Core business logic
- Authentication changes
- Database schema changes
- Breaking API changes

⚫ CRITICAL RISK:
- Security implementations
- Payment processing
- Data migration
- Production deployments
```

### **Risk mitigation strategies:**

#### **For HIGH/CRITICAL risk:**
```
⚫ "HIGH RISK CHANGE DETECTED:
   
   Mitigation required:
   1. ✅ Complete backup created
   2. ✅ Rollback plan documented
   3. ✅ Testing strategy defined
   4. ✅ User confirmation obtained
   
   Proceed only after all checkboxes confirmed."
```

---

## 📝 **PRACTICAL EXAMPLES**

### **Example 1: Safe component modification**
```
🔧 "Tôi sẽ modify UserProfile component theo 3 steps:
   
   Step 1: Add new prop interface
   - File: components/UserProfile.tsx
   - Change: Add 'avatar' prop to interface
   - Test: Component still renders correctly
   
   Step 2: Implement avatar display
   - Add avatar rendering logic
   - Test: Avatar shows when provided
   
   Step 3: Update parent components
   - Pass avatar prop from parent
   - Test: Full functionality working
   
   Rollback: Revert each step in reverse order if issues"
```

### **Example 2: Database change workflow**
```
🔧 "Database schema change - HIGH RISK:
   
   Current state: users table has 5 columns
   Planned: Add 'avatar_url' column
   
   Safe approach:
   1. Backup current database
   2. Add column with DEFAULT value
   3. Test existing queries still work
   4. Update application code
   5. Test new functionality
   
   Rollback plan:
   1. Remove new column: ALTER TABLE users DROP COLUMN avatar_url
   2. Revert application code
   3. Restart application"
```

---

## ⚠️ **COMMON PITFALLS TO AVOID**

1. **Making multiple unrelated changes** in one go
2. **Skipping testing** between steps
3. **Not providing rollback instructions**
4. **Underestimating change complexity**
5. **Not backing up** before risky changes

---

## 🎯 **SUCCESS CRITERIA**

- ✅ All changes made incrementally
- ✅ Each step tested and verified
- ✅ Complete rollback instructions provided
- ✅ Risk level properly assessed
- ✅ No breaking changes without warning
