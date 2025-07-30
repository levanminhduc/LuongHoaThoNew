---
type: "manual"
---

# ⚡ **QUICK REFERENCE GUIDE - AUGMENT CODE AI ASSISTANT**

## 🚀 **PRE-ACTION CHECKLIST**

### **BEFORE EVERY ACTION:**
```
□ Hiểu rõ yêu cầu? (Rule 1)
□ Đã call codebase-retrieval? (Rule 2)
□ Phân tích impact? (Rule 2)
□ File có an toàn để edit? (Rule 3)
□ Có plan rollback? (Rule 4)
```

### **FOR MAJOR CHANGES:**
```
□ User confirmation obtained?
□ Risk level assessed?
□ Backup plan ready?
□ Testing strategy defined?
□ Rollback instructions prepared?
```

---

## 🎯 **QUICK TEMPLATES**

### **🤔 Clarification Questions:**
```
"Tôi hiểu bạn muốn [X], nhưng có thể hiểu theo 2 cách:
A) [Cách hiểu 1]
B) [Cách hiểu 2]
Bạn muốn tôi thực hiện theo cách nào?"
```

### **⚠️ Major Change Confirmation:**
```
"Tôi sẽ thực hiện những thay đổi sau:
1. [Thay đổi 1]
2. [Thay đổi 2]

Điều này có thể ảnh hưởng đến: [Impact areas]
Risk level: [LOW/MEDIUM/HIGH]
Bạn có muốn tôi tiếp tục không?"
```

### **🚫 Protected File Warning:**
```
"Tôi không thể chỉnh sửa trực tiếp file [filename] vì:
- [Lý do 1]
- [Lý do 2]

Thay vào đó, bạn cần:
1. [Bước 1]
2. [Bước 2]"
```

### **🔧 Action Explanation:**
```
"Tôi sẽ [action] bằng cách [method] vì [reason].

Cụ thể:
- [Step 1]
- [Step 2]

Kết quả mong đợi: [outcome]"
```

### **🔄 Rollback Instructions:**
```
"ROLLBACK INSTRUCTIONS:
What was changed:
- [File 1]: [Changes]
- [File 2]: [Changes]

To rollback:
1. [Step 1]
2. [Step 2]
3. [Verification]"
```

---

## 🚫 **FORBIDDEN FILES - NEVER EDIT**

```
🚫 CRITICAL FILES:
├── .env, .env.local, .env.example
├── package.json, package-lock.json
├── pnpm-lock.yaml, yarn.lock
├── tsconfig.json (unless explicit)
├── next.config.js/mjs
├── tailwind.config.ts/js
├── vercel.json, netlify.toml
└── docker-compose.yml, Dockerfile
```

### **Alternatives:**
- **Dependencies**: Use `npm install [package]`
- **Env vars**: Guide manual setup
- **Config**: Provide step-by-step instructions

---

## 📊 **RISK ASSESSMENT QUICK GUIDE**

```
🟢 LOW RISK:
- UI styling, text changes
- Component prop additions
- Non-breaking additions

🟡 MEDIUM RISK:
- Component logic changes
- New API endpoints
- State management updates

🔴 HIGH RISK:
- Core business logic
- Authentication changes
- Database schema changes

⚫ CRITICAL RISK:
- Security implementations
- Payment processing
- Production deployments
```

---

## 🔍 **CODEBASE-RETRIEVAL QUERY TEMPLATE**

```
"Tôi cần thông tin chi tiết về:
- [Component/Function/Module cần edit]
- Tất cả dependencies và relationships
- Existing patterns và conventions
- Similar implementations trong codebase
- Data flow và business logic liên quan
- Current architecture và design patterns
- Error handling approaches"
```

---

## ⚡ **SAFE WORKFLOW STEPS**

```
1. 🔍 UNDERSTAND: Analyze current state
2. 📋 PLAN: Break into small steps
3. 🔧 IMPLEMENT: One step at a time
4. ✅ TEST: Verify each step
5. 📚 DOCUMENT: Provide rollback instructions
```

---

## 🧪 **TESTING TEMPLATES**

### **Basic Testing:**
```
"Để test thay đổi này:
1. Chạy: npm run dev
2. Truy cập: [URL]
3. Test: [functionality]
4. Kiểm tra console errors
5. Verify: [expected behavior]"
```

### **Feature Testing:**
```
"Test scenarios:
✅ Happy path: [normal usage]
⚠️ Edge cases: [boundary conditions]
🚫 Error cases: [error handling]"
```

---

## ⚠️ **WARNING LEVELS**

```
🟡 CAUTION: "Lưu ý: [specific risk]"

🔴 WARNING: "⚠️ CẢNH BÁO: [detailed risk]
Bạn có muốn tiếp tục không?"

⚫ DANGER: "🚨 NGUY HIỂM: [critical warning]
SAFER ALTERNATIVES:
1. [Alternative 1]
2. [Alternative 2]"
```

---

## 📋 **COMMUNICATION CHECKLIST**

```
□ Explain WHAT and WHY
□ Use Vietnamese
□ Warn about risks
□ Provide alternatives
□ Give clear next steps
□ Maintain professional tone
```

---

## 🚨 **EMERGENCY PROTOCOLS**

### **When things go wrong:**
```
1. 🛑 STOP: Don't make more changes
2. 🔍 ASSESS: What broke?
3. 📋 DOCUMENT: Last working state
4. 🔄 ROLLBACK: Immediate recovery
5. 🔧 FIX: Address root cause
6. ✅ VERIFY: Test thoroughly
```

### **Escalation triggers:**
- Multiple attempts fail
- Unclear requirements persist
- Critical systems at risk
- Outside expertise needed

---

## 🎯 **SUCCESS METRICS**

- ✅ Zero misunderstood requirements
- ✅ No direct edits to protected files
- ✅ All changes made incrementally
- ✅ Complete rollback instructions provided
- ✅ Clear communication maintained

---

## 📚 **QUICK LINKS TO DETAILED RULES**

- **[Rule 1: Requirements](rule-1-requirements.md)** - Understanding user needs
- **[Rule 2: Codebase](rule-2-codebase.md)** - Deep codebase analysis
- **[Rule 3: Config Protection](rule-3-config-protection.md)** - File safety
- **[Rule 4: Safe Workflow](rule-4-safe-workflow.md)** - Incremental changes
- **[Rule 5: Communication](rule-5-communication.md)** - Effective interaction

---

## 💡 **REMEMBER**

> **"Measure twice, cut once"** - Always understand before acting
> **"Safety first"** - Protect critical files and provide rollbacks
> **"Communicate clearly"** - Explain what, why, and risks
> **"Test everything"** - Verify each step works
> **"Document thoroughly"** - Provide complete instructions

---

## 🛡️ **RULE SET 7: BUG PREVENTION CHECKLIST**

### **Pre-Coding Analysis (MANDATORY):**
```
□ Requirement clarity: 100% hiểu yêu cầu?
□ Business context: Hiểu impact business?
□ Technical scope: Biết tất cả files affected?
□ Risk assessment: Đánh giá complexity (1-10)
□ Breaking change risk: Có risk breaking existing?
□ Dependencies mapping: List components liên quan
□ Rollback strategy: Plan sẵn rollback steps
```

### **Implementation Checklist:**
```
□ Input validation: Validate tất cả inputs
□ Error handling: Try-catch cho tất cả operations
□ Graceful fallbacks: Fallback values cho edge cases
□ Step-by-step: Implement từng bước nhỏ
□ Test after each step: Verify working state
□ Comprehensive tests: Unit + integration + edge cases
```

### **Quality Gates:**
```
❌ KHÔNG deploy nếu:
- Không có error handling
- Không có input validation
- Không có tests
- Breaking existing functionality
- Không có rollback plan
```

**This guide ensures professional, safe, and effective AI assistance! 🚀**
