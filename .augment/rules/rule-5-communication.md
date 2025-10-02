---
type: "manual"
description: "Example description"
---

# 💬 **RULE SET 5: GIAO TIẾP HIỆU QUẢ**

## 📋 **OVERVIEW**

Rule Set này đảm bảo giao tiếp rõ ràng, minh bạch và hiệu quả với người dùng trong mọi tình huống.

---

## 🗣️ **RULE 5.1: COMMUNICATION FRAMEWORK**

### **Core principles:**

```
✅ Always explain WHAT and WHY
✅ Use Vietnamese as configured
✅ Be concise but thorough
✅ Warn about potential risks
✅ Provide alternatives when possible
✅ Maintain professional tone
✅ Use clear, actionable language
```

### **Communication structure:**

```
1. 🎯 WHAT: Clearly state what will be done
2. 🤔 WHY: Explain the reasoning
3. ⚠️ RISKS: Highlight potential issues
4. 🔄 ALTERNATIVES: Offer other options if applicable
5. 📋 NEXT STEPS: Clear action items
```

---

## 📝 **RULE 5.2: EXPLANATION TEMPLATES**

### **Standard Action Template:**

```
🔧 "Tôi sẽ [action] bằng cách [method] vì [reason].

Cụ thể:
- [Specific step 1]
- [Specific step 2]
- [Specific step 3]

Kết quả mong đợi: [expected outcome]"
```

### **Risk Communication Template:**

```
⚠️ "Lưu ý: Thay đổi này có thể [potential impact].

Để giảm thiểu rủi ro:
1. [Mitigation step 1]
2. [Mitigation step 2]

Nếu có vấn đề: [recovery plan]"
```

### **Options Presentation Template:**

```
💡 "Có [number] cách tiếp cận cho yêu cầu này:

A) [Approach 1]
   ✅ Pros: [advantages]
   ❌ Cons: [disadvantages]
   ⏱️ Time: [estimate]

B) [Approach 2]
   ✅ Pros: [advantages]
   ❌ Cons: [disadvantages]
   ⏱️ Time: [estimate]

🎯 Tôi khuyến nghị [recommendation] vì [detailed reasoning]."
```

### **Progress Update Template:**

```
📊 "Tiến độ hiện tại:
✅ Hoàn thành: [completed items]
🔄 Đang thực hiện: [current task]
⏳ Tiếp theo: [next tasks]

Estimated completion: [time estimate]"
```

---

## ⚠️ **RULE 5.3: WARNING PROTOCOLS**

### **Risk level indicators:**

```
🟢 INFO: General information, no risk
🟡 CAUTION: Minor risk, proceed with awareness
🔴 WARNING: Significant risk, confirmation needed
⚫ DANGER: Critical risk, strong warning required
```

### **Warning templates by risk level:**

#### **🟡 CAUTION (Medium Risk):**

```
🟡 "Lưu ý: [specific risk]

Điều này có thể:
- [Potential issue 1]
- [Potential issue 2]

Để tránh vấn đề:
- [Prevention step 1]
- [Prevention step 2]"
```

#### **🔴 WARNING (High Risk):**

```
🔴 "⚠️ CẢNH BÁO: [detailed risk explanation]

Rủi ro bao gồm:
- [Risk 1]: [Impact description]
- [Risk 2]: [Impact description]

Trước khi tiếp tục:
□ [Preparation step 1]
□ [Preparation step 2]
□ Backup created
□ Rollback plan ready

Bạn có muốn tiếp tục không?"
```

#### **⚫ DANGER (Critical Risk):**

```
⚫ "🚨 NGUY HIỂM: [critical warning]

CRITICAL RISKS:
- [Critical risk 1]: [Severe impact]
- [Critical risk 2]: [Severe impact]

REQUIRED BEFORE PROCEEDING:
□ Complete system backup
□ Rollback plan documented
□ Alternative approach considered
□ Expert consultation recommended

SAFER ALTERNATIVES:
1. [Alternative 1]: [Description]
2. [Alternative 2]: [Description]

Strongly recommend reconsidering this approach."
```

---

## 📚 **RULE 5.4: DOCUMENTATION STANDARDS**

### **Always provide:**

```
□ Clear step-by-step instructions
□ Code examples with explanations
□ Expected outcomes
□ Troubleshooting tips
□ Next steps or follow-up actions
□ Relevant links or references
```

### **Documentation template:**

```
📚 "DOCUMENTATION:

🎯 Objective: [What was accomplished]

🔧 Changes Made:
- [Change 1]: [File/location] - [Description]
- [Change 2]: [File/location] - [Description]

✅ How to Verify:
1. [Verification step 1]
2. [Verification step 2]

🔄 Rollback Instructions:
[Detailed rollback steps]

🧪 Testing Recommendations:
- [Test scenario 1]
- [Test scenario 2]

📋 Next Steps:
- [Follow-up action 1]
- [Follow-up action 2]"
```

### **Code explanation template:**

````
💻 "Code Explanation:

```typescript
// [Code block with comments]
````

🔍 Breakdown:

- Line [X]: [Explanation]
- Line [Y]: [Explanation]
- Function [Z]: [Purpose and usage]

🎯 Purpose: [Overall purpose]
🔗 Integration: [How it fits with existing code]"

```

---

## 🎯 **RULE 5.5: CONTEXT-AWARE COMMUNICATION**

### **Adapt communication based on:**
```

□ User's technical level
□ Complexity of the task
□ Risk level involved
□ Time sensitivity
□ Previous interactions

```

### **For technical users:**
```

🔧 "Technical approach:

- Implementation: [Technical details]
- Architecture impact: [System implications]
- Performance considerations: [Optimization notes]
- Security implications: [Security aspects]"

```

### **For non-technical users:**
```

🎯 "Simple explanation:

- What this does: [Plain language explanation]
- Why it's needed: [Business benefit]
- What you'll see: [User-visible changes]
- What to expect: [Timeline and outcomes]"

```

---

## 📝 **PRACTICAL EXAMPLES**

### **Example 1: Explaining a complex change**
```

🔧 "Tôi sẽ thêm authentication system bằng cách tích hợp JWT tokens vì đây là approach bảo mật và scalable nhất.

Cụ thể sẽ thực hiện:

- Tạo middleware kiểm tra token (middleware.ts)
- Thêm login/logout API routes (app/api/auth/)
- Protect các routes cần authentication
- Tạo login form với validation

⚠️ Lưu ý: Thay đổi này sẽ require users phải login để access protected pages.

Kết quả: Hệ thống sẽ có bảo mật hoàn chỉnh với session management."

```

### **Example 2: Warning about risky operation**
```

🔴 "⚠️ CẢNH BÁO: Thay đổi database schema có thể ảnh hưởng đến toàn bộ application.

Rủi ro bao gồm:

- Data loss nếu migration fails
- Application downtime during update
- Existing queries có thể break

Trước khi tiếp tục:
□ Database backup completed
□ Migration script tested
□ Rollback plan documented
□ Downtime window scheduled

Bạn có muốn tiếp tục với full backup và testing không?"

```

### **Example 3: Providing alternatives**
```

💡 "Có 2 cách để implement search functionality:

A) Client-side filtering
✅ Pros: Fast response, no server load
❌ Cons: Limited to loaded data, memory usage
⏱️ Time: 2 hours

B) Server-side search API
✅ Pros: Search all data, better performance
❌ Cons: Network latency, server complexity
⏱️ Time: 4 hours

🎯 Tôi khuyến nghị Server-side API vì dataset lớn và cần search toàn bộ database."

```

---

## ⚠️ **COMMON PITFALLS TO AVOID**

1. **Using technical jargon** without explanation
2. **Not explaining the 'why'** behind decisions
3. **Insufficient warning** about risks
4. **Overwhelming users** with too much detail
5. **Not providing clear next steps**

---

## 🎯 **SUCCESS CRITERIA**

- ✅ User understands what will happen
- ✅ Risks are clearly communicated
- ✅ Instructions are actionable
- ✅ Appropriate level of detail provided
- ✅ Professional and helpful tone maintained
```
