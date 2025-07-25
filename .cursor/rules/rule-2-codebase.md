---
type: "always_apply"
---

# 🔍 **RULE SET 2: HIỂU CODEBASE CHI TIẾT VÀ TOÀN DIỆN**

## 📋 **OVERVIEW**

Rule Set này đảm bảo AI Assistant hiểu sâu về codebase trước khi thực hiện bất kỳ thay đổi nào.

---

## 🔍 **RULE 2.1: MANDATORY CODEBASE ANALYSIS**

### **Quy tắc:**
```
BEFORE ANY EDIT → ALWAYS CALL codebase-retrieval
```

### **Template query cho codebase-retrieval:**
```
"Tôi cần thông tin chi tiết về:
- [Component/Function/Module cần edit]
- Tất cả dependencies và relationships
- Existing patterns và conventions
- Similar implementations trong codebase
- Data flow và business logic liên quan
- Current architecture và design patterns
- Error handling approaches
- Testing patterns (nếu có)"
```

### **Mandatory analysis checklist:**
```
□ Component/function structure
□ Input/output interfaces
□ Dependencies (imports/exports)
□ Usage patterns across codebase
□ Naming conventions
□ Code style patterns
□ Error handling approaches
□ Performance considerations
```

### **Analysis depth levels:**
- **Surface**: Component interface và basic structure
- **Medium**: Dependencies, usage patterns, conventions
- **Deep**: Business logic, data flow, architectural patterns

---

## 🏗️ **RULE 2.2: RESPECT EXISTING PATTERNS**

### **Quy tắc:**
```
✅ Follow existing naming conventions
✅ Use established patterns
✅ Maintain consistent code style
✅ Respect architectural decisions
❌ Introduce new patterns without justification
```

### **Pattern analysis checklist:**
```
□ Naming conventions (camelCase, PascalCase, kebab-case)
□ File organization structure
□ Component composition patterns
□ State management approaches
□ API calling patterns
□ Error handling strategies
□ Styling approaches (CSS modules, Tailwind, etc.)
□ Import/export conventions
```

### **Examples of respecting patterns:**

#### **Naming Conventions:**
```typescript
// Existing pattern found:
const getUserData = () => {}
const updateUserProfile = () => {}

// Follow same pattern:
const deleteUserAccount = () => {} // ✅ Correct
const removeUser = () => {}        // ❌ Inconsistent
```

#### **Component Structure:**
```typescript
// Existing pattern:
interface ComponentProps {
  title: string;
  onAction: () => void;
}

export default function Component({ title, onAction }: ComponentProps) {
  return <div>...</div>
}

// Follow same pattern for new components
```

---

## 📊 **RULE 2.3: UNDERSTAND IMPACT RADIUS**

### **Impact Assessment Framework:**
```
🟢 LOW IMPACT: UI styling, text changes, isolated components
🟡 MEDIUM IMPACT: Component logic, new features, shared utilities
🔴 HIGH IMPACT: Core logic, data structures, API changes
⚫ CRITICAL IMPACT: Auth, security, database schema, build config
```

### **Impact analysis questions:**
```
□ How many files will be affected?
□ How many components depend on this?
□ Will this break existing functionality?
□ Are there shared utilities involved?
□ Will this affect the API contract?
□ Are there database implications?
□ Will this impact performance?
□ Are there security considerations?
```

### **Impact documentation template:**
```
📊 **Impact Analysis:**
- **Files affected**: [number] files
- **Components impacted**: [list]
- **Risk level**: [LOW/MEDIUM/HIGH/CRITICAL]
- **Breaking changes**: [Yes/No - details]
- **Testing required**: [areas to test]
- **Rollback complexity**: [Easy/Medium/Hard]
```

---

## 🔗 **RULE 2.4: ANALYZE DEPENDENCIES**

### **Dependency analysis checklist:**
```
□ What depends on this code? (consumers)
□ What does this code depend on? (dependencies)
□ Are there shared utilities being used?
□ Will changes break other features?
□ Are there circular dependencies?
□ What external libraries are involved?
□ Are there version compatibility issues?
```

### **Dependency mapping template:**
```
🔗 **Dependency Analysis:**

**Upstream Dependencies** (what this code depends on):
- [Dependency 1]: [usage description]
- [Dependency 2]: [usage description]

**Downstream Dependencies** (what depends on this code):
- [Consumer 1]: [how it's used]
- [Consumer 2]: [how it's used]

**Shared Utilities**:
- [Utility 1]: [shared across X components]
- [Utility 2]: [shared across Y components]

**External Libraries**:
- [Library 1]: [version, usage]
- [Library 2]: [version, usage]
```

---

## 🏛️ **RULE 2.5: ARCHITECTURAL UNDERSTANDING**

### **Architecture analysis points:**
```
□ Overall application structure
□ Data flow patterns
□ State management approach
□ Component hierarchy
□ API design patterns
□ Database schema relationships
□ Authentication/authorization flow
□ Error handling strategy
```

### **Common architectural patterns to identify:**
- **MVC/MVP/MVVM**: Model-View-Controller patterns
- **Component composition**: How components are structured
- **State management**: Redux, Context, local state patterns
- **Data fetching**: REST, GraphQL, SWR patterns
- **Routing**: File-based, programmatic routing
- **Authentication**: JWT, session-based, OAuth flows

---

## 📝 **PRACTICAL EXAMPLES**

### **Example 1: Before editing a component**
```typescript
// BEFORE editing UserProfile component:

// 1. Call codebase-retrieval:
"Tôi cần thông tin về UserProfile component:
- Component structure và props interface
- Tất cả nơi sử dụng UserProfile
- Related components (UserCard, UserList, etc.)
- State management patterns được sử dụng
- API calls và data fetching approaches
- Styling patterns (Tailwind classes, CSS modules)
- Error handling trong user-related components"

// 2. Analyze findings:
// - UserProfile used in 3 places
// - Uses custom hook useUserData
// - Follows compound component pattern
// - Uses Tailwind for styling
// - Has consistent error boundary pattern

// 3. Plan changes respecting patterns
```

### **Example 2: Adding new API endpoint**
```typescript
// BEFORE adding new API route:

// 1. Analyze existing API patterns:
"Tôi cần hiểu API patterns trong dự án:
- Existing API routes structure
- Authentication middleware usage
- Error handling patterns
- Response format conventions
- Validation approaches
- Database interaction patterns"

// 2. Follow discovered patterns:
// - All APIs use middleware for auth
// - Consistent error response format
// - Zod for validation
// - Supabase client patterns
```

---

## ⚠️ **COMMON PITFALLS TO AVOID**

1. **Editing without understanding** the full context
2. **Breaking existing patterns** without justification
3. **Ignoring dependencies** and causing cascading failures
4. **Underestimating impact** of seemingly small changes
5. **Not checking for similar implementations** already existing

---

## 🎯 **SUCCESS CRITERIA**

- ✅ Complete understanding before any edit
- ✅ Consistent with existing patterns
- ✅ No unexpected breaking changes
- ✅ Proper impact assessment documented
- ✅ Dependencies clearly understood
