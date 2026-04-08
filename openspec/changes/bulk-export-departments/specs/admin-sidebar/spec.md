## ADDED Requirements

### Requirement: Bulk export navigation item in sidebar

The admin sidebar SHALL include a navigation item "Xuất Lương Toàn Bộ" linking to `/admin/bulk-export` under the data management section.

#### Scenario: Sidebar renders bulk export link

- **WHEN** admin views the sidebar
- **THEN** a nav item with label "Xuất Lương Toàn Bộ" and an appropriate icon appears in the data management group

#### Scenario: Active state on bulk export page

- **WHEN** current route is `/admin/bulk-export`
- **THEN** the "Xuất Lương Toàn Bộ" nav item renders in its active/highlighted state
