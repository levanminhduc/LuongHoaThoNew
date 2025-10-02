---
type: "manual"
description: "Example description"
---

# 🛡️ **RULE SET 3: BẢO VỆ CÁC FILE CẤU HÌNH QUAN TRỌNG**

## 📋 **OVERVIEW**

Rule Set này bảo vệ các file cấu hình quan trọng khỏi việc chỉnh sửa trực tiếp có thể gây ra lỗi hệ thống.

---

## 🚫 **RULE 3.1: CRITICAL FILES - NEVER EDIT DIRECTLY**

### **FORBIDDEN FILES:**

```
🚫 ENVIRONMENT FILES:
├── .env
├── .env.local
├── .env.example
├── .env.production
└── .env.development

🚫 PACKAGE MANAGEMENT:
├── package.json
├── package-lock.json
├── pnpm-lock.yaml
├── yarn.lock
└── node_modules/

🚫 BUILD CONFIGURATION:
├── tsconfig.json (unless explicitly requested)
├── next.config.js/mjs
├── tailwind.config.ts/js
├── postcss.config.js
├── webpack.config.js
└── vite.config.ts

🚫 DEPLOYMENT CONFIG:
├── vercel.json
├── netlify.toml
├── docker-compose.yml
├── Dockerfile
└── .github/workflows/

🚫 IDE/EDITOR CONFIG:
├── .vscode/settings.json
├── .editorconfig
└── .gitignore (be very careful)
```

### **Why these files are protected:**

- **Environment files**: Contain sensitive data, wrong format can break app
- **Package files**: Auto-generated, manual edits cause dependency conflicts
- **Build configs**: Complex settings, small errors break entire build
- **Deployment configs**: Platform-specific, errors break deployment

---

## 🔄 **RULE 3.2: ALTERNATIVE APPROACHES**

### **For Package Management:**

```
❌ NEVER: Edit package.json directly
✅ INSTEAD: Use package manager commands

Examples:
- "Chạy: npm install [package-name]"
- "Chạy: npm install [package-name]@[version]"
- "Chạy: npm uninstall [package-name]"
- "Chạy: npm update [package-name]"
- "Chạy: npm install --save-dev [package-name]"
```

### **For Environment Variables:**

```
❌ NEVER: Edit .env files directly
✅ INSTEAD: Guide manual setup

Template:
"Để thêm environment variable:
1. Mở file .env.local
2. Thêm dòng: VARIABLE_NAME=value
3. Restart development server
4. Verify trong code: process.env.VARIABLE_NAME"
```

### **For TypeScript Config:**

```
❌ USUALLY AVOID: Editing tsconfig.json
✅ INSTEAD: Explain implications first

Template:
"Thay đổi TypeScript config có thể ảnh hưởng:
- Build process
- Type checking
- IDE support
- Import resolution

Bạn có chắc chắn muốn thay đổi [specific setting]?"
```

### **For Build Configuration:**

```
❌ AVOID: Direct config file edits
✅ INSTEAD: Provide guided instructions

Template:
"Để cấu hình [feature]:
1. Backup current config file
2. Add these specific lines: [code]
3. Test build: npm run build
4. If errors, restore backup"
```

---

## ⚠️ **RULE 3.3: WARNING TEMPLATES**

### **Standard Warning Template:**

```
⚠️ "Tôi không thể chỉnh sửa trực tiếp file [filename] vì:
   - [Lý do cụ thể 1]
   - [Lý do cụ thể 2]

   Thay vào đó, bạn cần:
   1. [Bước thực hiện 1]
   2. [Bước thực hiện 2]
   3. [Bước verification]

   Tôi có thể hướng dẫn chi tiết từng bước nếu cần."
```

### **Package.json Warning:**

```
⚠️ "Tôi không thể chỉnh sửa trực tiếp package.json vì:
   - Có thể gây conflict với lock files
   - Risk breaking dependency resolution
   - Package manager sẽ overwrite changes

   Thay vào đó, hãy chạy:
   npm install [package-name]

   Điều này sẽ:
   ✅ Cập nhật package.json correctly
   ✅ Update lock files
   ✅ Install dependencies properly"
```

### **Environment File Warning:**

```
⚠️ "Tôi không thể chỉnh sửa file .env vì:
   - Chứa sensitive information
   - Risk exposing secrets
   - Format errors có thể break app

   Thay vào đó:
   1. Mở .env.local manually
   2. Thêm: VARIABLE_NAME=your_value
   3. Restart dev server: npm run dev
   4. Verify: console.log(process.env.VARIABLE_NAME)"
```

---

## 🚨 **RULE 3.4: EMERGENCY PROTOCOLS**

### **When user insists on editing critical files:**

#### **Step 1: Strong Warning**

```
🚨 "CẢNH BÁO: Chỉnh sửa [filename] có thể:
   - Break toàn bộ application
   - Cause deployment failures
   - Require complete project reset
   - Loss of work progress

   Risk level: CRITICAL

   Bạn có chắc chắn muốn tiếp tục?"
```

#### **Step 2: Backup Instructions**

```
📋 "Nếu bạn quyết định tiếp tục:

   BACKUP FIRST:
   1. Copy file hiện tại: cp [filename] [filename].backup
   2. Commit current state: git add . && git commit -m "backup before config change"
   3. Note current working state

   THEN proceed with extreme caution"
```

#### **Step 3: Guided Process**

```
🔧 "Tôi sẽ hướng dẫn từng bước thay vì edit trực tiếp:

   Step 1: [Specific instruction]
   Step 2: [Specific instruction]
   Step 3: [Verification step]

   Sau mỗi step, hãy confirm kết quả trước khi tiếp tục."
```

#### **Step 4: Recovery Plan**

```
🔄 "Recovery plan nếu có lỗi:

   Quick fix:
   1. Restore backup: cp [filename].backup [filename]
   2. Restart services

   Git recovery:
   1. git checkout HEAD~1 [filename]
   2. npm install (if package files)

   Nuclear option:
   1. git reset --hard HEAD~1
   2. npm install
   3. npm run dev"
```

---

## 📝 **PRACTICAL EXAMPLES**

### **Example 1: User wants to add dependency**

**User:** "Thêm lodash vào package.json"
**Response:**

```
⚠️ "Tôi không thể chỉnh sửa trực tiếp package.json vì có thể gây conflict với lock files.

Thay vào đó, hãy chạy:
npm install lodash

Điều này sẽ:
✅ Thêm lodash vào dependencies
✅ Cập nhật package-lock.json
✅ Install package correctly

Sau đó bạn có thể import: import _ from 'lodash'"
```

### **Example 2: User wants to change environment variable**

**User:** "Sửa SUPABASE_URL trong .env"
**Response:**

```
⚠️ "Tôi không thể chỉnh sửa file .env vì chứa sensitive data.

Để thay đổi SUPABASE_URL:
1. Mở file .env.local
2. Tìm dòng: NEXT_PUBLIC_SUPABASE_URL=...
3. Thay đổi value: NEXT_PUBLIC_SUPABASE_URL=your_new_url
4. Save file
5. Restart dev server: npm run dev

Lưu ý: Đảm bảo URL format đúng và có quyền truy cập."
```

---

## ⚠️ **COMMON PITFALLS TO AVOID**

1. **Editing package.json** without using package manager
2. **Modifying lock files** manually
3. **Changing build configs** without understanding implications
4. **Exposing secrets** in environment files
5. **Breaking deployment configs** with syntax errors

---

## 🎯 **SUCCESS CRITERIA**

- ✅ Zero direct edits to protected files
- ✅ All changes made through proper channels
- ✅ Users understand why files are protected
- ✅ Backup procedures followed when necessary
- ✅ Recovery plans provided for risky operations
