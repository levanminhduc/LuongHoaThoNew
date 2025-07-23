-- STEP 2: CREATE PAYROLLS TABLE (39 COLUMNS)
-- Bảng dữ liệu lương với 39 cột từ Excel + metadata ký tên
CREATE TABLE payrolls (
  -- ===== METADATA =====
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,            -- FK to employees.employee_id
  salary_month VARCHAR(20) NOT NULL,           -- "2024-07" format
  source_file VARCHAR(255),                    -- File Excel gốc
  import_batch_id VARCHAR(100),                -- Batch tracking
  import_status VARCHAR(20) DEFAULT 'imported', -- 'imported', 'signed'
  
  -- ===== KÝ TÊN TỰ ĐỘNG =====
  is_signed BOOLEAN DEFAULT false,             -- Đã ký chưa
  signed_at TIMESTAMP NULL,                    -- Thời gian ký (real-time)
  signed_by_name VARCHAR(255) NULL,            -- Tên người ký (auto từ employees.full_name)
  signature_ip VARCHAR(45) NULL,               -- IP lúc ký
  signature_device TEXT NULL,                  -- Device info
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- ===== 39 CỘT DỮ LIỆU TĨNH TỪ EXCEL =====
  
  -- Hệ số và thông số cơ bản (Cột 3-6)
  he_so_lam_viec DECIMAL(5,2) DEFAULT 0,
  he_so_phu_cap_ket_qua DECIMAL(5,2) DEFAULT 0,
  he_so_luong_co_ban DECIMAL(5,2) DEFAULT 0,
  luong_toi_thieu_cty DECIMAL(15,2) DEFAULT 0,
  
  -- Thời gian làm việc (Cột 7-11)
  ngay_cong_trong_gio DECIMAL(5,2) DEFAULT 0,
  gio_cong_tang_ca DECIMAL(5,2) DEFAULT 0,
  gio_an_ca DECIMAL(5,2) DEFAULT 0,
  tong_gio_lam_viec DECIMAL(5,2) DEFAULT 0,
  tong_he_so_quy_doi DECIMAL(8,2) DEFAULT 0,
  
  -- Lương sản phẩm và đơn giá (Cột 12-16)
  tong_luong_san_pham_cong_doan DECIMAL(15,2) DEFAULT 0,
  don_gia_tien_luong_tren_gio DECIMAL(15,2) DEFAULT 0,
  tien_luong_san_pham_trong_gio DECIMAL(15,2) DEFAULT 0,
  tien_luong_tang_ca DECIMAL(15,2) DEFAULT 0,
  tien_luong_30p_an_ca DECIMAL(15,2) DEFAULT 0,
  
  -- Thưởng và phụ cấp (Cột 17-21)
  tien_khen_thuong_chuyen_can DECIMAL(15,2) DEFAULT 0,
  luong_hoc_viec_pc_luong DECIMAL(15,2) DEFAULT 0,
  tong_cong_tien_luong_san_pham DECIMAL(15,2) DEFAULT 0,
  ho_tro_thoi_tiet_nong DECIMAL(15,2) DEFAULT 0,
  bo_sung_luong DECIMAL(15,2) DEFAULT 0,
  
  -- Bảo hiểm và phúc lợi (Cột 22-26)
  bhxh_21_5_percent DECIMAL(15,2) DEFAULT 0,
  pc_cdcs_pccc_atvsv DECIMAL(15,2) DEFAULT 0,
  luong_phu_nu_hanh_kinh DECIMAL(15,2) DEFAULT 0,
  tien_con_bu_thai_7_thang DECIMAL(15,2) DEFAULT 0,
  ho_tro_gui_con_nha_tre DECIMAL(15,2) DEFAULT 0,
  
  -- Phép và lễ (Cột 27-28)
  ngay_cong_phep_le DECIMAL(5,2) DEFAULT 0,
  tien_phep_le DECIMAL(15,2) DEFAULT 0,
  
  -- Tổng lương và phụ cấp khác (Cột 29-31)
  tong_cong_tien_luong DECIMAL(15,2) DEFAULT 0,
  tien_boc_vac DECIMAL(15,2) DEFAULT 0,
  ho_tro_xang_xe DECIMAL(15,2) DEFAULT 0,
  
  -- Thuế và khấu trừ (Cột 32-36)
  thue_tncn_nam_2024 DECIMAL(15,2) DEFAULT 0,
  tam_ung DECIMAL(15,2) DEFAULT 0,
  thue_tncn DECIMAL(15,2) DEFAULT 0,
  bhxh_bhtn_bhyt_total DECIMAL(15,2) DEFAULT 0,
  truy_thu_the_bhyt DECIMAL(15,2) DEFAULT 0,
  
  -- Lương thực nhận (Cột 37)
  tien_luong_thuc_nhan_cuoi_ky DECIMAL(15,2) DEFAULT 0,    -- FINAL AMOUNT
  
  -- Constraints
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  UNIQUE(employee_id, salary_month)                         -- 1 record/employee/month
);

-- Comments cho documentation
COMMENT ON TABLE payrolls IS 'Bảng dữ liệu lương 39 cột từ Excel + metadata ký tên tự động';
COMMENT ON COLUMN payrolls.salary_month IS 'Tháng lương format YYYY-MM (VD: 2024-07)';
COMMENT ON COLUMN payrolls.is_signed IS 'Trạng thái ký nhận: false=chưa ký, true=đã ký';
COMMENT ON COLUMN payrolls.signed_by_name IS 'Tên người ký - tự động lấy từ employees.full_name';
COMMENT ON COLUMN payrolls.signed_at IS 'Thời gian ký - real-time khi user click ký nhận';
COMMENT ON COLUMN payrolls.tien_luong_thuc_nhan_cuoi_ky IS 'Lương thực nhận cuối kỳ - số tiền final';
