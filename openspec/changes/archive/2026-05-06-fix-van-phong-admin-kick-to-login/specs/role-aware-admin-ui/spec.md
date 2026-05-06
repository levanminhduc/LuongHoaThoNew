## ADDED Requirements

### Requirement: Sidebar filters navigation items by authenticated role
The admin sidebar SHALL read the current user's role from `localStorage.getItem("user_info")` on mount and render only the navigation items whose `allowedRoles` array includes that role. Items without an `allowedRoles` field SHALL be treated as admin-only. If `user_info` is absent or unparseable, the sidebar SHALL fall back to showing only admin-only items.

#### Scenario: van_phong user sees only employee-management link
- **WHEN** a user with role `van_phong` loads any `/admin/*` page
- **THEN** the sidebar SHALL display only the "Quản Lý Nhân Viên" navigation item and SHALL NOT display Dashboard, Settings, or any other admin-only items

#### Scenario: admin user sees full sidebar unchanged
- **WHEN** a user with role `admin` loads any `/admin/*` page
- **THEN** the sidebar SHALL display all navigation items exactly as before this change

#### Scenario: localStorage missing or malformed
- **WHEN** `localStorage.getItem("user_info")` returns null or invalid JSON
- **THEN** the sidebar SHALL render as admin-only (no `van_phong`-visible items shown) and SHALL NOT throw an uncaught exception

### Requirement: Admin header breadcrumb href is role-dependent
The "Admin" breadcrumb link in `admin-header.tsx` SHALL resolve to `/admin/dashboard` for `admin` role and to `/admin/employee-management` for `van_phong` role. The role SHALL be read from the same `localStorage.getItem("user_info")` source.

#### Scenario: admin breadcrumb navigates to dashboard
- **WHEN** a user with role `admin` clicks the "Admin" breadcrumb
- **THEN** the browser SHALL navigate to `/admin/dashboard`

#### Scenario: van_phong breadcrumb navigates to employee-management
- **WHEN** a user with role `van_phong` clicks the "Admin" breadcrumb
- **THEN** the browser SHALL navigate to `/admin/employee-management`

### Requirement: Admin header dropdown hides Dashboard item for van_phong
The header dropdown menu SHALL NOT render the "Dashboard" item when the current user's role is `van_phong`. The "Cài đặt" and "Đăng Xuất" items SHALL remain visible for all roles.

#### Scenario: van_phong dropdown excludes Dashboard
- **WHEN** a user with role `van_phong` opens the header user dropdown
- **THEN** the dropdown SHALL NOT contain a "Dashboard" menu item
- **THEN** the dropdown SHALL contain "Cài đặt" and "Đăng Xuất"

#### Scenario: admin dropdown is unchanged
- **WHEN** a user with role `admin` opens the header user dropdown
- **THEN** the dropdown SHALL contain "Dashboard", "Cài đặt", and "Đăng Xuất"

### Requirement: Dashboard page redirects van_phong to employee-management
When a user with role `van_phong` lands on `/admin/dashboard` (e.g. by direct URL entry), the page SHALL immediately redirect to `/admin/employee-management` and SHALL NOT redirect to `/admin/login`.

#### Scenario: van_phong direct navigation to dashboard
- **WHEN** a user with role `van_phong` navigates directly to `/admin/dashboard`
- **THEN** the page SHALL redirect to `/admin/employee-management`
- **THEN** the page SHALL NOT redirect to `/admin/login`

#### Scenario: unknown role still redirects to login
- **WHEN** a user with an unrecognised role lands on `/admin/dashboard`
- **THEN** the page SHALL redirect to `/admin/login` (default branch preserved)
